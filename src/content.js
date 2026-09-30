import defaults from "../backend/content/default.json";

export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
let content = defaults;
const listeners = new Set();
export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const snapshot = () => content;
export const t = (key) => content[key]?.value ?? defaults[key]?.value ?? "";
export function asset(key) {
  const path = t(key);
  return path.startsWith("/media/")
    ? `${API_URL}${path}`
    : `${import.meta.env.BASE_URL}${path}`;
}
export async function refreshContent(signal) {
  try {
    const response = await fetch(`${API_URL}/api/content`, { signal });
    if (!response.ok) return;
    const data = await response.json();
    content = { ...defaults, ...data.content };
    document.title = t("seo.title");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t("seo.description"));
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.href = asset("images.logo");
      favicon.removeAttribute("type");
    }
    listeners.forEach((listener) => listener());
  } catch {}
}
