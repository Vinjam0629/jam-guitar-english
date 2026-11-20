import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Project site, not a user site. A base of "/" breaks JS and CSS on GitHub Pages.
export default defineConfig({
  base: "/jam-guitar-english/",
  plugins: [react()],
});
