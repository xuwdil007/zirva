import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import HelmetCursor from "./components/HelmetCursor";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "./styles.css";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <HelmetCursor />
  </React.StrictMode>,
);
