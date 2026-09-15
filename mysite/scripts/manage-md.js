const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(ROOT_DIR, 'templates');
const IGNORE_DIRS = new Set([
  '.git',
  '.agents',
  '.gemini',
  'node_modules',
  'scripts',
  'templates',
  'assets'
]);

// Helper to format directory name into readable title
function titleize(str) {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Categorize project based on name
function categorizeProject(folderName) {
  const name = folderName.toLowerCase();
  if (name.includes('generator') || name.includes('converter') || name.includes('builder') || name.includes('compressor')) {
    return '⚡ Generators & Converters';
  }
  if (name.includes('calculator') || name.includes('tracker') || name.includes('timer') || name.includes('finder')) {
    return '📊 Calculators & Trackers';
  }
  if (name.includes('system') || name.includes('portal') || name.includes('dashboard') || name.includes('management') || name.includes('store')) {
    return '🏢 Systems, Portals & Apps';
  }
  if (name.includes('demo') || name.includes('game') || name.includes('practice') || name.includes('tutorial') || name.includes('hub')) {
    return '🎓 Demos, Games & Practice Hubs';
  }
  return '🛠️ Developer Utilities & Tools';
}

// Extract Title & Description from index.html if present
function extractMetadata(folderPath, folderName) {
  const indexPath = path.join(folderPath, 'index.html');
  let title = titleize(folderName);
  let description = `A browser-based ${titleize(folderName)} web utility built with vanilla HTML, CSS, and JavaScript.`;

  if (fs.existsSync(indexPath)) {
    try {
      const html = fs.readFileSync(indexPath, 'utf8');
      
      // Extract <title>
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        let cleanTitle = titleMatch[1].split('|')[0].split('-')[0].trim();
        if (cleanTitle) title = cleanTitle;
      }

      // Extract <meta name="description">
      const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
      if (descMatch && descMatch[1]) {
        description = descMatch[1].trim();
      }
    } catch (err) {
      console.warn(`Could not parse metadata for ${folderName}:`, err.message);
    }
  }

  return { title, description };
}

// Command: Init a new project directory with standard files
function initProject(folderName, customTitle) {
  if (!folderName) {
    console.error('Error: Please specify a project folder name.');
    console.log('Usage: node scripts/manage-md.js init <folder-name> [Title]');
    process.exit(1);
  }

  const targetDir = path.join(ROOT_DIR, folderName);
  if (fs.existsSync(targetDir)) {
    console.log(`Directory '${folderName}' already exists.`);
  } else {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`Created directory: ${folderName}`);
  }

  const title = customTitle || titleize(folderName);
  const description = `A client-side web utility for ${title}.`;

  // Create index.html if missing
  const indexPath = path.join(targetDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Web Tools Hub</title>
  <meta name="description" content="${description}">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <p>${description}</p>
  </div>
  <script src="script.js"></script>
</body>
</html>
`;
    fs.writeFileSync(indexPath, htmlContent, 'utf8');
    console.log(`Created: ${folderName}/index.html`);
  }

  // Create style.css if missing
  const cssPath = path.join(targetDir, 'style.css');
  if (!fs.existsSync(cssPath)) {
    const cssContent = `* {
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
`;
    fs.writeFileSync(cssPath, cssContent, 'utf8');
    console.log(`Created: ${folderName}/style.css`);
  }

  // Create script.js if missing
  const jsPath = path.join(targetDir, 'script.js');
  if (!fs.existsSync(jsPath)) {
    const jsContent = `document.addEventListener('DOMContentLoaded', () => {
  console.log('${title} initialized.');
});
`;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
    console.log(`Created: ${folderName}/script.js`);
  }

  // Generate README.md
  generateProjectReadme(folderName, targetDir, title, description, true);

  // Update Index
  rebuildIndex();
}

// Helper to generate a project's README.md
function generateProjectReadme(folderName, folderPath, title, description, overwrite = false) {
  const readmePath = path.join(folderPath, 'README.md');

  if (fs.existsSync(readmePath) && !overwrite) {
    const content = fs.readFileSync(readmePath, 'utf8');
    // If README has substantial content (> 150 chars), skip unless overwrite
    if (content.trim().length > 150) {
      console.log(`Skipped (already exists): ${folderName}/README.md`);
      return;
    }
  }

  let template = '';
  const templatePath = path.join(TEMPLATES_DIR, 'README.template.md');
  if (fs.existsSync(templatePath)) {
    template = fs.readFileSync(templatePath, 'utf8');
  } else {
    template = `# {{PROJECT_TITLE}}\n\n{{PROJECT_DESCRIPTION}}\n`;
  }

  const readmeContent = template
    .replace(/\{\{PROJECT_TITLE\}\}/g, title)
    .replace(/\{\{PROJECT_DESCRIPTION\}\}/g, description)
    .replace(/\{\{PROJECT_DIR\}\}/g, folderName);

  fs.writeFileSync(readmePath, readmeContent, 'utf8');
  console.log(`Generated README.md: ${folderName}/README.md`);
}

