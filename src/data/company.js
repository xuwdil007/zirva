import { t, asset } from "../content";
export function getCompany() {
  return {
    phone: t("Company.1"),
    phoneHref: "tel:+992988365504",
    email: t("Company.2"),
    address: t("Company.3"),
  };
}
export function getNavigation() {
  return [
    { href: "#about", label: t("Company.4") },
    { href: "#expertise", label: t("Company.5") },
    { href: "#approach", label: t("Company.6") },
    { href: "#values", label: t("Company.7") },
  ];
}
export function getServices() {
  return [
    {
      id: "01",
      title: t("Company.8"),
      category: t("Company.9"),
      image: asset("images.image-804.jpeg"),
      description: t("Company.10"),
      details: [t("Company.11"), t("Company.12"), t("Company.13")],
    },
    {
      id: "02",
      title: t("Company.14"),
      category: t("Company.15"),
      image: asset("images.image-819.jpeg"),
      description: t("Company.16"),
      details: [t("Company.17"), t("Company.18"), t("Company.19")],
    },
    {
      id: "03",
      title: t("Company.20"),
      category: t("Company.21"),
      image: asset("images.image-827.jpeg"),
      description: t("Company.22"),
      details: [t("Company.23"), t("Company.24"), t("Company.25")],
    },
  ];
}
export function getValues() {
  return [
    { icon: "shield", title: t("Company.26"), text: t("Company.27") },
    { icon: "badge", title: t("Company.28"), text: t("Company.29") },
    { icon: "ruler", title: t("Company.30"), text: t("Company.31") },
    { icon: "zap", title: t("Company.32"), text: t("Company.33") },
    { icon: "target", title: t("Company.34"), text: t("Company.35") },
    { icon: "building", title: t("Company.36"), text: t("Company.37") },
  ];
}
export function getSteps() {
  return [
    { title: t("Company.38"), text: t("Company.39") },
    { title: t("Company.40"), text: t("Company.41") },
    { title: t("Company.42"), text: t("Company.43") },
    { title: t("Company.44"), text: t("Company.45") },
  ];
}
