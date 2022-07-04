declare module 'zlib-sync' {
  export class Inflate {
    constructor(options: any);

    push(data: any, flush: boolean | number): void;

    err: string;

    msg: string;

    result: Buffer;
  }
  export const Z_SYNC_FLUSH: number;
}
