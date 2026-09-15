import os
import re
import sys
import shutil

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATES_DIR = os.path.join(ROOT_DIR, "templates")
IGNORE_DIRS = {
    ".git",
    ".agents",
    ".gemini",
    "node_modules",
    "scripts",
    "templates",
    "assets"
}

def titleize(name):
    return " ".join(word.capitalize() for word in re.split(r"[-_]", name))

def categorize_project(name):
    low = name.lower()
    if any(k in low for k in ["generator", "converter", "builder", "compressor"]):
        return "⚡ Generators & Converters"
    if any(k in low for k in ["calculator", "tracker", "timer", "finder"]):
        return "📊 Calculators & Trackers"
    if any(k in low for k in ["system", "portal", "dashboard", "management", "store"]):
        return "🏢 Systems, Portals & Apps"
    if any(k in low for k in ["demo", "game", "practice", "tutorial", "hub"]):
        return "🎓 Demos, Games & Practice Hubs"
    return "🛠️ Developer Utilities & Tools"

def extract_metadata(folder_path, folder_name):
    index_path = os.path.join(folder_path, "index.html")
    title = titleize(folder_name)
    description = f"A browser-based {title} web utility built with vanilla HTML, CSS, and JavaScript."

    if os.path.exists(index_path):
        try:
            with open(index_path, "r", encoding="utf-8", errors="ignore") as f:
                html = f.read()

            title_match = re.search(r"<title>([^<]+)</title>", html, re.IGNORECASE)
            if title_match:
                clean_title = title_match.group(1).split("|")[0].split("-")[0].strip()
                if clean_title:
                    title = clean_title

            desc_match = re.search(r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
            if desc_match:
                description = desc_match.group(1).strip()
        except Exception as e:
            print(f"Warn: could not parse metadata for {folder_name}: {e}")

    return title, description

def generate_project_readme(folder_name, folder_path, title, description, overwrite=False):
    readme_path = os.path.join(folder_path, "README.md")
    
    if os.path.exists(readme_path) and not overwrite:
        try:
            with open(readme_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            if len(content.strip()) > 150:
                print(f"Skipped (already detailed): {folder_name}/README.md")
                return
        except Exception:
            pass

    template_path = os.path.join(TEMPLATES_DIR, "README.template.md")
    if os.path.exists(template_path):
        with open(template_path, "r", encoding="utf-8") as f:
            template = f.read()
    else:
        template = "# {{PROJECT_TITLE}}\n\n{{PROJECT_DESCRIPTION}}\n"

    readme_content = (
        template.replace("{{PROJECT_TITLE}}", title)
        .replace("{{PROJECT_DESCRIPTION}}", description)
        .replace("{{PROJECT_DIR}}", folder_name)
    )

    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(readme_content)
    print(f"Generated README.md: {folder_name}/README.md")

def init_project(folder_name, custom_title=None):
    if not folder_name:
        print("Error: Please specify a project folder name.")
        print("Usage: python scripts/manage_md.py init <folder-name> [Title]")
        sys.exit(1)

    target_dir = os.path.join(ROOT_DIR, folder_name)
    if os.path.exists(target_dir):
        print(f"Directory '{folder_name}' already exists.")
    else:
        os.makedirs(target_dir, exist_ok=True)
        print(f"Created directory: {folder_name}")

    title = custom_title if custom_title else titleize(folder_name)
    description = f"A client-side web utility for {title}."

    index_path = os.path.join(target_dir, "index.html")
    if not os.path.exists(index_path):
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} | Web Tools Hub</title>
  <meta name="description" content="{description}">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>{title}</h1>
    <p>{description}</p>
  </div>
  <script src="script.js"></script>
</body>
</html>
"""
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"Created: {folder_name}/index.html")

    css_path = os.path.join(target_dir, "style.css")
    if not os.path.exists(css_path):
        css_content = """* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #0d1117;
  color: #e6edf3;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.container {
  max-width: 800px;
  width: 100%;
  background: #161b22;
  padding: 30px;
  border-radius: 12px;
  border: 1px solid #30363d;
}
"""
        with open(css_path, "w", encoding="utf-8") as f:
            f.write(css_content)
        print(f"Created: {folder_name}/style.css")

    js_path = os.path.join(target_dir, "script.js")
    if not os.path.exists(js_path):
        js_content = f"""document.addEventListener('DOMContentLoaded', () => {{
  console.log('{title} initialized.');
}});
"""
        with open(js_path, "w", encoding="utf-8") as f:
            f.write(js_content)
        print(f"Created: {folder_name}/script.js")

    generate_project_readme(folder_name, target_dir, title, description, overwrite=True)
    rebuild_index()

def generate_all_readmes():
    count = 0
    for entry in sorted(os.listdir(ROOT_DIR)):
        folder_path = os.path.join(ROOT_DIR, entry)
        if os.path.isdir(folder_path) and entry not in IGNORE_DIRS:
            title, description = extract_metadata(folder_path, entry)
            generate_project_readme(entry, folder_path, title, description, overwrite=False)
            count += 1
    print(f"\nProcess complete. Processed {count} project directories.")

def rebuild_index():
    categories = {}
    total_projects = 0

    for entry in sorted(os.listdir(ROOT_DIR)):
        folder_path = os.path.join(ROOT_DIR, entry)
        if os.path.isdir(folder_path) and entry not in IGNORE_DIRS:
            title, description = extract_metadata(folder_path, entry)
            category = categorize_project(entry)
            if category not in categories:
                categories[category] = []

            has_readme = os.path.exists(os.path.join(folder_path, "README.md"))
            has_index = os.path.exists(os.path.join(folder_path, "index.html"))

            categories[category].append({
                "folder_name": entry,
                "title": title,
                "description": description,
                "has_readme": has_readme,
                "has_index": has_index
            })
            total_projects += 1

    index_content = f"""# 📚 Workspace Project Index & Documentation Hub

