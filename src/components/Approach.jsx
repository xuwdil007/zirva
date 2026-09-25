import SectionHeading from "./SectionHeading";
import { steps } from "../data/company";

export default function Approach() {
  return (
    <section className="section approach" id="approach">
      <div className="container">
        <div className="section-row">
          <SectionHeading number="03" label="НАШ ПОДХОД">
            От первой задачи
            <br />
            до готового объекта.
          </SectionHeading>
          <p>
            Понятный процесс, в котором
            <br />
            каждый этап имеет значение.
          </p>
        </div>
        <div className="steps">
          {steps.map((step, index) => (
            <article className="step" key={step.title}>
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
          <span className="eyebrow">НАШЕ ВИДЕНИЕ</span>
          <p>
            Стать компанией, которую выбирают для объектов, где важны{" "}
            <strong>точные сроки, контроль и качество исполнения.</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
