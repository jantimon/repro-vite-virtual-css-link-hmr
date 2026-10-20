# Vite 8.3: css HMR breaks for a virtual stylesheet loaded with `<link>`

Editing the source of a virtual stylesheet that the page loads with a `<link>` worked on Vite 8.2.2. On 8.3.4 the page loses its styles instead.

## The setup

`index.html` stands in for a page an SSR framework renders in dev. The server writes a `<link>` for each stylesheet the page uses, and no client JS imports the css. Qwik works this way, for example. So the page loads the virtual stylesheet only through this tag:

```html
<link rel="stylesheet" href="/@id/__x00__virtual:theme.css" />
```

A plugin in `vite.config.js` builds that stylesheet from `theme.txt`, a file that holds one color (`hotpink`). The plugin has no HMR code of its own:

```js
resolveId(id) {
  if (id.startsWith("virtual:theme.css")) return "\0" + id;
},
load(id) {
  if (!id.startsWith("\0virtual:theme.css")) return;
  const color = readFileSync(themeFile, "utf8").trim();
  return `body { background: ${color}; }`;
},
transform(code, id) {
  if (id.startsWith("\0virtual:theme.css")) this.addWatchFile(themeFile);
},
```

## 8.2.2 vs 8.3.4

What happens when you change `theme.txt` from `hotpink` to `lightblue`:

|                   | 8.2.2                                  | 8.3.4                        |
| ----------------- | -------------------------------------- | ---------------------------- |
| `css-update` path | `/@id/__x00__virtual:theme.css?direct` | `\0virtual:theme.css?direct` |
| new `<link href>` | `/@id/__x00__virtual:theme.css?t=...`  | `/heme.css?t=...`            |
| background        | turns blue                             | gone                         |

The change is probably from https://github.com/vitejs/vite/pull/23172 (remove HmrUrl concept). It looks like `js-update` still handles the raw id, but `css-update` does not.

## When does it happen

Both have to be true:

1. The browser loads the stylesheet through a `<link>` tag, for example one the server renders during SSR in dev.
2. The stylesheet is a virtual module whose id starts with `\0`.

CSS imported from JS is fine, because it goes through `js-update`. A `<link>` to a real `.css` file is fine too.

## Try it

```sh
npm install
npm run dev        # vite 8.3.4
npm run dev:8.2    # vite 8.2.2, same project
```

Open http://localhost:5173, then change `theme.txt` from `hotpink` to `lightblue` and save.

## Where we found it

We found this while working on [yak](https://github.com/DigitecGalaxus/next-yak), a CSS-in-JS library with a Vite plugin. With Qwik, every yak stylesheet is a virtual module loaded through a `<link>`, so every style edit broke the page.
