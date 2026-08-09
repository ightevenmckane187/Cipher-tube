import { NodePosition, CartesianPoint } from './NodePosition';

export class ConstellationLayout {
  private nodePositions: Map<string, NodePosition> = new Map();

  layoutNodes(nodes: string[]) {
    const radius = 200;
    nodes.forEach((id, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      this.nodePositions.set(id, new NodePosition(id, { x, y, z: 0 }));
    });
  }

  getPosition(id: string): CartesianPoint | undefined {
    return this.nodePositions.get(id)?.coordinates;
  }
}
