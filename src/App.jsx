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
  return (
    <>
      <a className="skip-link" href="#main">
        Перейти к содержимому
      </a>
      <Header />
      <main id="main">
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
