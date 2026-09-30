import { t } from "../content";
import { ArrowUpRight } from "lucide-react";
import SectionHeading from "./SectionHeading";
import History from "./History";
export default function About() {
  return (
    <section
      className="section about"
      id="about"
    >
      <div className="container">
        <div className="about-top">
          <div className="about-aside">
            <SectionHeading
              number="01"
              label={t("About.1")}
            />
            <div className="about-positioning">
              <p className="about-positioning-title">
                {t("About.2")} <span>{t("About.3")}</span>
              </p>
              <p className="about-positioning-name">{t("About.4")}</p>
            </div>
            <p className="about-purpose">{t("About.5")}</p>
          </div>
          <div className="about-main">
            <h2>
              {t("About.6")}
              <br />
              <span className="muted">{t("About.7")}</span>
            </h2>
            <p className="lead">{t("About.8")}</p>
            <p className="body-copy">{t("About.9")}</p>
            <a
              className="text-link"
              href="#approach"
            >
              {t("About.10")}
              <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
        <History />
      </div>
    </section>
  );
}
