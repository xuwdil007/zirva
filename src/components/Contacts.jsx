import { t, API_URL } from "../content";
import { useState, useRef } from "react";
import { ArrowUpRight, MapPin, Phone, Mail, Check } from "lucide-react";
import { getCompany } from "../data/company";
import SectionHeading from "./SectionHeading";
export default function Contacts() {
  const company = getCompany();
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const sending = useRef(false);
  async function submit(event) {
    event.preventDefault();
    if (sending.current) return;
    setErrorMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const phone = String(data.get("contact")).trim();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      setStatus("invalid");
      return;
    }
    sending.current = true;
    setStatus("pending");
    try {
      const response = await fetch(`${API_URL}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name")).trim(),
          phone,
          message: String(data.get("message")).trim(),
          website: String(data.get("website") || ""),
        }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.id) {
        if (typeof result?.error === "string") setErrorMessage(result.error);
        throw new Error("Submission failed");
      }
      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      sending.current = false;
    }
  }
  return (
    <section className="section contacts" id="contacts">
      <div className="container contacts-grid">
        <div>
          <SectionHeading number="05" label={t("Contacts.1")}>
            {t("Contacts.2")}
            <br />
            {t("Contacts.3")}
            <br />
            <span className="orange">{t("Contacts.4")}</span>
          </SectionHeading>
          <p className="contacts-intro">
            {t("Contacts.5")}
            <br />
            {t("Contacts.6")}
          </p>
          <div className="contact-links">
            <a href={`tel:${company.phone.replace(/[^+\d]/g, "")}`}>
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
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin size={20} />
              <span>{company.address}</span>
              <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
        <form
          className="contact-form"
          onSubmit={submit}
          aria-busy={status === "pending"}
        >
          <input
            name="website"
            className="form-trap"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
          <h3>{t("Contacts.7")}</h3>
          <p>{t("Contacts.8")}</p>
          <label htmlFor="name">
            {t("Contacts.9")}
            <span>*</span>
          </label>
          <input
            id="name"
            name="name"
            placeholder={t("Contacts.10")}
            autoComplete="name"
            required
            minLength={2}
            disabled={status === "pending"}
            maxLength={100}
          />
          <label htmlFor="contact">
            {t("Contacts.11")}
            <span>*</span>
          </label>
          <input
            id="contact"
            name="contact"
            placeholder={t("Contacts.12")}
            required
            type="tel"
            autoComplete="tel"
            disabled={status === "pending"}
            maxLength={40}
          />
          <label htmlFor="message">{t("Contacts.13")}</label>
          <textarea
            id="message"
            name="message"
            placeholder={t("Contacts.14")}
            rows={3}
            disabled={status === "pending"}
            maxLength={3000}
          />
          <button
            type="submit"
            className="button button-orange"
            disabled={status === "pending"}
          >
            {t(status === "pending" ? "Contacts.pending" : "Contacts.15")}
            <ArrowUpRight size={20} />
          </button>
          <p className="form-note">{t("Contacts.16")}</p>
          {status === "success" && (
            <div className="form-status" role="status">
              <Check size={20} />
              <span>{t("Contacts.17")}</span>
            </div>
          )}
          {(status === "error" || status === "invalid") && (
            <p className="form-error" role="alert">
              {status === "invalid" ? t("Contacts.invalid") : errorMessage || t("Contacts.error")}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
