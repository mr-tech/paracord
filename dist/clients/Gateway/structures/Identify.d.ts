export default class Identify {
    readonly shard?: [number, number];
    readonly token: string;
    private properties?;
    private compress?;
    private largeThreshold?;
    private presence?;
    private guildSubscriptions?;
    private intents?;
    constructor(token: string, identity: Partial<Identify>);
}
