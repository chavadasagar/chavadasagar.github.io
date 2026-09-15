# 📁 Project Architecture & File Conventions

This document specifies the architectural conventions, file organization, and automation tooling of the repository.

---

## 1. Directory Blueprint

```text
mysite/
├── index.html                 # Main landing hub for all tools
├── README.md                  # Root documentation overview
├── AGENTS.md                  # AI Assistant Entry Point
├── PROJECT_INDEX.md           # Master directory of all 56+ sub-projects
│
├── docs/                      # Central Guidelines & Rules
│   ├── RULES.md               # Development & Coding Rules
│   ├── DESIGN.md              # UI/UX & Styling Standards
│   ├── HTML_STRUCTURE.md      # Markup Standards
│   ├── ARCHITECTURE.md        # Architecture & Folder Structure (This file)
│   ├── CONTENT.md             # Content & Copywriting Guidelines
│   ├── COMMIT.md              # Git Commit Message Conventions
│   └── CHANGELOG.md           # Repository Changelog
│
├── scripts/                   # Management & Scaffolding Scripts
│   ├── manage_md.py           # Python Manager CLI
│   └── manage-md.js           # Node.js Manager CLI
│
├── templates/                 # Reusable Markdown Templates
│   └── README.template.md     # Standard Sub-project README template
│
└── [sub-project-folder]/      # Sub-project Directory
    ├── index.html             # UI markup
    ├── style.css              # Custom styling
    ├── script.js              # Application logic
    └── README.md              # Sub-project documentation
```

---

## 2. Standard Sub-project Folder Rules

1. Every sub-project folder MUST be named in lower-case kebab-case (e.g. `age-calculator`, `image-compressor`, `ai-prompt-builder`).
2. Every sub-project MUST contain:
   - `index.html`
   - `style.css`
   - `script.js`
   - `README.md`
3. Sub-projects should operate independently without cross-directory relative path imports unless pointing to shared assets (`/assets/...`).
4. Every completed sub-project MUST be registered in `index.html` inside the `projects` array (`{ name: "Project Name", href: "<folder-name>/index.html", cat: "System", abbr: "SYS" }`).

---

## 3. Automation Tooling

The repository includes CLI management scripts in `scripts/`:

- **Python script**: `python scripts/manage_md.py`
- **Node script**: `node scripts/manage-md.js`

Commands supported:
- `init <folder-name> [Title]`: Scaffolds a new project folder and auto-generates files.
- `generate-all`: Scans all folders and creates missing `README.md` files based on HTML metadata.
- `index`: Rebuilds `PROJECT_INDEX.md` dynamically.
