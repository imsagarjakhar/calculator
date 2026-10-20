import { useEffect } from "react";

export function useTables() {
  useEffect(() => {
    let frame = 0;
    const tracked = new Set<HTMLElement>();
    const hints = new Set<HTMLElement>();
    const resize = new ResizeObserver(schedule);
    function schedule() {
      if (!frame) frame = requestAnimationFrame(refresh);
    }
    function refresh() {
      frame = 0;
      document.querySelectorAll<HTMLElement>(".table-wrap").forEach((wrap) => {
        if (!tracked.has(wrap)) {
          tracked.add(wrap);
          resize.observe(wrap);
          const hint = document.createElement("p");
          hint.className = "table-scroll-hint";
          hint.hidden = true;
          hint.textContent =
            "This table has more columns. Swipe or scroll sideways; keyboard users can focus the table and use the arrow keys.";
          wrap.before(hint);
          hints.add(hint);
        }
        const table = wrap.querySelector("table");
        if (table) resize.observe(table);
        const overflowing = wrap.scrollWidth > wrap.clientWidth + 1;
        wrap.classList.toggle("is-scrollable", overflowing);
        const hint = wrap.previousElementSibling as HTMLElement;
        if (hint?.classList.contains("table-scroll-hint"))
          hint.hidden = !overflowing;
        if (overflowing) {
          wrap.tabIndex = 0;
          if (!wrap.hasAttribute("role")) wrap.setAttribute("role", "region");
          if (!wrap.hasAttribute("aria-label"))
            wrap.setAttribute("aria-label", "Scrollable data table");
        } else wrap.removeAttribute("tabindex");
      });
    }
    const mutation = new MutationObserver(schedule);
    mutation.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      resize.disconnect();
      mutation.disconnect();
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
      for (const hint of hints) hint.remove();
    };
  }, []);
}
