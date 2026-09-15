# 🤖 AGENTS.md — AI Entry Point & Guidelines

Welcome, AI Assistant! This document serves as your primary entry point and instructions manual when operating inside this repository (`chavadasagar.github.io/mysite`).

---

## 🎯 Core Operating Principles

1. **Client-Side Privacy First**: All tools and utilities in this repository are 100% client-side web applications. Never introduce external backend dependencies or server-side data uploads unless explicitly requested.
2. **Vanilla Web Stack Default**: Default to HTML5, CSS3, and Vanilla JavaScript (ES6+). Avoid unnecessary framework overhead (React/Vue/Angular) unless the sub-project explicitly uses them.
3. **Consistency & Quality**: Every tool must have clean responsive UI, mobile compatibility, accessible markup, and complete documentation.
4. **No Automatic Git Push**: NEVER execute `git push` automatically or without explicit user permission under ANY condition. Stage and commit changes locally if needed, but ONLY perform `git push` when the user explicitly instructs you to push (e.g., "push kar do", "commit aur push karo").

---

## 📁 Repository Structure Overview

```text
mysite/
├── README.md                 # Root Repository Overview
├── AGENTS.md                 # AI Entry Point (This File)
├── PROJECT_INDEX.md          # Generated Master Catalog of all sub-projects
│
├── docs/                     # Core Workspace Standards
│   ├── RULES.md              # Development & Coding Rules
│   ├── DESIGN.md             # UI/UX & Design System Guidelines
│   ├── HTML_STRUCTURE.md     # HTML Markup & Structured Data Specs
│   ├── ARCHITECTURE.md       # Architecture & File Layout Conventions
│   ├── CONTENT.md            # Content & Copywriting Guidelines
│   ├── COMMIT.md             # Git Commit Message Conventions
│   └── CHANGELOG.md          # Workspace Change Log
│
├── scripts/                  # Scaffolding & Indexing Scripts
│   ├── manage_md.py          # Python Manager CLI
│   └── manage-md.js          # Node.js Manager CLI
│
└── [56+ Sub-projects]/       # Sub-project directories
```

---

## 🛠️ Required Workflow for AI Tasks

### 1. Creating a New Tool / Sub-project
When asked to build a new tool or application:
1. Always run or follow the scaffolding command:
   ```bash
   python scripts/manage_md.py init <project-name> "Project Title"
   ```
2. Ensure the sub-project directory contains all 4 standard files:
   - `index.html` (Application markup with semantic HTML and OpenGraph/SEO meta)
   - `style.css` (Clean CSS using CSS variables and dark theme)
   - `script.js` (Modular JS code wrapped in DOMContentLoaded)
   - `README.md` (Project overview following `templates/README.template.md`)
3. Register the new sub-project in `index.html` inside the `projects` array:
   ```javascript
   { name: "Project Title", href: "<project-name>/index.html", cat: "System", abbr: "SYS" }
   ```
4. Rebuild `PROJECT_INDEX.md` after completion:
   ```bash
   python scripts/manage_md.py index
   ```

### 2. Modifying an Existing Sub-project
1. Inspect existing files before editing to maintain code style and UI consistency.
2. Update the sub-project's `README.md` if new features, options, or keyboard shortcuts are added.
3. Ensure no existing API contracts or local storage keys break unexpectedly.

---

## 📖 Mandatory Reference Documents

Before taking major actions, refer to the detailed guidelines in the `docs/` folder:

- 📏 **Development Rules**: [docs/RULES.md](./docs/RULES.md)
- 🎨 **UI/UX Design Rules**: [docs/DESIGN.md](./docs/DESIGN.md)
- 🏗️ **HTML Structure Rules**: [docs/HTML_STRUCTURE.md](./docs/HTML_STRUCTURE.md)
- 📁 **Architecture Rules**: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- ⚠️ **Mistakes & Lessons Prevention Guide**: [docs/MISTAKES.md](./docs/MISTAKES.md)
- ✍️ **Content Guidelines**: [docs/CONTENT.md](./docs/CONTENT.md)
- 🔄 **Git Commit Rules**: [docs/COMMIT.md](./docs/COMMIT.md)
- 📋 **Change Log**: [docs/CHANGELOG.md](./docs/CHANGELOG.md)
