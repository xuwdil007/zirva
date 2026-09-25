import { useEffect, useState } from "react";
import "./brick-title.css";

const lines = ["К НОВЫМ", "ВЕРШИНАМ."];
const rows = 3;
const columns = 9;

export default function BrickTitle() {
  const [building, setBuilding] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cancelled = false;
    let timer;
    const finish = () => setBuilding(false);
    const onMotionChange = () => {
      if (motion.matches) finish();
    };
    motion.addEventListener("change", onMotionChange);
    if (motion.matches) finish();
    else {
      document.fonts.ready.then(() => {
        if (cancelled || motion.matches) return;
        setReady(true);

        timer = window.setTimeout(finish, 2100);
      });
    }
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      motion.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <h1
      id="hero-title"
      className={`brick-title${building ? " is-building" : ""}${ready ? " is-ready" : ""}`}
      aria-label="К новым вершинам"
    >
      {lines.map((text, line) => (
        <div
          className={`brick-title-line${line === 1 ? " brick-title-accent" : ""}`}
          key={text}
        >
          <span className="brick-title-source">{text}</span>
          {building && (
            <div className="brick-title-pieces" aria-hidden="true">
              {Array.from({ length: rows * columns }, (_, index) => {
                const row = Math.floor(index / columns);
                const column = index % columns;

                const left = Math.max(
                  0,
                  ((column - (row % 2) * 0.5) / columns) * 100,
                );
                const right =
                  column === columns - 1
                    ? 100
                    : ((column + 1 - (row % 2) * 0.5) / columns) * 100;
                return (
                  <div
                    className="brick-title-piece"
                    key={index}
                    style={{
                      clipPath: `inset(${(row / rows) * 100}% ${100 - right}% ${100 - ((row + 1) / rows) * 100}% ${left}%)`,
                      "--brick-delay": `${line * 260 + (rows - row - 1) * 180 + column * 45}ms`,
                      "--brick-x": `${((column % 3) - 1) * 18}px`,
                      "--brick-y": `${35 + (rows - row) * 10}px`,
                    }}
                  >
                    {text}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </h1>
  );
}
