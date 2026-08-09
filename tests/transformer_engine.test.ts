import {
    ScriptEngine,
    OpCode,
    SystemForm,
    NotificationDispatcher,
    CipherTubeTransformer,
    NotificationEvent
} from '../src/os/runtime/TransformerEngine';

describe('Satoshi Legacy Script Interpreter (ScriptEngine)', () => {
    let engine: ScriptEngine;

    beforeEach(() => {
        engine = new ScriptEngine();
    });

    it('should correctly push and pop Buffers from the stack', () => {
        const payload = Buffer.from('test-data');
        engine.push(payload);
        expect(engine.getStack().length).toBe(1);

        const popped = engine.pop();
        expect(popped.equals(payload)).toBe(true);
        expect(engine.getStack().length).toBe(0);
    });

    it('should throw error on stack underflow or invalid push types', () => {
        expect(() => engine.pop()).toThrow('ScriptEngine Pop error: Stack underflow.');
        expect(() => engine.push('not-a-buffer' as any)).toThrow('Input must be a Buffer.');
    });

    it('should execute OP_DUP correctly', () => {
        const payload = Buffer.from('dup-me');
        engine.push(payload);

        const success = engine.executeOp(OpCode.OP_DUP);
        expect(success).toBe(true);
        expect(engine.getStack().length).toBe(2);
        expect(engine.pop().equals(payload)).toBe(true);
        expect(engine.pop().equals(payload)).toBe(true);
    });

    it('should execute OP_HASH160 correctly', () => {
        const payload = Buffer.from('hash-me');
        engine.push(payload);

        const success = engine.executeOp(OpCode.OP_HASH160);
        expect(success).toBe(true);
        const stack = engine.getStack();
        expect(stack.length).toBe(1);
        expect(stack[0].length).toBe(20); // hash160 should be 20 bytes
    });

    it('should execute OP_EQUALVERIFY correctly', () => {
        engine.push(Buffer.from('match'));
        engine.push(Buffer.from('match'));

        const success = engine.executeOp(OpCode.OP_EQUALVERIFY);
        expect(success).toBe(true);
        expect(engine.getStack().length).toBe(0);

        // Mismatch test
        engine.push(Buffer.from('match'));
        engine.push(Buffer.from('mismatch'));
        const failSuccess = engine.executeOp(OpCode.OP_EQUALVERIFY);
        expect(failSuccess).toBe(false);
    });

    it('should execute OP_CHECKSIG correctly', () => {
        const pubKey = Buffer.from('public-key-data');
        const signature = Buffer.from('signature-data');

        engine.push(signature);
        engine.push(pubKey);

        const success = engine.executeOp(OpCode.OP_CHECKSIG);
        expect(success).toBe(true);
        const stack = engine.getStack();
        expect(stack.length).toBe(1);
        expect(stack[0].equals(Buffer.from([0x01]))).toBe(true);
    });
});

describe('Notification & Status Dispatcher', () => {
    it('should broadcast and trigger registered listeners', () => {
        const dispatcher = new NotificationDispatcher();
        const receivedEvents: NotificationEvent[] = [];

        dispatcher.registerListener((event) => {
            receivedEvents.push(event);
        });

        dispatcher.broadcast('TEST_ALERT', 'Integrity check warning.', 'WARNING', { id: 123 });

        expect(receivedEvents.length).toBe(1);
        expect(receivedEvents[0].type).toBe('TEST_ALERT');
        expect(receivedEvents[0].message).toBe('Integrity check warning.');
        expect(receivedEvents[0].severity).toBe('WARNING');
        expect(receivedEvents[0].metadata).toEqual({ id: 123 });
    });
});

describe('CipherTubeTransformer & Dynamic Loop Engine', () => {
    let dispatcher: NotificationDispatcher;
    let transformer: CipherTubeTransformer;
    let script: ScriptEngine;

    beforeEach(() => {
        dispatcher = new NotificationDispatcher();
        transformer = new CipherTubeTransformer(dispatcher);
        script = new ScriptEngine();
    });

    it('should initialize with correct default form and transformation count', () => {
        expect(transformer.getCurrentForm()).toBe(SystemForm.FORM_ALPHA_SCRIPT);
        expect(transformer.getTransformationCount()).toBe(0);
    });

    it('should transform states and increment transformation count', () => {
        transformer.transform(SystemForm.FORM_BETA_VAULT);
        expect(transformer.getCurrentForm()).toBe(SystemForm.FORM_BETA_VAULT);
        expect(transformer.getTransformationCount()).toBe(1);

        transformer.transform(SystemForm.FORM_OMEGA_INFINITY);
        expect(transformer.getCurrentForm()).toBe(SystemForm.FORM_OMEGA_INFINITY);
        expect(transformer.getTransformationCount()).toBe(2);
    });

    it('should run execution loop cycle successfully across 3 states', () => {
        const events: NotificationEvent[] = [];
        dispatcher.registerListener((event) => {
            events.push(event);
        });

        const success = transformer.executeInfinityLoopCycle(script, 500);
        expect(success).toBe(true);

        // Verification of states visited
        expect(transformer.getCurrentForm()).toBe(SystemForm.FORM_OMEGA_INFINITY);

        // We should have transformation count incremented by 3 (Alpha -> Beta -> Omega)
        expect(transformer.getTransformationCount()).toBe(3);

        // Events should contain session start, state transitions, and complete
        const eventTypes = events.map(e => e.type);
        expect(eventTypes).toContain('SESSION_START');
        expect(eventTypes).toContain('TRANSFORMATION');
        expect(eventTypes).toContain('VAULT_LOG');
        expect(eventTypes).toContain('SESSION_COMPLETE');
    });

    it('should abort loop and trigger critical alert on bounds overflow', () => {
        const events: NotificationEvent[] = [];
        dispatcher.registerListener((event) => {
            events.push(event);
        });

        const hugePayload = 101 * 1024 * 1024 * 1024; // 101 GB (exceeds 100 GB cap limit)
        const success = transformer.executeInfinityLoopCycle(script, hugePayload);

        expect(success).toBe(false);
        const criticalEvent = events.find(e => e.severity === 'CRITICAL');
        expect(criticalEvent).toBeDefined();
        expect(criticalEvent?.type).toBe('SECURITY_ALERT');
        expect(criticalEvent?.message).toContain('Arithmetic Security Violation');
    });
});
