import { NodeStateMachine, NodeState } from '../state/NodeStateMachine';

export class CommandBridge {
  constructor(private stateMachine: NodeStateMachine) {}

  parseAndExecute(command: string) {
    const parts = command.toLowerCase().split(' ');

    if (parts.includes('activate')) {
      const nodeId = parts.find(p => p.includes('node'));
      if (nodeId) {
        this.stateMachine.transition(nodeId, NodeState.ACTIVE);
        return `Voice-to-State: Activating ${nodeId}`;
      }
    }

    if (parts.includes('evolve')) {
      const nodeId = parts.find(p => p.includes('node'));
      if (nodeId) {
        this.stateMachine.transition(nodeId, NodeState.EVOLVING);
        return `Voice-to-State: Evolving ${nodeId}`;
      }
    }

    return "Sovereign Telemetry: Command not recognized.";
  }
}
