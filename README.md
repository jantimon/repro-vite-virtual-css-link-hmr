# Vite 8.3: css HMR breaks for a virtual stylesheet loaded with `<link>`

A plugin serves a virtual stylesheet, `\0virtual:theme.css`. index.html loads it with a `<link>`, and there is no JS import.

On Vite 8.2.2, editing the source file swaps the stylesheet in place. On Vite 8.3.4, the new `<link>` points to `/heme.css?t=...`, so the page loses its styles.

We found this while working on [yak](https://github.com/DigitecGalaxus/next-yak), a CSS-in-JS library with a Vite plugin. With Qwik, every yak stylesheet is a virtual module loaded through a `<link>`, so every style edit broke the page.

## Try it

```sh
npm install
npm run dev        # vite 8.3.4
```

1. Open http://localhost:5173. The background is pink.
2. Change `theme.txt` from `hotpink` to `lightblue` and save.
3. The background turns white. The `<link>` now points to `/heme.css?t=...`.

Run the same steps on 8.2.2 to compare:

```sh
npm run dev:8.2    # vite 8.2.2, the background turns blue
```

## What goes over the websocket

```mermaid
sequenceDiagram
  participant B as Browser
  participant V as Vite dev server
  B->>V: GET /@id/__x00__virtual:theme.css
  Note over B,V: edit theme.txt
  V-->>B: css-update path "/@id/__x00__virtual:theme.css?direct" (8.2.2)
  B->>V: GET /@id/__x00__virtual:theme.css?t=... (works)
  V-->>B: css-update path "\0virtual:theme.css?direct" (8.3.4)
  B->>V: GET /heme.css?t=... (wrong url, styles gone)
```

8.2.2:

```json
{"type":"css-update","path":"/@id/__x00__virtual:theme.css?direct","acceptedPath":"/@id/__x00__virtual:theme.css?direct"}
```

8.3.4:

```json
{"type":"css-update","path":"\u0000virtual:theme.css?direct","acceptedPath":"\u0000virtual:theme.css?direct"}
```

The change is probably from https://github.com/vitejs/vite/pull/23172 (remove HmrUrl concept). It looks like `js-update` still handles the raw id, but `css-update` does not.

## Files

- `vite.config.js`: the plugin, about 20 lines. It has no HMR code of its own.
- `index.html`: the `<link>`.
- `theme.txt`: the color the stylesheet is built from.
