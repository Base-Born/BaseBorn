import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./styles/menu.css";
import "./styles/hud.css";
import "./styles/core-upgrades.css";
import "./styles/evolution-panel.css";
import "./styles/leaderboard.css";
import "./game/ui/design/theme.css";
import "./game/ui/design/adaptive.css";
import "./game/ui/build/build-identity.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
