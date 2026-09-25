import BrickTitle from "./BrickTitle";
import { ArrowUpRight } from "lucide-react";
export default function Hero() {
  return (
    <section className="hero" id="home" aria-labelledby="hero-title">
      <div className="hero-photo" />
      <div className="hero-grid" />
      <div className="container hero-content">
        <div className="hero-topline">
          <span className="status-dot" /> СТРОИТЕЛЬСТВО. ДЕВЕЛОПМЕНТ.
          ИНФРАСТРУКТУРА.
        </div>
        <BrickTitle />
        <div className="hero-bottom">
          <div>
            <p>
              Создаём надёжные объекты.
              <br />
              Строим основу для будущего.
            </p>
            <a className="button button-orange" href="#expertise">
              Наши направления <ArrowUpRight size={20} />
            </a>
          </div>
        </div>
        <div className="hero-baseline">
          <span className="hero-location">
            ДУШАНБЕ, ТАДЖИКИСТАН{" "}
            <span className="coordinates">38°33′ N 68°46′ E</span>
          </span>
        </div>
      </div>
      <div className="hero-side-label">
        TOWARD NEW HEIGHTS — ZIRVA DEVELOPMENT
      </div>
    </section>
  );
}
