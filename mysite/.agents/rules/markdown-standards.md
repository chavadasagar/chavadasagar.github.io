# Markdown & Project Scaffolding Standards

This rule governs the creation, structure, and management of Markdown (`.md`) documentation across all projects in this repository.

---

## 📌 Rules for Creating New Projects

When adding a new sub-project or tool to this repository:

1. **Required Files**: Every project folder MUST contain the following 4 essential files:
   - `index.html` (Application UI)
   - `style.css` (Styles)
   - `script.js` (Application Logic)
   - `README.md` (Documentation)

2. **Automated Scaffolding**: Use the helper CLI script whenever possible to scaffold new projects:
   ```bash
   node scripts/manage-md.js init <project-folder-name> "Optional Project Title"
   ```

3. **Standard `README.md` Structure**:
   - Every `README.md` should follow the structure defined in `templates/README.template.md`.
   - Must include: Title, Overview/Description, Features, Tech Stack, How to Run Locally, and Browser Compatibility.

4. **Updating the Project Index**:
   - Whenever a project is added or modified, update the central index by running:
   ```bash
   node scripts/manage-md.js index
   ```
