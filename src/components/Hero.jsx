import { t, asset } from "../content";
import BrickTitle from "./BrickTitle";
import { ArrowUpRight } from "lucide-react";
export default function Hero() {
  return (
    <section
      className="hero"
      id="home"
      aria-labelledby="hero-title"
    >
      <div
        className="hero-photo"
        style={{ "--hero-image": `url("${asset("images.hero")}")` }}
      />
      <div className="hero-grid" />
      <div className="container hero-content">
        <div className="hero-topline">
          <span className="status-dot" />
          {t("Hero.1")}
        </div>
        <BrickTitle />
        <div className="hero-bottom">
          <div>
            <p>
              {t("Hero.2")}
              <br />
              {t("Hero.3")}
            </p>
            <a
              className="button button-orange"
              href="#expertise"
            >
              {t("Hero.4")}
              <ArrowUpRight size={20} />
            </a>
          </div>
        </div>
        <div className="hero-baseline">
          <span className="hero-location">
            {t("Hero.5")} <span className="coordinates">{t("Hero.6")}</span>
          </span>
        </div>
      </div>
      <div className="hero-side-label">{t("Hero.7")}</div>
    </section>
  );
}
