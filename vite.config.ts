import type { Plugin } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function manifestPlugin(): Plugin {
  let resolvedBase = "/";

  const buildManifest = () => {
    const manifestBase = resolvedBase === "/" ? "./" : resolvedBase;

    return JSON.stringify(
      {
        name: "Kochi Metro Connect Feeder Bus Finder",
        short_name: "Kochi Metro Feeder",
        id: manifestBase,
        description: "Kochi Metro Connect feeder bus timings, route maps, and nearby stop helper.",
        start_url: manifestBase,
        scope: manifestBase,
        display: "standalone",
        background_color: "#06141f",
        theme_color: "#0ea5e9",
        icons: [
          {
            src: `${manifestBase}favicon-192.png`,
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: `${manifestBase}favicon-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          }
        ],
        screenshots: [
          {
            src: `${manifestBase}screenshot-wide.png`,
            sizes: "1280x720",
            type: "image/png",
            form_factor: "wide",
            label: "Desktop view showing feeder bus timings and route helpers"
          },
          {
            src: `${manifestBase}screenshot-mobile.jpg`,
            sizes: "720x1280",
            type: "image/jpeg",
            label: "Mobile view showing feeder bus timings and nearby stop access"
          }
        ]
      },
      null,
      2
    );
  };

  return {
    name: "dynamic-site-manifest",
    configResolved(config) {
      resolvedBase = config.base;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const requestUrl = req.url?.split("?")[0] ?? "";
        const manifestPath = `${resolvedBase}site.webmanifest`;
        if (requestUrl === "/site.webmanifest" || requestUrl === manifestPath) {
          res.setHeader("Content-Type", "application/manifest+json");
          res.end(buildManifest());
          return;
        }
        next();
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "site.webmanifest",
        source: buildManifest()
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), manifestPlugin()],
  base:
    process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_REPOSITORY
      ? `/${process.env.GITHUB_REPOSITORY.split("/")[1]}/`
      : "/"
});
