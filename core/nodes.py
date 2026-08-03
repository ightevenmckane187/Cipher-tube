import asyncio
import logging
from typing import Dict, Any, List, Optional, Callable, Coroutine
from enum import Enum

logger = logging.getLogger("cyphertube.core.nodes")

class NodeType(str, Enum):
    SENSORY = "SENSORY"
    VIEWABLE = "VIEWABLE"
    ACTIONABLE = "ACTIONABLE"


class Node:
    """
    Represents a sovereign modular node within the CypherTube platform.
    """
    def __init__(self, node_id: str, node_type: NodeType, metadata: Optional[Dict[str, Any]] = None):
        self.node_id: str = node_id
        self.node_type: NodeType = node_type
        self.status: str = "healthy"  # healthy, degraded, failed
        self.metadata: Dict[str, Any] = metadata or {}

    async def process(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes node processing on the provided payload.
        """
        raise NotImplementedError("Subclasses must implement process.")


class SensoryNode(Node):
    """
    Sensory Node: Handles data collection, environment perception, and input sanitization.
    """
    def __init__(self, node_id: str, metadata: Optional[Dict[str, Any]] = None):
        super().__init__(node_id, NodeType.SENSORY, metadata)

    async def process(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"SensoryNode {self.node_id} processing sensory payload")
        # Ensure 'raw_data' is present
        raw_data = payload.get("raw_data", "")
        # Standard sanitization/normalisation of sensor payload
        sanitized = str(raw_data).strip()
        return {
            "node_id": self.node_id,
            "status": self.status,
            "sensory_processed": True,
            "sanitized_data": sanitized,
            "original_payload": payload
        }


class ViewableNode(Node):
    """
    Viewable Node: Manages UI representation, scene graph, and spatial OS display states.
    """
    def __init__(self, node_id: str, metadata: Optional[Dict[str, Any]] = None):
        super().__init__(node_id, NodeType.VIEWABLE, metadata)

    async def process(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"ViewableNode {self.node_id} processing render payload")
        # Transform data into displayable state
        data_to_render = payload.get("sanitized_data", payload.get("raw_data", ""))
        return {
            "node_id": self.node_id,
            "status": self.status,
            "rendered": True,
            "render_coordinates": self.metadata.get("coordinates", [0, 0, 0]),
            "display_text": f"OS Node display: {data_to_render}"
        }


class ActionableNode(Node):
    """
    Actionable Node: Handles self-healing, command dispatch, and active state changes.
    """
    def __init__(self, node_id: str, execution_channel: Optional[Callable[[Dict[str, Any]], Coroutine[Any, Any, Any]]] = None, metadata: Optional[Dict[str, Any]] = None):
        super().__init__(node_id, NodeType.ACTIONABLE, metadata)
        self.execution_channel = execution_channel

    async def process(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"ActionableNode {self.node_id} triggering action payload")
        action_type = payload.get("action_type", "monitoring")

        result_status = "executed"
        if self.execution_channel:
            try:
                await self.execution_channel(payload)
            except Exception as e:
                logger.error(f"ActionableNode {self.node_id} failed execution channel: {e}")
                result_status = "failed_execution"

        return {
            "node_id": self.node_id,
            "status": self.status,
            "action_executed": action_type,
            "execution_status": result_status
        }


class UnifiedNodeManager:
    """
    Unified Node Manager: Coordinates sensory, viewable, and actionable nodes.
    Maintains asynchronous background execution channels for non-blocking self-healing.
    """
    def __init__(self):
        self.nodes: Dict[str, Node] = {}
        self.background_tasks: set = set()
        self.task_queue: asyncio.Queue = asyncio.Queue()
        self._loop_task: Optional[asyncio.Task] = None

    def register_node(self, node: Node) -> None:
        """Registers a modular node with the manager."""
        self.nodes[node.node_id] = node
        logger.info(f"Registered node {node.node_id} of type {node.node_type}")

    def deregister_node(self, node_id: str) -> Optional[Node]:
        """Removes and returns a node from the manager."""
        node = self.nodes.pop(node_id, None)
        if node:
            logger.info(f"Deregistered node {node_id}")
        return node

    def get_nodes_by_type(self, node_type: NodeType) -> List[Node]:
        """Returns registered nodes matching a specific NodeType."""
        return [n for n in self.nodes.values() if n.node_type == node_type]

    async def pipeline_execute(self, sensory_id: str, viewable_id: str, actionable_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs a structured, centralized pipeline: Sensory -> Viewable -> Actionable.
        """
        sensory_node = self.nodes.get(sensory_id)
        viewable_node = self.nodes.get(viewable_id)
        actionable_node = self.nodes.get(actionable_id)

        if not (sensory_node and viewable_node and actionable_node):
            raise ValueError("All node IDs in pipeline execution must be registered.")

        # Step 1: Sensory input parsing
        sensory_res = await sensory_node.process(payload)
        # Step 2: Viewable rendering preparation
        viewable_res = await viewable_node.process(sensory_res)
        # Step 3: Actionable trigger execution
        actionable_res = await actionable_node.process(sensory_res)

        return {
            "pipeline_status": "success",
            "sensory": sensory_res,
            "viewable": viewable_res,
            "actionable": actionable_res
        }

    def schedule_background_task(self, coro: Coroutine[Any, Any, Any]) -> None:
        """
        Schedules a non-blocking background task.
        Safeguarded against premature garbage collection by holding a reference.
        """
        task = asyncio.create_task(coro)
        self.background_tasks.add(task)
        task.add_done_callback(self.background_tasks.discard)

    async def start_queue_worker(self) -> None:
        """Starts the queue-based non-blocking background consumer."""
        if self._loop_task is not None:
            return
        self._loop_task = asyncio.create_task(self._process_queue_loop())

    async def _process_queue_loop(self) -> None:
        while True:
            try:
                task_coro = await self.task_queue.get()
                await task_coro
                self.task_queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error executing queued non-blocking background task: {e}")

    async def enqueue_task(self, coro: Coroutine[Any, Any, Any]) -> None:
        """Enqueues an asynchronous task to the background processing queue."""
        await self.task_queue.put(coro)

    async def stop_queue_worker(self) -> None:
        """Gracefully stops the background queue worker."""
        if self._loop_task:
            self._loop_task.cancel()
            try:
                await self._loop_task
            except asyncio.CancelledError:
                pass
            self._loop_task = None
