import { useEffect } from "react";
import "./scroll-reveal.css";

const TARGETS = [
  ".about-top",
  ".company-history",
  ".section-row",
  ".service-card",
  ".expertise-bottom",
  ".mission-inner",
  ".step",
  ".vision",
  ".value",
  ".contacts-grid > *",
].join(", ");

export default function useScrollReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !("IntersectionObserver" in window)) return undefined;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const elements = [...root.querySelectorAll(TARGETS)];
    let observer;

    function reveal(element) {
      element.classList.remove("scroll-reveal-pending");
      observer?.unobserve(element);
    }

    function configure() {
      observer?.disconnect();
      if (motion.matches) {
        elements.forEach(reveal);
        return;
      }
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) reveal(entry.target);
          });
        },
        { threshold: 0, rootMargin: "0px 0px -36px 0px" },
      );

      elements.forEach((element) => {
        // Уже видимый контент и блоки выше viewport не скрываем повторно.
        if (element.getBoundingClientRect().top < window.innerHeight - 36) {
          reveal(element);
          return;
        }
        element.classList.add("scroll-reveal", "scroll-reveal-pending");
        if (element.matches(".service-card, .step, .value")) {
          const siblings = [...element.parentElement.children];
          const index = siblings.indexOf(element);
          // Небольшая очередность внутри ряда, без длинного ожидания на мобильном.
          element.style.setProperty("--reveal-delay", `${(index % 3) * 65}ms`);
        }
        observer.observe(element);
      });
    }

    // Навигация клавиатурой не должна приводить к фокусу на невидимой кнопке.
    function onFocus(event) {
      const element = event.target.closest(".scroll-reveal-pending");
      if (element) {
        element.classList.remove("scroll-reveal");
        reveal(element);
      }
    }

    configure();
    motion.addEventListener("change", configure);
    root.addEventListener("focusin", onFocus);
    return () => {
      observer?.disconnect();
      motion.removeEventListener("change", configure);
      root.removeEventListener("focusin", onFocus);
      elements.forEach((element) => {
        element.classList.remove("scroll-reveal", "scroll-reveal-pending");
        element.style.removeProperty("--reveal-delay");
      });
    };
  }, [rootRef]);
}
