import { CartesianPoint } from '../../os/spatial/NodePosition';
import { SovereignNodeSpecies } from '../../os/taxonomy/NodeTaxonomy';

export class NodeRenderer {
  renderToCanvas(ctx: CanvasRenderingContext2D, id: string, pos: CartesianPoint, species: SovereignNodeSpecies) {
    // Canvas Bridge for the Holland Hybrid Core
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 10, 0, 2 * Math.PI);

    switch (species) {
      case SovereignNodeSpecies.ARCHETYPE:
        ctx.fillStyle = 'gold';
        break;
      case SovereignNodeSpecies.TOOLBOX:
        ctx.fillStyle = 'blue';
        break;
      case SovereignNodeSpecies.RITUAL:
        ctx.fillStyle = 'purple';
        break;
      case SovereignNodeSpecies.DIAGNOSTIC:
        ctx.fillStyle = 'red';
        break;
    }

    ctx.fill();
    ctx.fillText(id, pos.x + 12, pos.y + 4);
    console.log(`Rendered ${id} (${species}) at (${pos.x}, ${pos.y})`);
  }
}
