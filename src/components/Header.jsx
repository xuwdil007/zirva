import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { navigation } from "../data/company";
export default function Header() {
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
          aria-label="ZIRVA Development — главная"
          onClick={() => setOpen(false)}
        >
          <img
            src={`${import.meta.env.BASE_URL}assets/logo-footer.svg`}
            alt="ZIRVA Development"
            width="84"
            height="73"
          />
        </a>
        <nav
          aria-label="Основная навигация"
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
          <a href="#contacts" onClick={() => setOpen(false)}>
            Контакты
          </a>
        </nav>
        <a href="#contacts" className="header-cta">
          Обсудить проект <ArrowUpRight size={17} />
        </a>
        <button
          className="menu-toggle"
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
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
