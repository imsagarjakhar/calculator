import { useLayoutEffect, useRef } from "react";
import { createControllerScope, type ControllerScope } from "./controllerScope";
import {
  onCurrencyChange,
  preferredCurrency,
  selectCurrency,
} from "./currency";

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
    const root = ref.current;
    const selector = root.querySelector<HTMLSelectElement>(
      ".planner-currency select",
    );
    const sync = () => {
      const currency = preferredCurrency();
      if (selector && currency && selector.value !== currency) {
        selector.value = currency;
        selector.dispatchEvent(new Event("change", { bubbles: true }));
      }
    };
    const changed = () => {
      if (selector) selectCurrency(selector.value);
    };
    sync();
    selector?.addEventListener("change", changed);
    const unsubscribe = onCurrencyChange(sync);
    // Reports and resets can restore controls without firing a change event.
    let lastCurrency = selector?.value;
    const observer = new MutationObserver(() => {
      if (selector && selector.value !== lastCurrency) {
        lastCurrency = selector.value;
        changed();
      }
    });
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => {
      observer.disconnect();
      unsubscribe();
      selector?.removeEventListener("change", changed);
      scope.dispose();
    };
    // Controllers mount once per page lifetime; their inputs are uncontrolled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}
