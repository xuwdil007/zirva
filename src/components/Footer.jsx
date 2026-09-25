import { ArrowUp, Phone, Mail, MapPin } from "lucide-react";
import { navigation, company } from "../data/company";
export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-identity">
            <div className="footer-top">
              <a href="#home" aria-label="На главную">
                <img
                  src={`${import.meta.env.BASE_URL}assets/logo-footer.svg`}
                  alt="ZIRVA Development"
                  width="95"
                  height="82"
                />
              </a>
              <p>
                К НОВЫМ
                <br />
                <span>ВЕРШИНАМ.</span>
              </p>
            </div>
            <div className="footer-nav">
              <span>
                Строительная и девелоперская платформа
                <br />
                Группы компаний «КОИНОТИ НАВ»
              </span>
            </div>
          </div>
          <nav className="footer-menu" aria-label="Навигация в подвале">
            {navigation.map((n) => (
              <a
                key={n.href}
                href={n.href}
              >
                {n.label}
              </a>
            ))}
          </nav>
          <address className="footer-contacts" aria-label="Контакты компании">
            <a href={company.phoneHref}>
              <Phone size={20} aria-hidden="true" />
              <span>{company.phone}</span>
            </a>
            <a href={`mailto:${company.email}`}>
              <Mail size={20} aria-hidden="true" />
              <span>{company.email}</span>
            </a>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Душанбе+улица+Шамси+4Б"
              target="_blank"
              rel="noreferrer"
            >
              <MapPin size={20} aria-hidden="true" />
              <span>{company.address}</span>
            </a>
          </address>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} ZIRVA Development</span>
          <span>ДУШАНБЕ · ТАДЖИКИСТАН</span>
          <span>СТРОИМ С ОТВЕТСТВЕННОСТЬЮ</span>
          <a href="#home" className="back-top" aria-label="Вернуться наверх">
            <ArrowUp size={23} />
          </a>
        </div>
      </div>
    </footer>
  );
}
