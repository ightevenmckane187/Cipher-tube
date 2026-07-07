
import { SceneGraph, SceneNode } from './SceneGraph';

export class SpatialSceneBrowser {
    private sceneGraph: SceneGraph;

    constructor(sceneGraph: SceneGraph) {
        this.sceneGraph = sceneGraph;
    }

    browse(nodeId: string) {
        const node = this.sceneGraph.findNode(nodeId);
        if (!node) throw new Error('Node not found');
        return node.children.map(c => c.id);
    }

    loadWorld(worldData: any) {
        console.log("Loading world into SceneGraph", worldData);
        // Logic to reconstruct SceneGraph from worldData
    }
}
