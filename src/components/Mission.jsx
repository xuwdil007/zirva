import { ArrowUpRight } from "lucide-react";
export default function Mission() {
  return (
    <section className="mission">
      <div className="container mission-inner">
        <div className="eyebrow">
          <span>НАША МИССИЯ</span>
          <ArrowUpRight size={30} />
        </div>
        <h2>
          Создавать надёжные объекты
          <br className="desktop-break" /> и инфраструктуру для
          <br className="desktop-break" /> <span>долгосрочного развития.</span>
        </h2>
        <div className="mission-bottom">
          <span>БИЗНЕСА. ОБЩЕСТВА. БУДУЩЕГО.</span>
          <span>БА ҚУЛЛАҲОИ НАВ</span>
        </div>
      </div>
    </section>
  );
}
