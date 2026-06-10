import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SettingsPage from "./SettingsPage.jsx";
import "../../styles/global.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SettingsPage />
  </StrictMode>
);
