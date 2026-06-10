import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SessionDetailPage from "./SessionDetailPage.jsx";
import "../../styles/global.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SessionDetailPage />
  </StrictMode>
);
