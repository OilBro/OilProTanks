import { createRoot } from "react-dom/client";
import App from "./App";
// Tailwind directives and custom design tokens combined
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
