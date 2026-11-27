import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// dentro un iframe (itch.io, embed di terzi) la pagina esterna non scorre:
// il foglio deve scorrere da solo, altrimenti i pannelli in basso sono irraggiungibili
if (window.self !== window.top) {
  document.documentElement.classList.add("is-embedded");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
