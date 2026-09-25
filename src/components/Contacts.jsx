import { useState } from "react";
import { ArrowUpRight, MapPin, Phone, Mail, Check } from "lucide-react";
import { company } from "../data/company";
import SectionHeading from "./SectionHeading";
export default function Contacts() {
  const [prepared, setPrepared] = useState(false);
  function submit(e) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const subject = encodeURIComponent(`Обсуждение проекта — ${d.get("name")}`);
    const body = encodeURIComponent(
      `Имя: ${d.get("name")}\nКонтакт: ${d.get("contact")}\n\n${d.get("message")}`,
    );
    window.location.href = `mailto:${company.email}?subject=${subject}&body=${body}`;
    setPrepared(true);
  }
  return (
    <section className="section contacts" id="contacts">
      <div className="container contacts-grid">
        <div>
          <SectionHeading number="05" label="КОНТАКТЫ">
            Новая вершина
            <br />
            начинается
            <br />
            <span className="orange">с разговора.</span>
          </SectionHeading>
          <p className="contacts-intro">
            Расскажите о вашей задаче.
            <br />
            Обсудим, как воплотить её в жизнь.
          </p>
          <div className="contact-links">
            <a href={company.phoneHref}>
              <Phone size={20} />
              <span>{company.phone}</span>
              <ArrowUpRight size={18} />
            </a>
            <a href={`mailto:${company.email}`}>
              <Mail size={20} />
              <span>{company.email}</span>
              <ArrowUpRight size={18} />
            </a>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Душанбе+улица+Шамси+4Б"
              target="_blank"
              rel="noreferrer"
            >
              <MapPin size={20} />
              <span>{company.address}</span>
              <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
        <form className="contact-form" onSubmit={submit}>
          <h3>Давайте обсудим ваш проект</h3>
          <p>Оставьте несколько слов о себе и вашей задаче.</p>
          <label htmlFor="name">
            Ваше имя <span>*</span>
          </label>
          <input
            id="name"
            name="name"
            placeholder="Как к вам обращаться?"
            autoComplete="name"
            required
            maxLength={100}
          />
          <label htmlFor="contact">
            Телефон или email <span>*</span>
          </label>
          <input
            id="contact"
            name="contact"
            placeholder="Как с вами связаться?"
            required
            maxLength={160}
          />
          <label htmlFor="message">О вашем проекте</label>
          <textarea
            id="message"
            name="message"
            placeholder="Что вы планируете построить?"
            rows={3}
            maxLength={3000}
          />
          <button type="submit" className="button button-orange">
            Подготовить письмо <ArrowUpRight size={20} />
          </button>
          <p className="form-note">
            Откроется ваше почтовое приложение с готовым письмом. Отправьте его,
            чтобы связаться с нами.
          </p>
          {prepared && (
            <div className="form-status" role="status">
              <Check size={20} />
              <span>
                Письмо подготовлено. Если почтовое приложение не открылось,
                напишите на{" "}
                <a href={`mailto:${company.email}`}>{company.email}</a>.
              </span>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
