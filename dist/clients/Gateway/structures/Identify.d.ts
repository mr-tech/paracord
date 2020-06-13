import { IdentityOptions } from '../types';
export default class Identify {
    #private;
    readonly shard?: [number, number];
    readonly token: string;
    constructor(token: string, identity: Partial<IdentityOptions>);
    toJSON(): Partial<Identify>;
}
