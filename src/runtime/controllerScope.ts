export interface ControllerScope {
  document: Document;
  window: Window & typeof globalThis;
  setTimeout: typeof window.setTimeout;
  clearTimeout: typeof window.clearTimeout;
  setInterval: typeof window.setInterval;
  clearInterval: typeof window.clearInterval;
  requestAnimationFrame: typeof window.requestAnimationFrame;
  cancelAnimationFrame: typeof window.cancelAnimationFrame;
  dispose: () => void;
}

// Existing event-driven form controllers own their result containers. React
// owns the page/layout; it never reconciles the mutable controller subtrees.
export function createControllerScope(root: HTMLElement): ControllerScope {
  const cleanups: (() => void)[] = [];
  const timeouts = new Set<number>(),
    intervals = new Set<number>(),
    frames = new Set<number>();
  function proxyTarget<T extends Document | Window>(target: T): T {
    return new Proxy(target, {
      get(object, property) {
        if (property === "addEventListener")
          return (
            type: string,
            listener: EventListener,
            options?: AddEventListenerOptions | boolean,
          ) => {
            object.addEventListener(type, listener, options);
            cleanups.push(() =>
              object.removeEventListener(type, listener, options),
            );
          };
        const value = Reflect.get(object, property, object) as unknown;
        return typeof value === "function" ? value.bind(object) : value;
      },
    });
  }
  const scopedDocument = proxyTarget(document);
  const scope: ControllerScope = {
    document: new Proxy(scopedDocument, {
      get(target, property) {
        if (property === "getElementById")
          return (id: string) => root.querySelector("#" + CSS.escape(id));
        if (property === "querySelectorAll")
          return (selector: string) => root.querySelectorAll(selector);
        if (property === "querySelector")
          return (selector: string) => root.querySelector(selector);
        return Reflect.get(target, property);
      },
    }),
    window: proxyTarget(window),
    setTimeout: ((
      handler: TimerHandler,
      delay?: number,
      ...args: unknown[]
    ) => {
      const id = window.setTimeout(() => {
        timeouts.delete(id);
        if (typeof handler === "function") handler(...args);
      }, delay);
      timeouts.add(id);
      return id;
    }) as typeof window.setTimeout,
    clearTimeout: (id) => {
      window.clearTimeout(id);
      if (typeof id === "number") timeouts.delete(id);
    },
    setInterval: ((
      handler: TimerHandler,
      delay?: number,
      ...args: unknown[]
    ) => {
      const id = window.setInterval(handler, delay, ...args);
      intervals.add(id);
      return id;
    }) as typeof window.setInterval,
    clearInterval: (id) => {
      window.clearInterval(id);
      if (typeof id === "number") intervals.delete(id);
    },
    requestAnimationFrame: (callback) => {
      const id = window.requestAnimationFrame((time) => {
        frames.delete(id);
        callback(time);
      });
      frames.add(id);
      return id;
    },
    cancelAnimationFrame: (id) => {
      window.cancelAnimationFrame(id);
      frames.delete(id);
    },
    dispose() {
      for (const cleanup of cleanups.splice(0)) cleanup();
      for (const id of timeouts) window.clearTimeout(id);
      for (const id of intervals) window.clearInterval(id);
      for (const id of frames) window.cancelAnimationFrame(id);
      timeouts.clear();
      intervals.clear();
      frames.clear();
    },
  };
  return scope;
}
