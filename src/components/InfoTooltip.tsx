import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "../styles/info-tooltip.css";

export function InfoTooltip({ label, children, id }: { label: string; children: ReactNode; id?: string }) {
  const generatedId = useId();
  const tooltipId = id ?? generatedId;
  const button = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const close = () => setPosition(null);
  const show = () => {
    const bounds = button.current?.getBoundingClientRect();
    if (!bounds) return;
    const width = Math.min(280, window.innerWidth - 24);
    setPosition({ left: Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12)), top: bounds.bottom + 8 });
  };
  useEffect(() => {
    if (!position) return;
    const followAnchor = () => {
      const bounds = button.current?.getBoundingClientRect();
      if (!bounds || bounds.bottom <= 0 || bounds.top >= window.innerHeight) close();
      else show();
    };
    window.addEventListener("scroll", followAnchor, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", followAnchor, true);
      window.removeEventListener("resize", close);
    };
  }, [position]);
  const leave = () => { if (document.activeElement !== button.current) close(); };
  return <span className="info-tooltip-anchor" onMouseEnter={show} onMouseLeave={leave}>
    <button ref={button} type="button" className="info-tooltip-button" aria-label={label}
      aria-describedby={position ? tooltipId : undefined}
      onFocus={show} onBlur={close} onClick={show}
      onKeyDown={(event) => { if (event.key === "Escape") close(); }}>
      <span aria-hidden="true">i</span>
    </button>
    {position && createPortal(<span id={tooltipId} role="tooltip" className="info-tooltip-content"
      style={position} onMouseEnter={show} onMouseLeave={leave}>{children}</span>, document.body)}
  </span>;
}
