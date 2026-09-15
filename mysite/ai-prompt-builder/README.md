# Banana Prompt Builder — Asset-Free Edition

A self-contained, browser-only AI art-direction and prompt-building tool for Generic AI image models, Midjourney, Stable Diffusion / FLUX, and DALL-E / GPT Image.

## What changed in this edition

- **No image asset dependency** — option cards no longer rely on `images/*.png` files.
- **No remote preview dependency** — direct-prompt cards no longer load Unsplash images.
- **No source-image requirement** — character/reference URL input is replaced with text-based **Identity / Subject Notes**.
- **Semantic visual selectors** — CSS gradients + lightweight symbols provide fast visual scanning without network/filesystem assets.
- **Prompt Engine v2** — prompts follow a stronger hierarchy: subject → composition → environment → lighting → camera → visual finish.
- **Platform-aware formatting**:
  - Generic: clean natural-language art direction.
  - Midjourney: compact prompt + aspect ratio + `--style raw` + negative exclusions.
  - Stable Diffusion / FLUX: positive and negative prompt blocks.
  - DALL-E / GPT Image: natural-language brief with frame instructions.
- **Prompt detail control** — Compact, Pro Balanced, or Detailed.
- **Aspect ratio control** — 1:1, 4:5, 3:2, 16:9, 9:16.
- **Avoid / Negative Notes** — user-defined artifacts or visual traits to exclude.
- Existing quick presets, advanced workflow, favorites, history, share links, and localStorage workflow remain client-side.

## Technology

- HTML5
- CSS3
- Vanilla JavaScript (ES6+)
- localStorage

No framework, build system, image pack, backend, or API key is required.

## Run locally

Open `index.html` directly in a modern browser, or serve the folder with any static server:

```bash
npx serve .
```

## File structure

```text
ai-prompt-builder/
├── index.html
├── favicon.svg
└── README.md
```

## Browser support

- Google Chrome / Microsoft Edge / Brave
- Mozilla Firefox
- Safari (macOS / iOS)
