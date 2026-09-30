import { t } from "../content";
import {
  ShieldCheck,
  BadgeCheck,
  Ruler,
  Zap,
  Target,
  Building2,
} from "lucide-react";
import { getValues } from "../data/company";
import SectionHeading from "./SectionHeading";
const icons = {
  shield: ShieldCheck,
  badge: BadgeCheck,
  ruler: Ruler,
  zap: Zap,
  target: Target,
  building: Building2,
};
export default function Values() {
  const values = getValues();
  return (
    <section
      className="section values"
      id="values"
    >
      <div className="container">
        <div className="section-row">
          <SectionHeading
            number="04"
            label={t("Values.1")}
          >
            {t("Values.2")}
            <br />
            {t("Values.3")}
          </SectionHeading>
          <p>
            {t("Values.4")}
            <br />
            {t("Values.5")}
          </p>
        </div>
        <div className="values-grid">
          {values.map((v, i) => {
            const Icon = icons[v.icon];
            return (
              <article
                className="value"
                key={v.title}
              >
                <div className="value-top">
                  <Icon
                    size={30}
                    strokeWidth={1.4}
                  />
                  <span>0{i + 1}</span>
                </div>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
