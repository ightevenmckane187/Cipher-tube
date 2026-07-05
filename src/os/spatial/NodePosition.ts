export interface CartesianPoint {
  x: number;
  y: number;
  z: number;
}

export class NodePosition {
  constructor(
    public id: string,
    public coordinates: CartesianPoint,
  ) {}

  updatePosition(newCoords: CartesianPoint) {
    this.coordinates = newCoords;
  }
}
