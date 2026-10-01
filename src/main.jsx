import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { useStore } from "./store";
import { initSound } from "./game/sound";

document.documentElement.lang = useStore.getState().lang;
initSound();

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <App />
    </StrictMode>
);
