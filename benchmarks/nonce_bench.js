"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const N = 100000;
function benchNonceOld() {
    console.time('randomBytes(16).toString("base64")');
    for (let i = 0; i < N; i++) {
        const nonce = crypto_1.default.randomBytes(16).toString('base64');
    }
    console.timeEnd('randomBytes(16).toString("base64")');
}
function benchNonceNew() {
    console.time('randomUUID()');
    for (let i = 0; i < N; i++) {
        const nonce = crypto_1.default.randomUUID();
    }
    console.timeEnd('randomUUID()');
}
function benchWithConcatOld() {
    console.time('randomBytes + concat');
    for (let i = 0; i < N; i++) {
        const nonce = crypto_1.default.randomBytes(16).toString('base64');
        const cspNonce = `'nonce-${nonce}'`;
        const s1 = cspNonce;
        const s2 = cspNonce;
    }
    console.timeEnd('randomBytes + concat');
}
function benchWithConcatNew() {
    console.time('randomUUID + pre-concat');
    for (let i = 0; i < N; i++) {
        const nonce = crypto_1.default.randomUUID();
        const cspNonce = `'nonce-${nonce}'`;
        const s1 = cspNonce;
        const s2 = cspNonce;
    }
    console.timeEnd('randomUUID + pre-concat');
}
console.log(`Running benchmark with ${N} iterations...`);
benchNonceOld();
benchNonceNew();
benchWithConcatOld();
benchWithConcatNew();
//# sourceMappingURL=nonce_bench.js.map