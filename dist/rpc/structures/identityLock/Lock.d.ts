/// <reference types="node" />
import type { EventEmitter } from 'events';
import StatusMessage from './StatusMessage';
export default class Lock {
    private token?;
    private lockTimeout?;
    private emitter?;
    constructor(emitter?: EventEmitter);
    acquire(timeOut: number, token?: string): StatusMessage;
    release(token: string): StatusMessage;
    private lock;
    private unlock;
}
