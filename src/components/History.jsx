export default function History() {
  return (
    <section className="company-history" aria-labelledby="history-title">
      <div>
        <span className="eyebrow">НАШ ПУТЬ</span>
        <h3 id="history-title">
          История ZIRVA
          <br />
          Development
        </h3>
        <div className="company-history-intro">
          <p className="company-history-motto">
            От внутренних задач —<br />к новым масштабам.
          </p>
          <p>
            Наш путь начался с ремонта и строительства объектов Группы компаний
            «КОИНОТИ НАВ». Рост проектов стал основой для создания
            самостоятельной платформы ZIRVA Development.
          </p>
        </div>
      </div>
      <div className="company-history-content">
        <p className="lead">
          ZIRVA Development выросла из внутреннего направления Группы компаний
          «КОИНОТИ НАВ».
        </p>
        <div className="company-history-event">
          <span className="company-history-date">2023</span>
          <p>
            В 2023 году в составе Административно-Хозяйственного Департамента
            стартовало направление по ремонту и строительству внутренних
            объектов.
          </p>
        </div>
        <div className="company-history-event">
          <span className="company-history-date orange">2026</span>
          <p>
            Благодаря росту проектов в 2026 году направление стало
            самостоятельной строительной и девелоперской платформой.
          </p>
        </div>
        <p className="company-history-today">
          Сегодня ZIRVA Development — единый центр реализации строительных и
          инфраструктурных проектов Группы компаний «КОИНОТИ НАВ».
        </p>
      </div>
    </section>
  );
}
