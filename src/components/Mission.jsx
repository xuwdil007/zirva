import { t } from "../content";
import { ArrowUpRight } from "lucide-react";
export default function Mission() {
  return (
    <section className="mission">
      <div className="container mission-inner">
        <div className="eyebrow">
          <span>{t("Mission.1")}</span>
          <ArrowUpRight size={30} />
        </div>
        <h2>
          {t("Mission.2")}
          <br className="desktop-break" />
          {t("Mission.3")}
          <br className="desktop-break" /> <span>{t("Mission.4")}</span>
        </h2>
        <div className="mission-bottom">
          <span>{t("Mission.5")}</span>
          <span>{t("Mission.6")}</span>
        </div>
      </div>
    </section>
  );
}
