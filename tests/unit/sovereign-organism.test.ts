import { describe, it, expect } from "vitest";
import {
  NodeStateMachine,
  NodeState,
} from "../../src/os/state/NodeStateMachine";
import { SovereignNodeSpecies } from "../../src/os/taxonomy/NodeTaxonomy";
import { CommandBridge } from "../../src/os/bridge/CommandBridge";
import { ConstellationLayout } from "../../src/os/spatial/ConstellationLayout";

describe("Sovereign Organism (Holland Core)", () => {
  it("should manage node states", () => {
    const sm = new NodeStateMachine();
    sm.registerNode("test-node", SovereignNodeSpecies.ARCHETYPE);
    expect(sm.getState("test-node")?.state).toBe(NodeState.IDLE);

    sm.transition("test-node", NodeState.ACTIVE);
    expect(sm.getState("test-node")?.state).toBe(NodeState.ACTIVE);
  });

  it("should parse commands via CommandBridge", () => {
    const sm = new NodeStateMachine();
    sm.registerNode("sentinel-node", SovereignNodeSpecies.ARCHETYPE);
    const bridge = new CommandBridge(sm);

    const result = bridge.parseAndExecute("Activate sentinel-node");
    expect(result).toContain("Activating sentinel-node");
    expect(sm.getState("sentinel-node")?.state).toBe(NodeState.ACTIVE);
  });

  it("should layout nodes in a constellation", () => {
    const layout = new ConstellationLayout();
    layout.layoutNodes(["node1", "node2"]);
    const pos1 = layout.getPosition("node1");
    const pos2 = layout.getPosition("node2");

    expect(pos1).toBeDefined();
    expect(pos2).toBeDefined();
    expect(pos1?.x).not.toBe(pos2?.x);
  });
});
