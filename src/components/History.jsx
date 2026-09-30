import { t } from "../content";
export default function History() {
  return (
    <section
      className="company-history"
      aria-labelledby="history-title"
    >
      <div>
        <span className="eyebrow">{t("History.1")}</span>
        <h3 id="history-title">
          {t("History.2")}
          <br />
          {t("History.3")}
        </h3>
        <div className="company-history-intro">
          <p className="company-history-motto">
            {t("History.4")}
            <br />
            {t("History.5")}
          </p>
          <p>{t("History.6")}</p>
        </div>
      </div>
      <div className="company-history-content">
        <p className="lead">{t("History.7")}</p>
        <div className="company-history-event">
          <span className="company-history-date">{t("History.year1")}</span>
          <p>{t("History.8")}</p>
        </div>
        <div className="company-history-event">
          <span className="company-history-date orange">
            {t("History.year2")}
          </span>
          <p>{t("History.9")}</p>
        </div>
        <p className="company-history-today">{t("History.10")}</p>
      </div>
    </section>
  );
}
