import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./helmet-cursor.css";

const INTERACTIVE = 'a, button, summary, [role="button"], .clickable';

export default function HelmetCursor() {
  const cursorRef = useRef(null);

  const [host] = useState(() =>
    typeof document === "undefined" ? null : document.createElement("div"),
  );

  useEffect(() => {
    if (!host) return undefined;
    const cursor = cursorRef.current;
    const html = document.documentElement;
    const desktop = matchMedia("(hover: hover) and (pointer: fine)");
    const coarse = matchMedia("(any-pointer: coarse)");
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const target = { x: 0, y: 0 };
    const position = { x: 0, y: 0 };
    let active = false;
    let frame = 0;
    let hoverFrame = 0;
    let previousTime = 0;
    let hovered = null;
    let enabled = false;

    host.className = "helmet-cursor-host";
    document.body.appendChild(host);

    function setHover(element) {
      const next =
        element instanceof Element ? element.closest(INTERACTIVE) : null;
      const interactive =
        next && !next.matches(':disabled, [aria-disabled="true"]')
          ? next
          : null;
      if (interactive === hovered) return;
      if (interactive && !hovered) {
        Object.assign(position, target);
        draw();
      }
      hovered = interactive;
      cursor.classList.toggle("is-visible", Boolean(interactive));
      html.classList.toggle("helmet-cursor-active", Boolean(interactive));
      if (!interactive) {
        cancelAnimationFrame(frame);
        frame = previousTime = 0;
      }
      cursor.classList.toggle("is-interactive", Boolean(interactive));

      cursor.classList.remove("is-nodding");
      if (interactive && !reducedMotion.matches) {
        void cursor.offsetWidth;
        cursor.classList.add("is-nodding");
      }
    }

    function refreshHover() {
      hoverFrame = 0;
      if (active) setHover(document.elementFromPoint(target.x, target.y));
    }

    function scheduleHover() {
      if (active && !hoverFrame)
        hoverFrame = requestAnimationFrame(refreshHover);
    }

    function draw() {
      cursor.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
    }

    function animate(time) {
      frame = 0;
      const elapsed = previousTime ? Math.min(time - previousTime, 64) : 16;
      previousTime = time;

      const blend = reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 42);
      position.x += (target.x - position.x) * blend;
      position.y += (target.y - position.y) * blend;
      const settled =
        Math.hypot(target.x - position.x, target.y - position.y) < 0.15;
      if (settled) Object.assign(position, target);
      draw();
      if (!settled && active) frame = requestAnimationFrame(animate);
      else previousTime = 0;
    }

    function hide() {
      active = false;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(hoverFrame);
      frame = hoverFrame = previousTime = 0;
      html.classList.remove("helmet-cursor-active");
      cursor.classList.remove("is-visible", "is-pressed");
      setHover(null);
    }

    function onMove(event) {
      if (!enabled || event.pointerType !== "mouse") {
        hide();
        return;
      }
      target.x = event.clientX;
      target.y = event.clientY;
      if (!active) {
        active = true;
        Object.assign(position, target);
        draw();
      }
      setHover(event.target);
      if (hovered && !frame) frame = requestAnimationFrame(animate);
    }

    function onOver(event) {
      onMove(event);
    }
    function onOut(event) {
      if (!event.relatedTarget) hide();
    }
    function onDown(event) {
      if (event.pointerType !== "mouse") {
        hide();
        return;
      }
      if (active) cursor.classList.add("is-pressed");
    }
    function onUp() {
      cursor.classList.remove("is-pressed");
    }
    function onKey(event) {
      if (event.key === "Tab") hide();
    }
    function onVisibility() {
      if (document.hidden) hide();
    }
    function updateDevice() {
      enabled =
        desktop.matches && !coarse.matches && navigator.maxTouchPoints === 0;
      if (!enabled) hide();
    }

    function syncLayer() {
      const dialogs = [...document.querySelectorAll("dialog[open]")];
      const parent = dialogs.at(-1) || document.body;
      if (host.parentNode !== parent) parent.appendChild(host);
      scheduleHover();
    }
    const observer = new MutationObserver(syncLayer);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["open", "disabled", "aria-disabled"],
    });

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointercancel", hide);
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("scroll", scheduleHover, {
      passive: true,
      capture: true,
    });
    window.addEventListener("blur", hide);
    desktop.addEventListener("change", updateDevice);
    coarse.addEventListener("change", updateDevice);
    reducedMotion.addEventListener("change", scheduleHover);
    updateDevice();
    syncLayer();

    return () => {
      observer.disconnect();
      hide();
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", hide);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("scroll", scheduleHover, true);
      window.removeEventListener("blur", hide);
      desktop.removeEventListener("change", updateDevice);
      coarse.removeEventListener("change", updateDevice);
      reducedMotion.removeEventListener("change", scheduleHover);
      host.remove();
    };
  }, [host]);

  if (!host) return null;
  return createPortal(
    <div ref={cursorRef} className="helmet-cursor" aria-hidden="true">
      <div className="helmet-cursor-offset">
        <svg
          className="helmet-cursor-icon"
          viewBox="0 0 48 40"
          fill="none"
          focusable="false"
        >
          <path
            d="M8 28V22C8 13.2 14.7 6 24 6S40 13.2 40 22V28"
            fill="currentColor"
            stroke="#071230"
            strokeWidth="1.6"
          />
          <path
            d="M20 26V7C20 4 28 4 28 7V26"
            fill="currentColor"
            stroke="#071230"
            strokeWidth="1.6"
          />
          <path
            d="M12 23C12 16 15 12 18 11M31 11C35 14 36 18 36 23"
            stroke="#fff"
            strokeOpacity=".5"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M6 26H42L45 31C45 35 3 35 3 31L6 26Z"
            fill="currentColor"
            stroke="#071230"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M8 29H39"
            stroke="#fff"
            strokeOpacity=".45"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M11 34H37"
            stroke="#071230"
            strokeOpacity=".2"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>,
    host,
  );
}
