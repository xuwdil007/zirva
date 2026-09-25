import { useState } from "react";
import { ArrowUpRight, Plus, Minus } from "lucide-react";
import SectionHeading from "./SectionHeading";
import { services } from "../data/company";
export default function Expertise() {
  const [selected, setSelected] = useState(null);
  return (
    <section className="section expertise" id="expertise">
      <div className="container">
        <div className="section-row">
          <SectionHeading number="02" label="НАПРАВЛЕНИЯ">
            Создаём сегодня.
            <br />
            Для завтрашнего дня.
          </SectionHeading>
          <p>
            Объединяем строительную экспертизу
            <br className="desktop-break" /> и системный подход к развитию
            объектов.
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
                    s.title === "Строительство"
                      ? "Специалист на строительной площадке"
                      : s.title === "Девелопмент"
                        ? "Строительная техника за работой"
                        : "Специалист контролирует ход работ"
                  }
                  loading="lazy"
                />
                <span className="service-number">{s.id} /</span>
                <ArrowUpRight className="service-arrow" size={27} />
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
                  {selected === s.id ? "Свернуть" : "Подробнее о направлении"}
                  {selected === s.id ? <Minus size={19} /> : <Plus size={19} />}
                </button>
                {selected === s.id && (
                  <div id={`service-${s.id}`} className="service-details">
                    <ul>
                      {s.details.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                    <a href="#contacts" className="text-link">
                      Обсудить задачу <ArrowUpRight size={17} />
                    </a>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
        <div className="expertise-bottom">
          <span className="status-dot" /> Единый подход. Разные задачи. Общая
          ответственность за результат.
        </div>
      </div>
    </section>
  );
}