// Command: Generate missing README.md files for all sub-projects
function generateAllReadmes() {
  const entries = fs.readdirSync(ROOT_DIR, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    if (entry.isDirectory() && !IGNORE_DIRS.has(entry.name)) {
      const folderName = entry.name;
      const folderPath = path.join(ROOT_DIR, folderName);
      const { title, description } = extractMetadata(folderPath, folderName);
      
      generateProjectReadme(folderName, folderPath, title, description, false);
      count++;
    }
  }
  console.log(`Process complete. Processed ${count} project directories.`);
}

// Command: Rebuild central PROJECT_INDEX.md
function rebuildIndex() {
  const entries = fs.readdirSync(ROOT_DIR, { withFileTypes: true });
  const categories = {};

  for (const entry of entries) {
    if (entry.isDirectory() && !IGNORE_DIRS.has(entry.name)) {
      const folderName = entry.name;
      const folderPath = path.join(ROOT_DIR, folderName);
      const { title, description } = extractMetadata(folderPath, folderName);
      const category = categorizeProject(folderName);

      if (!categories[category]) {
        categories[category] = [];
      }

      const hasReadme = fs.existsSync(path.join(folderPath, 'README.md'));
      const hasIndex = fs.existsSync(path.join(folderPath, 'index.html'));

      categories[category].push({
        folderName,
        title,
        description,
        hasReadme,
        hasIndex
      });
    }
  }

  let indexContent = `# 📚 Workspace Project Index & Documentation Hub

Welcome to the central index for all **${Object.values(categories).reduce((acc, list) => acc + list.length, 0)}** client-side tools, apps, and developer utilities in this repository.

---

## 🧭 Navigation Categories\n\n`;

  const sortedCategories = Object.keys(categories).sort();

  for (const cat of sortedCategories) {
    indexContent += `- [${cat}](#${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')})\n`;
  }

  indexContent += `\n---\n\n`;

  for (const cat of sortedCategories) {
    indexContent += `### ${cat}\n\n`;
    indexContent += `| Project Name | Description | Live Demo | Docs |\n`;
    indexContent += `| :--- | :--- | :---: | :---: |\n`;

    const projects = categories[cat].sort((a, b) => a.title.localeCompare(b.title));
    for (const proj of projects) {
      const liveLink = proj.hasIndex ? `[Launch App](./${encodeURIComponent(proj.folderName)}/index.html)` : 'N/A';
      const docLink = proj.hasReadme ? `[README](./${encodeURIComponent(proj.folderName)}/README.md)` : 'N/A';
      
      indexContent += `| **${proj.title}** | ${proj.description.replace(/\|/g, '-')} | ${liveLink} | ${docLink} |\n`;
    }
    indexContent += `\n`;
  }

  indexContent += `---\n\n*Last updated automatically via \`scripts/manage-md.js\`.*\n`;

  const indexPath = path.join(ROOT_DIR, 'PROJECT_INDEX.md');
  fs.writeFileSync(indexPath, indexContent, 'utf8');
  console.log(`Successfully updated: PROJECT_INDEX.md`);
}

// CLI Command Switcher
const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

switch (command) {
  case 'init':
    initProject(arg1, arg2);
    break;
  case 'generate-all':
    generateAllReadmes();
    rebuildIndex();
    break;
  case 'index':
    rebuildIndex();
    break;
  default:
    console.log(`
Usage:
  node scripts/manage-md.js init <folder-name> [Title]  - Initialize a new project with standard files & README
  node scripts/manage-md.js generate-all                 - Scaffold missing README.md files for all projects
  node scripts/manage-md.js index                        - Rebuild PROJECT_INDEX.md catalog
`);
    break;
}