Welcome to the central index for all **{total_projects}** client-side tools, apps, and developer utilities in this repository.

---

## 🧭 Navigation Categories\n\n"""

    sorted_cats = sorted(categories.keys())
    for cat in sorted_cats:
        slug = re.sub(r"[^a-z0-9]", "-", cat.lower())
        index_content += f"- [{cat}](#{slug})\n"

    index_content += "\n---\n\n"

    for cat in sorted_cats:
        index_content += f"### {cat}\n\n"
        index_content += "| Project Name | Description | Live Demo | Docs |\n"
        index_content += "| :--- | :--- | :---: | :---: |\n"

        projects = sorted(categories[cat], key=lambda x: x["title"])
        for proj in projects:
            folder_encoded = proj["folder_name"].replace(" ", "%20")
            live_link = f"[Launch App](./{folder_encoded}/index.html)" if proj["has_index"] else "N/A"
            doc_link = f"[README](./{folder_encoded}/README.md)" if proj["has_readme"] else "N/A"
            desc_clean = proj["description"].replace("|", "-")
            index_content += f"| **{proj['title']}** | {desc_clean} | {live_link} | {doc_link} |\n"

        index_content += "\n"

    index_content += "---\n\n*Last updated automatically via `scripts/manage_md.py`.*\n"

    index_path = os.path.join(ROOT_DIR, "PROJECT_INDEX.md")
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(index_content)
    print(f"Successfully updated: PROJECT_INDEX.md")

if __name__ == "__main__":
    args = sys.argv[1:]
    command = args[0] if len(args) > 0 else "help"

    if command == "init":
        folder = args[1] if len(args) > 1 else None
        custom_title = args[2] if len(args) > 2 else None
        init_project(folder, custom_title)
    elif command == "generate-all":
        generate_all_readmes()
        rebuild_index()
    elif command == "index":
        rebuild_index()
    else:
        print("""
Usage:
  python scripts/manage_md.py init <folder-name> [Title]  - Initialize a new project with standard files & README
  python scripts/manage_md.py generate-all                 - Scaffold missing README.md files for all projects
  python scripts/manage_md.py index                        - Rebuild PROJECT_INDEX.md catalog
""")
