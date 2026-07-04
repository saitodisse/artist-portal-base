import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import portal from "./portal.config.ts";

const site = process.env.PUBLIC_SITE_URL || portal.siteUrl;
const base = process.env.PUBLIC_BASE_PATH || portal.basePath || "/";

export default defineConfig({
  site,
  base,
  output: "static",
  integrations: [react()],
});
