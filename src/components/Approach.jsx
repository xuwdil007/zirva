import { t } from "../content";
import SectionHeading from "./SectionHeading";
import { getSteps } from "../data/company";

export default function Approach() {
  const steps = getSteps();
  return (
    <section
      className="section approach"
      id="approach"
    >
      <div className="container">
        <div className="section-row">
          <SectionHeading
            number="03"
            label={t("Approach.1")}
          >
            {t("Approach.2")}
            <br />
            {t("Approach.3")}
          </SectionHeading>
          <p>
            {t("Approach.4")}
            <br />
            {t("Approach.5")}
          </p>
        </div>
        <div className="steps">
          {steps.map((step, index) => (
            <article
              className="step"
              key={step.title}
            >
              <div className="step-top">
                <span>0{index + 1}</span>
                <span className="step-dot" />
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
        <div className="vision">
          <span className="eyebrow">{t("Approach.6")}</span>
          <p>
            {t("Approach.7")} <strong>{t("Approach.8")}</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
