# Sagar Chavda — Personal Portfolio

A modern, responsive personal portfolio for a .NET Software Engineer. Built with semantic HTML, modular CSS, and vanilla JavaScript — no framework or build step required.

## Improvements in this version

- Recruiter-friendly hero and information hierarchy
- Responsive desktop/tablet/mobile navigation
- Dark/light theme with saved preference
- Cleaner skills, experience, project, education and contact sections
- Resume preview on desktop with mobile-safe PDF fallback
- Scroll progress and active navigation state
- Accessible semantic markup, keyboard-friendly controls and skip link
- `prefers-reduced-motion` support
- CSS and JavaScript separated from HTML for maintainability
- SEO description and theme metadata
- No JavaScript framework or external UI library

## Run locally

Open `index.html` directly, or serve the folder with any static server:

```bash
npx serve .
```

## Structure

```text
personal-portfolio-improved/
├── assets/
│   ├── favicon.svg
│   └── sagar.JPG
├── index.html
├── styles.css
├── script.js
└── README.md
```

## Notes

The resume preview points to the existing hosted PDF URL. Update `resumeUrl` in `script.js` and the matching resume links in `index.html` if the PDF location changes.
