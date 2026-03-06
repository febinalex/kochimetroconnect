declare global {
  // Compatibility shim for third-party bundles that reference esbuild helper names at runtime.
  // eslint-disable-next-line no-var
  var __publicField:
    | ((obj: object, key: string | symbol | number, value: unknown) => unknown)
    | undefined;
}

if (typeof globalThis.__publicField !== "function") {
  globalThis.__publicField = (obj: object, key: string | symbol | number, value: unknown) => {
    Object.defineProperty(obj, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
    return value;
  };
}

export {};

