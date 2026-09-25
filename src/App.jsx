import { useRef } from "react";
import useScrollReveal from "./hooks/useScrollReveal";
import Header from "./components/Header";
import Hero from "./components/Hero";
import About from "./components/About";
import Expertise from "./components/Expertise";
import Mission from "./components/Mission";
import Approach from "./components/Approach";
import Values from "./components/Values";
import Contacts from "./components/Contacts";
import Footer from "./components/Footer";
export default function App() {
  const mainRef = useRef(null);
  useScrollReveal(mainRef);

  return (
    <>
      <a className="skip-link" href="#main">
        Перейти к содержимому
      </a>
      <Header />
      <main id="main" ref={mainRef}>
        <Hero />
        <About />
        <Expertise />
        <Mission />
        <Approach />
        <Values />
        <Contacts />
      </main>
      <Footer />
    </>
  );
}
