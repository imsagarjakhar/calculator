import { useLayoutEffect, useRef } from "react";
import { createControllerScope, type ControllerScope } from "./controllerScope";

type Mount = (scope: ControllerScope) => void;
export function usePlanner(...mounts: Mount[]) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const scope = createControllerScope(ref.current);
    try {
      for (const mount of mounts) mount(scope);
    } catch (error) {
      scope.dispose();
      throw error;
    }
    return scope.dispose;
    // Controllers mount once per page lifetime; their inputs are uncontrolled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}
