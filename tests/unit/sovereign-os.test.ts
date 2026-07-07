
import { describe, it, expect, vi } from 'vitest';
import { OpcodeDispatcher, Opcode } from '../../src/os/runtime/OpcodeDispatcher';
import { FusionBuffer } from '../../src/os/runtime/FusionBuffer';
import { PersistenceLayer } from '../../src/os/persistence/PersistenceLayer';
import { SceneGraph, SceneNode } from '../../src/os/scene/SceneGraph';
import * as fs from 'fs';

// Mock crypto/verifier
vi.mock('../../src/crypto/verifier', () => ({
    verifyCryptographicProof: vi.fn().mockResolvedValue(true)
}));

describe('Sovereign OS Core v1.0', () => {
    describe('OpcodeDispatcher', () => {
        it('should handle FUSION opcode', async () => {
            const dispatcher = new OpcodeDispatcher();
            const result = await dispatcher.dispatch(Opcode.FUSION, { data: 'test' });
            expect(result.status).toBe('fused');
        });

        it('should handle COMMIT opcode', async () => {
            const dispatcher = new OpcodeDispatcher();
            const result = await dispatcher.dispatch(Opcode.COMMIT, { data: 'test' });
            expect(result.status).toBe('committed');
        });

        it('should validate proof if provided', async () => {
            const dispatcher = new OpcodeDispatcher();
            const result = await dispatcher.dispatch(Opcode.COMMIT, { data: 'test' }, { signature: 'sig', hash: 'hash' });
            expect(result.status).toBe('committed');
        });
    });

    describe('FusionBuffer', () => {
        it('should buffer and sync events', () => {
            const buffer = new FusionBuffer();
            buffer.push({ type: 'voice', value: 'hello' });
            buffer.push({ type: 'gesture', value: 'palm-up' });
            const batch = buffer.getSynchronizedBatch();
            expect(batch.length).toBe(2);
        });
    });

    describe('PersistenceLayer & Disk Consistency', () => {
        it('should save and verify integrity (testSaveAndVerify)', () => {
            const persistence = new PersistenceLayer();
            const data = { state: 'sovereign' };
            const key = 'secret-key';
            const buffer = persistence.save(data, key);

            const loaded = persistence.verifyAndLoad(buffer, key);
            expect(loaded.state).toBe('sovereign');
        });

        it('should confirm state recovery from disk (testWorldLoad)', () => {
            const persistence = new PersistenceLayer();
            const data = { world: 'alpha' };
            const key = 'secret-key';
            const buffer = persistence.save(data, key);
            fs.writeFileSync('test_world.ctube', buffer);

            const diskBuffer = fs.readFileSync('test_world.ctube');
            const loaded = persistence.verifyAndLoad(diskBuffer, key);
            expect(loaded.world).toBe('alpha');
            fs.unlinkSync('test_world.ctube');
        });
    });

    describe('SceneGraph & Hierarchy', () => {
        it('should propagate transforms', () => {
            const graph = new SceneGraph();
            const child = new SceneNode('child');
            child.transform = { x: 10, y: 0, z: 0 };
            graph.root.add(child);

            const transform = child.getGlobalTransform();
            expect(transform.x).toBe(10);
        });

        it('should find nodes by ID (testHierarchyBrowse)', () => {
            const graph = new SceneGraph();
            const node = new SceneNode('target');
            graph.root.add(node);
            const found = graph.findNode('target');
            expect(found?.id).toBe('target');
        });
    });
});
