import {
  ShieldCheck,
  BadgeCheck,
  Ruler,
  Zap,
  Target,
  Building2,
} from "lucide-react";
import { values } from "../data/company";
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
  return (
    <section className="section values" id="values">
      <div className="container">
        <div className="section-row">
          <SectionHeading number="04" label="ЦЕННОСТИ">
            Наш фундамент —<br />
            наши принципы.
          </SectionHeading>
          <p>
            То, на что мы опираемся
            <br />в решениях и ежедневной работе.
          </p>
        </div>
        <div className="values-grid">
          {values.map((v, i) => {
            const Icon = icons[v.icon];
            return (
              <article className="value" key={v.title}>
                <div className="value-top">
                  <Icon size={30} strokeWidth={1.4} />
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
