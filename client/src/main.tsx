import { createRoot } from "react-dom/client";
import App from "./App";
// Tailwind layers (base/components/utilities)
import "./tailwind.css";
// Custom design tokens and overrides
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
