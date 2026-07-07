
export class SceneNode {
    id: string;
    children: SceneNode[] = [];
    transform: any = { x: 0, y: 0, z: 0 };
    parent: SceneNode | null = null;

    constructor(id: string) {
        this.id = id;
    }

    add(node: SceneNode) {
        node.parent = this;
        this.children.push(node);
    }

    getGlobalTransform(): any {
        if (!this.parent) return this.transform;
        const parentTransform = this.parent.getGlobalTransform();
        return {
            x: this.transform.x + parentTransform.x,
            y: this.transform.y + parentTransform.y,
            z: this.transform.z + parentTransform.z,
        };
    }
}

export class SceneGraph {
    root: SceneNode = new SceneNode('root');

    findNode(id: string, current: SceneNode = this.root): SceneNode | null {
        if (current.id === id) return current;
        for (const child of current.children) {
            const found = this.findNode(id, child);
            if (found) return found;
        }
        return null;
    }
}
