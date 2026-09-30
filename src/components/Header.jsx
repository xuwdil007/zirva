import { t, asset } from "../content";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { getNavigation } from "../data/company";
export default function Header() {
  const navigation = getNavigation();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  return (
    <header className="header">
      <div className="container header-inner">
        <a
          className="brand"
          href="#home"
          aria-label={t("Header.1")}
          onClick={() => setOpen(false)}
        >
          <img
            src={asset("images.logo")}
            alt={t("Header.2")}
            width="84"
            height="73"
          />
        </a>
        <nav
          aria-label={t("Header.3")}
          className={open ? "nav open" : "nav"}
          id="main-nav"
        >
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <a
            href="#contacts"
            onClick={() => setOpen(false)}
          >
            {t("Header.4")}
          </a>
        </nav>
        <a
          href="#contacts"
          className="header-cta"
        >
          {t("Header.5")}
          <ArrowUpRight size={17} />
        </a>
        <button
          className="menu-toggle"
          aria-label={open ? t("Header.6") : t("Header.7")}
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
