import { t } from "../content";
import { useState } from "react";
import { ArrowUpRight, Plus, Minus } from "lucide-react";
import SectionHeading from "./SectionHeading";
import { getServices } from "../data/company";
export default function Expertise() {
  const services = getServices();
  const [selected, setSelected] = useState(null);
  return (
    <section
      className="section expertise"
      id="expertise"
    >
      <div className="container">
        <div className="section-row">
          <SectionHeading
            number="02"
            label={t("Expertise.1")}
          >
            {t("Expertise.2")}
            <br />
            {t("Expertise.3")}
          </SectionHeading>
          <p>
            {t("Expertise.4")}
            <br className="desktop-break" />
            {t("Expertise.5")}
          </p>
        </div>
        <div className="service-grid">
          {services.map((s) => (
            <article
              className={`service-card ${selected === s.id ? "expanded" : ""}`}
              key={s.id}
            >
              <div className="service-image">
                <img
                  src={s.image}
                  alt={
                    s.id === "01"
                      ? t("Expertise.7")
                      : s.id === "02"
                        ? t("Expertise.9")
                        : t("Expertise.10")
                  }
                  loading="lazy"
                />
                <span className="service-number">{s.id} /</span>
                <ArrowUpRight
                  className="service-arrow"
                  size={27}
                />
                <div className="service-caption">
                  <span>{s.category}</span>
                  <h3>{s.title}</h3>
                </div>
              </div>
              <div className="service-body">
                <p>{s.description}</p>
                <button
                  className="service-toggle"
                  aria-expanded={selected === s.id}
                  aria-controls={`service-${s.id}`}
                  onClick={() => setSelected(selected === s.id ? null : s.id)}
                >
                  {selected === s.id ? t("Expertise.11") : t("Expertise.12")}
                  {selected === s.id ? <Minus size={19} /> : <Plus size={19} />}
                </button>
                {selected === s.id && (
                  <div
                    id={`service-${s.id}`}
                    className="service-details"
                  >
                    <ul>
                      {s.details.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                    <a
                      href="#contacts"
                      className="text-link"
                    >
                      {t("Expertise.13")}
                      <ArrowUpRight size={17} />
                    </a>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
        <div className="expertise-bottom">
          <span className="status-dot" />
          {t("Expertise.14")}
        </div>
      </div>
    </section>
  );
}
