import { t, asset } from "../content";
import { ArrowUp, Phone, Mail, MapPin } from "lucide-react";
import { getNavigation, getCompany } from "../data/company";
export default function Footer() {
  const navigation = getNavigation();
  const company = getCompany();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-identity">
            <div className="footer-top">
              <a
                href="#home"
                aria-label={t("Footer.1")}
              >
                <img
                  src={asset("images.logo")}
                  alt={t("Footer.2")}
                  width="95"
                  height="82"
                />
              </a>
              <p>
                {t("Footer.3")}
                <br />
                <span>{t("Footer.4")}</span>
              </p>
            </div>
            <div className="footer-nav">
              <span>
                {t("Footer.5")}
                <br />
                {t("Footer.6")}
              </span>
            </div>
          </div>
          <nav
            className="footer-menu"
            aria-label={t("Footer.7")}
          >
            {navigation.map((n) => (
              <a
                key={n.href}
                href={n.href}
              >
                {n.label}
              </a>
            ))}
          </nav>
          <address
            className="footer-contacts"
            aria-label={t("Footer.8")}
          >
            <a href={`tel:${company.phone.replace(/[^+\d]/g, "")}`}>
              <Phone
                size={20}
                aria-hidden="true"
              />
              <span>{company.phone}</span>
            </a>
            <a href={`mailto:${company.email}`}>
              <Mail
                size={20}
                aria-hidden="true"
              />
              <span>{company.email}</span>
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin
                size={20}
                aria-hidden="true"
              />
              <span>{company.address}</span>
            </a>
          </address>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {t("Footer.9")}
          </span>
          <span>{t("Footer.10")}</span>
          <span>{t("Footer.11")}</span>
          <a
            href="#home"
            className="back-top"
            aria-label={t("Footer.12")}
          >
            <ArrowUp size={23} />
          </a>
        </div>
      </div>
    </footer>
  );
}
