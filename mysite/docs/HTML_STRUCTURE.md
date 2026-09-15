# 🏗️ HTML Structure & Markup Standards

This document establishes the HTML standards, SEO meta tags, SVG favicon structures, and structured data schemas required for all tools.

---

## 1. Document Boilerplate

Every tool `index.html` must begin with the standard boilerplate:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tool Name | Vyunix Tools</title>
  <meta name="description" content="Clear, concise description of tool purpose (max 160 characters).">
  <meta name="keywords" content="Tool Name, Client-Side, Free Web Tool, Vyunix">
  <meta name="robots" content="index, follow">
  
  <!-- OpenGraph Metadata -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="Tool Name | Vyunix Tools">
  <meta property="og:description" content="Tool description here.">
  
  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  
  <!-- Stylesheet -->
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="app-container">
    <!-- Application content -->
  </main>
  
  <script src="script.js"></script>
</body>
</html>
```

---

## 2. Semantic HTML Elements

- Use `<header>`, `<main>`, `<section>`, `<article>`, `<nav>`, and `<footer>` rather than unsemantic nested `<div>` elements.
- Form controls must always be associated with a explicit `<label for="...">` tag for accessibility.
- Headings must follow strict visual & accessibility hierarchy (`<h1>` for title, `<h2>` for section headers, `<h3>` for cards).

---

## 3. Inline SVG Favicons

Projects should include a lightweight SVG favicon (`favicon.svg`) or inline data URI favicon for branding and modern crisp rendering across high-DPI displays.
