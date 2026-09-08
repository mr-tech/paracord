export type CloseOrigin = 'consumer' | 'transport' | 'discord';

const pendingOrigin = new WeakMap<object, CloseOrigin>();

export function setPendingOrigin(key: object, origin: CloseOrigin): void {
  pendingOrigin.set(key, origin);
}

export function takePendingOrigin(key: object): CloseOrigin | undefined {
  const origin = pendingOrigin.get(key);
  pendingOrigin.delete(key);
  return origin;
}

const pendingCloseIntent = new WeakMap<object, CloseOrigin>();

export function setPendingCloseIntent(key: object, origin: CloseOrigin): void {
  pendingCloseIntent.set(key, origin);
}

export function takePendingCloseIntent(key: object): CloseOrigin | undefined {
  const origin = pendingCloseIntent.get(key);
  pendingCloseIntent.delete(key);
  return origin;
}
