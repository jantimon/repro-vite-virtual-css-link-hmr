import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// A virtual stylesheet built from theme.txt.
// index.html loads it with a <link>, there is no JS import.
const themeFile = resolve(import.meta.dirname, "theme.txt");

export default {
  plugins: [
    {
      name: "virtual-theme-css",
      // the <link> request arrives as "virtual:theme.css?direct", so keep the query
      resolveId(id) {
        if (id.startsWith("virtual:theme.css")) return "\0" + id;
      },
      load(id) {
        if (!id.startsWith("\0virtual:theme.css")) return;
        const color = readFileSync(themeFile, "utf8").trim();
        return `body { background: ${color}; }`;
      },
      // so that editing theme.txt updates the stylesheet
      transform(code, id) {
        if (id.startsWith("\0virtual:theme.css")) this.addWatchFile(themeFile);
      },
    },
  ],
};
