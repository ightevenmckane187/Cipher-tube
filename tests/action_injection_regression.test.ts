
import { executeWorkflow } from '../src/engine/runtime/orchestrator';

describe('Action Injection Regression', () => {
    const ctx: any = {
        actions: {
            security: {
                posture_update: (params: any) => {
                    return { updated: true };
                }
            }
        },
        config: {}
    };

    it('should block access to prototype methods like hasOwnProperty', async () => {
        const workflowProto = {
            name: "Proto Injection",
            steps: [
                {
                    action: "security.hasOwnProperty",
                    params: { some: 'params' },
                    output: "result"
                }
            ]
        };

        const state = await executeWorkflow(workflowProto, ctx);
        expect(state.result).toBeNull();
    });

    it('should block access to inherited properties like toString', async () => {
        const workflowToString = {
            name: "ToString Injection",
            steps: [
                {
                    action: "security.toString",
                    params: {},
                    output: "result"
                }
            ]
        };

        const stateToString = await executeWorkflow(workflowToString, ctx);
        expect(stateToString.result).toBeNull();
    });

    it('should block invalid action format (no namespace)', async () => {
        const workflowNoNs = {
            name: "No NS Injection",
            steps: [
                {
                    action: "posture_update",
                    params: {},
                    output: "result"
                }
            ]
        };
        const stateNoNs = await executeWorkflow(workflowNoNs, ctx);
        expect(stateNoNs.result).toBeNull();
    });

    it('should block invalid action format (too many segments)', async () => {
        const workflowTooMany = {
            name: "Too Many Segments",
            steps: [
                {
                    action: "security.posture.update",
                    params: {},
                    output: "result"
                }
            ]
        };
        const stateTooMany = await executeWorkflow(workflowTooMany, ctx);
        expect(stateTooMany.result).toBeNull();
    });

    it('should block namespace-level injection via constructor', async () => {
        const workflowConstructor = {
            name: "Constructor Injection",
            steps: [
                {
                    action: "constructor.assign",
                    params: {},
                    output: "result"
                }
            ]
        };
        const state = await executeWorkflow(workflowConstructor, ctx);
        expect(state.result).toBeNull();
    });

    it('should block namespace-level injection via __proto__', async () => {
        const workflowProto = {
            name: "Proto Namespace Injection",
            steps: [
                {
                    action: "__proto__.toString",
                    params: {},
                    output: "result"
                }
            ]
        };
        const state = await executeWorkflow(workflowProto, ctx);
        expect(state.result).toBeNull();
    });

    it('should allow valid registered actions', async () => {
        const workflowValid = {
            name: "Valid Action",
            steps: [
                {
                    action: "security.posture_update",
                    params: { category: 'network' },
                    output: "result"
                }
            ]
        };
        const stateValid = await executeWorkflow(workflowValid, ctx);
        expect(stateValid.result).toEqual({ updated: true });
    });
});
