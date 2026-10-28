import { CSSProperties, RefObject, useLayoutEffect, useState } from "react";

/**
 * Tracks the active child of a container (matched by `activeSelector`) and returns
 * the style for an absolutely-positioned "pill" that glides behind it.
 * Watches attribute changes (Radix data-state, aria-current) and resizes.
 */
export function useSlidingPill(containerRef: RefObject<HTMLElement>, activeSelector: string, deps: unknown[] = []) {
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let first = true;

    const measure = () => {
      const active = el.querySelector<HTMLElement>(activeSelector);
      if (!active) {
        setStyle((s) => ({ ...s, opacity: 0 }));
        return;
      }
      setStyle({
        opacity: 1,
        width: active.offsetWidth,
        height: active.offsetHeight,
        transform: `translate(${active.offsetLeft}px, ${active.offsetTop}px)`,
        // Don't animate in from 0,0 on first paint
        transition: first ? "none" : undefined,
      });
      first = false;
    };

    measure();
    const mo = new MutationObserver(measure);
    mo.observe(el, { attributes: true, subtree: true, attributeFilter: ["data-state", "aria-current", "data-active", "class"] });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    window.addEventListener("resize", measure);
    // Fonts can shift widths after load
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return style;
}
