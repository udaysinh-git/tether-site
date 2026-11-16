<p align="center"><img src="assets/logo.svg" width="64" alt="Tether logo" /></p>

<h1 align="center">tether.udaysinh.me</h1>

<p align="center">The website for <a href="https://tether.udaysinh.me">Tether</a>, which lets Claude Code, Codex and any MCP agent use the browser tabs you share, signed in as you.</p>

<p align="center"><a href="https://tether.udaysinh.me">Visit the site</a> · <a href="https://tether.udaysinh.me/guide/">Guide</a> · <a href="https://discord.gg/DZNXsCySDD">Discord</a></p>

## What's here

A static site with no build step and no framework, served by GitHub Pages from `main` with the custom domain in `CNAME`.

```
index.html         home page: hero, live demos, setup player, safety, community, questions
guide/index.html   how to let Claude Code or Codex use your real browser
404.html
assets/
  site.css         layout, palette and motion
  site.js          the demos, setup player, questions and sounds
  bg.js            the drifting foil background (one WebGL shader)
  toast-stack.js   stacked toasts that fan out on hover
  sounds.js        short interface sounds made with the Web Audio API
  fonts/           Inter and Plus Jakarta Sans (OFL)
  og.png           link preview image
llms.txt           a short description of Tether for AI search tools
sitemap.xml, robots.txt
```

## Running it locally

```sh
python -m http.server 8765
```

Then open http://127.0.0.1:8765.

## Notes

- Every demo is plain DOM and CSS animated with springs; nothing loads from another site.
- Sounds play only for things a visitor does, and the speaker button in the header mutes them.
- Motion respects `prefers-reduced-motion`: the background draws one still frame and the demos stop moving.
- Structured data covers the app, the FAQ and the guide's steps, and `llms.txt` describes Tether for AI search.

Made by [Udaysinh Sapate](https://udaysinh.me) at [Kuro Labs](https://kurolabs.in).
