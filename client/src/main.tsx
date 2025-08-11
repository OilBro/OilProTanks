import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
// The following commands are part of a script for managing repository changes and running the development server
// Ensure these commands are necessary for your use case

// Switch to the main branch
git checkout main  # or 'master'

// Stage all changes
git add -A

// Commit the changes with a message
git commit -m "chore: save current work" || true

// Apply the patch while fixing whitespace issues
git apply --whitespace=fix oilpro-whole-packet.patch

// Install the 'archiver' package
npm install archiver

// Run the development server
npm run dev
