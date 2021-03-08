// / <reference types="node" />

declare module 'erlpack' {
  export function pack(data: any): Buffer;
  export function unpack(data: Buffer): any;
}
