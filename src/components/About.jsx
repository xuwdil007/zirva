import { ArrowUpRight } from "lucide-react";
import SectionHeading from "./SectionHeading";
import History from "./History";
export default function About() {
  return (
    <section className="section about" id="about">
      <div className="container">
        <div className="about-top">
          <div className="about-aside">
            <SectionHeading number="01" label="О КОМПАНИИ" />
            <div className="about-positioning">
              <p className="about-positioning-title">
                Компания, которой доверяют <span>самые важные проекты.</span>
              </p>
              <p className="about-positioning-name">ZIRVA DEVELOPMENT</p>
            </div>
            <p className="about-purpose">
              Создавать надёжные объекты и инфраструктуру, обеспечивающие
              долгосрочное развитие бизнеса и общества.
            </p>
          </div>
          <div className="about-main">
            <h2>
              Важные проекты.
              <br />
              <span className="muted">Надёжный партнёр.</span>
            </h2>
            <p className="lead">
              ZIRVA Development — единый центр реализации строительных и
              инфраструктурных проектов Группы компаний «КОИНОТИ НАВ».
            </p>
            <p className="body-copy">
              Мы управляем строительством от задачи до сдачи. Держим сроки,
              контролируем качество и отвечаем за результат — чтобы каждый
              объект становился прочной основой для дальнейшего развития.
            </p>
            <a className="text-link" href="#approach">
              Как мы работаем <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
        <History />
      </div>
    </section>
  );
}
