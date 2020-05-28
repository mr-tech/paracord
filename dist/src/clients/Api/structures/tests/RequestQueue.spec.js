"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const assert = require('assert');
const sinon = require('sinon');
const RequestQueue = require('../RequestQueue');
describe('RequestQueue', () => __awaiter(void 0, void 0, void 0, function* () {
    let q;
    let clock;
    beforeEach(() => {
        q = new RequestQueue();
        clock = sinon.useFakeTimers();
    });
    afterEach(() => {
        clock.restore();
    });
    describe('initial state', () => {
        it('none => length is 0', () => {
            assert.deepStrictEqual(q.queue, []);
            assert.strictEqual(q.length, 0);
        });
    });
    describe('push', () => {
        it('1 parameter => item in queue and length is 1', () => {
            q.push(1);
            assert.deepStrictEqual(q.queue, [1]);
            assert.strictEqual(q.length, 1);
        });
        it('3 parameters => items in queue and length is 3', () => {
            q.push(1, '2', {});
            assert.deepStrictEqual(q.queue, [1, '2', {}]);
            assert.strictEqual(q.length, 3);
        });
        it('4 parameters with array => items in queue and length is 4', () => {
            q.push(1, '2', {}, []);
            q.spliceMany([]);
            assert.deepStrictEqual(q.queue, [1, '2', {}, []]);
            assert.strictEqual(q.length, 4);
        });
    });
    describe('spliceMany', () => {
        it('first index => queue with second index and null and length of 1', () => {
            q.push(1, '2');
            q.spliceMany([0]);
            assert.deepStrictEqual(q.queue, ['2', null]);
            assert.strictEqual(q.length, 1);
        });
        it('index out of bounds => queue unchanged', () => {
            q.push(1, '2');
            q.spliceMany([2]);
            assert.deepStrictEqual(q.queue, [1, '2']);
            assert.strictEqual(q.length, 2);
        });
        it('mulitple indices => queue only nulls and length 0', () => {
            q.push(1, '2');
            assert.strictEqual(q.length, 2);
            q.spliceMany([0, 1]);
            assert.deepStrictEqual(q.queue, [null, null]);
            assert.strictEqual(q.length, 0);
        });
        it('push with null and spliceMany => length 1', () => {
            q.push(1, null);
            assert.strictEqual(q.length, 2);
            q.spliceMany([1]);
            assert.deepStrictEqual(q.queue, [1, null]);
            assert.strictEqual(q.length, 1);
        });
    });
    describe('process', () => { });
}));
