import { SovereignNodeSpecies } from "../taxonomy/NodeTaxonomy";

export enum NodeState {
  IDLE = "IDLE",
  ACTIVE = "ACTIVE",
  EVOLVING = "EVOLVING",
  DORMANT = "DORMANT",
}

export interface NodeStatus {
  id: string;
  state: NodeState;
  species: SovereignNodeSpecies;
  lastUpdate: number;
}

export class NodeStateMachine {
  private states: Map<string, NodeStatus> = new Map();

  registerNode(id: string, species: SovereignNodeSpecies) {
    this.states.set(id, {
      id,
      species,
      state: NodeState.IDLE,
      lastUpdate: Date.now(),
    });
  }

  transition(id: string, newState: NodeState) {
    const node = this.states.get(id);
    if (node) {
      node.state = newState;
      node.lastUpdate = Date.now();
      console.log(`Node ${id} transitioned to ${newState}`);
    }
  }

  getState(id: string): NodeStatus | undefined {
    return this.states.get(id);
  }
}
