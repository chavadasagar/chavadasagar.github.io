/**
 * Live Sandbox Code Playground for TutorialStudio
 */
document.addEventListener('DOMContentLoaded', () => {
  const htmlEditor = document.getElementById('htmlEditor');
  const cssEditor = document.getElementById('cssEditor');
  const jsEditor = document.getElementById('jsEditor');
  const previewFrame = document.getElementById('previewFrame');
  const consoleLogs = document.getElementById('consoleLogs');
  const templateSelect = document.getElementById('templateSelect');
  const btnRun = document.getElementById('btnRunCode');
  const btnClearConsole = document.getElementById('btnClearConsole');

  const templates = {
    starter: {
      html: `<!-- HTML Starter Template -->\n<div class="card">\n  <h2>Hello, Developer! 🚀</h2>\n  <p>Welcome to the TutorialStudio Interactive Sandbox.</p>\n  <button id="btnAction" class="glow-btn">Click Me!</button>\n  <p id="outputMsg" class="highlight-text"></p>\n</div>`,
      css: `body {\n  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;\n  background: #0F172A;\n  color: #F8FAFC;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 100vh;\n  margin: 0;\n}\n\n.card {\n  background: #1E293B;\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  border-radius: 16px;\n  padding: 2.5rem;\n  text-align: center;\n  box-shadow: 0 10px 30px rgba(0,0,0,0.4);\n  max-width: 380px;\n}\n\n.glow-btn {\n  background: linear-gradient(135deg, #6366F1, #8B5CF6);\n  color: #fff;\n  border: none;\n  padding: 0.75rem 1.5rem;\n  font-size: 1rem;\n  font-weight: 600;\n  border-radius: 8px;\n  cursor: pointer;\n  transition: transform 0.2s, box-shadow 0.2s;\n  margin-top: 1rem;\n}\n\n.glow-btn:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.5);\n}\n\n.highlight-text {\n  margin-top: 1.25rem;\n  font-weight: 600;\n  color: #34D399;\n}`,
      js: `// Interactive JavaScript\nconst btn = document.getElementById('btnAction');\nconst output = document.getElementById('outputMsg');\nlet count = 0;\n\nbtn.addEventListener('click', () => {\n  count++;\n  output.textContent = \`Button clicked \${count} times! 🎉\`;\n  console.log('User interacted! Current count:', count);\n});`
    },
    flexbox: {
      html: `<div class="container">\n  <div class="box">Box 1</div>\n  <div class="box">Box 2</div>\n  <div class="box">Box 3</div>\n  <div class="box">Box 4</div>\n</div>`,
      css: `body { background: #0B0F19; margin: 0; padding: 2rem; font-family: sans-serif; }\n\n.container {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 1.5rem;\n  justify-content: center;\n}\n\n.box {\n  background: linear-gradient(135deg, #6366F1, #EC4899);\n  color: white;\n  padding: 2rem;\n  border-radius: 12px;\n  font-weight: bold;\n  font-size: 1.2rem;\n  flex: 1 1 180px;\n  text-align: center;\n  box-shadow: 0 8px 20px rgba(0,0,0,0.3);\n}`,
      js: `console.log('Flexbox layout loaded successfully.');`
    },
    canvas: {
      html: `<canvas id="matrixCanvas"></canvas>`,
      css: `body, html { margin: 0; padding: 0; overflow: hidden; background: #000; height: 100%; }\ncanvas { display: block; }`,
      js: `const canvas = document.getElementById('matrixCanvas');\nconst ctx = canvas.getContext('2d');\ncanvas.width = window.innerWidth;\ncanvas.height = window.innerHeight;\n\nconst letters = '0123456789ABCDEF';\nconst fontSize = 16;\nconst columns = canvas.width / fontSize;\nconst drops = Array(Math.floor(columns)).fill(1);\n\nfunction draw() {\n  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';\n  ctx.fillRect(0, 0, canvas.width, canvas.height);\n  ctx.fillStyle = '#0F0';\n  ctx.font = fontSize + 'px monospace';\n  for (let i = 0; i < drops.length; i++) {\n    const text = letters[Math.floor(Math.random() * letters.length)];\n    ctx.fillText(text, i * fontSize, drops[i] * fontSize);\n    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;\n    drops[i]++;\n  }\n}\nsetInterval(draw, 33);\nconsole.log('Matrix Canvas initialized.');`
    }
  };

  // Check URL params for pre-loaded code
  function loadFromHash() {
    const hash = window.location.hash.substring(1);
    if (!hash) {
      loadTemplate('starter');
      return;
    }

    const params = new URLSearchParams(hash);
    const code = params.get('code');
    const lang = params.get('lang') || 'html';

    if (code) {
      const decoded = decodeURIComponent(code);
      if (lang === 'html' || decoded.includes('<html') || decoded.includes('<!DOCTYPE') || decoded.includes('<body') || decoded.includes('<div>')) {
        if (htmlEditor) htmlEditor.value = decoded;
        if (cssEditor) cssEditor.value = '';
        if (jsEditor) jsEditor.value = '';
      } else if (lang === 'css') {
        if (htmlEditor) htmlEditor.value = `<div class="demo-element">\n  <h1>CSS Demo</h1>\n  <p>Test your styles here</p>\n</div>`;
        if (cssEditor) cssEditor.value = decoded;
        if (jsEditor) jsEditor.value = '';
      } else if (lang === 'javascript' || lang === 'js') {
        if (htmlEditor) htmlEditor.value = `<div style="font-family: sans-serif; padding: 2rem; color: #fff; background: #111;">\n  <h2>JavaScript Sandbox</h2>\n  <p id="output">Check console logs below</p>\n</div>`;
        if (cssEditor) cssEditor.value = '';
        if (jsEditor) jsEditor.value = decoded;
      } else {
        // Python or SQL or other generic code snippet
        if (htmlEditor) {
          htmlEditor.value = `<!-- Code Snippet (${lang.toUpperCase()}) -->\n<pre style="background: #0f172a; color: #38bdf8; padding: 1.5rem; border-radius: 8px; font-family: monospace; font-size: 1rem; line-height: 1.6;"><code>${decoded.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
        }
      }
      runCode();
    } else {
      loadTemplate('starter');
    }
  }

  function loadTemplate(key) {
    const tpl = templates[key] || templates.starter;
    if (htmlEditor) htmlEditor.value = tpl.html;
    if (cssEditor) cssEditor.value = tpl.css;
    if (jsEditor) jsEditor.value = tpl.js;
    runCode();
  }

  function runCode() {
    if (!previewFrame) return;

    const html = htmlEditor ? htmlEditor.value : '';
    const css = cssEditor ? cssEditor.value : '';
    const js = jsEditor ? jsEditor.value : '';

    const consoleInterceptor = `
      <script>
        (function() {
          const sendLog = (type, args) => {
            try {
              window.parent.postMessage({
                type: 'PLAYGROUND_CONSOLE',
                level: type,
                message: Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
              }, '*');
            } catch(e) {}
          };
          console.log = (...args) => sendLog('log', args);
          console.warn = (...args) => sendLog('warn', args);
          console.error = (...args) => sendLog('error', args);
          window.onerror = (msg, url, line) => {
            sendLog('error', [msg + ' (Line: ' + line + ')']);
          };
        })();
      <\/script>
    `;

    let fullDoc = '';
    if (html.includes('<html') || html.includes('<!DOCTYPE')) {
      // Inject CSS and JS into full HTML doc
      fullDoc = html
        .replace('<head>', `<head>${consoleInterceptor}<style>${css}</style>`)
        .replace('</body>', `<script>${js}<\/script></body>`);
      if (!fullDoc.includes('<style>') && css) {
        fullDoc += `<style>${css}</style>`;
      }
      if (!fullDoc.includes(consoleInterceptor)) {
        fullDoc = consoleInterceptor + fullDoc;
      }
    } else {
      fullDoc = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${consoleInterceptor}
          <style>
            ${css}
          </style>
        </head>
        <body>
          ${html}
          <script>
            ${js}
          <\/script>
        </body>
        </html>
      `;
    }

    previewFrame.srcdoc = fullDoc;
  }

  // Console listener
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'PLAYGROUND_CONSOLE' && consoleLogs) {
      const item = document.createElement('li');
      item.className = `console-log-item ${e.data.level}`;
      const time = new Date().toLocaleTimeString();
      item.textContent = `[${time}] ${e.data.message}`;
      consoleLogs.appendChild(item);
      consoleLogs.scrollTop = consoleLogs.scrollHeight;
    }
  });

  // Tab switching
  document.querySelectorAll('.editor-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.code-pane').forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPaneId = tab.getAttribute('data-tab') + 'Pane';
      const targetPane = document.getElementById(targetPaneId);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Template select
  if (templateSelect) {
    templateSelect.addEventListener('change', (e) => {
      loadTemplate(e.target.value);
    });
  }

  // Run button
  if (btnRun) {
    btnRun.addEventListener('click', () => {
      runCode();
      window.showToast('Sandbox updated!', 'success');
    });
  }

  // Clear console
  if (btnClearConsole && consoleLogs) {
    btnClearConsole.addEventListener('click', () => {
      consoleLogs.innerHTML = '';
    });
  }

  // Auto-run debounce on typing
  let debounceTimer;
  [htmlEditor, cssEditor, jsEditor].forEach(editor => {
    if (editor) {
      editor.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(runCode, 600);
      });
    }
  });

  loadFromHash();
});
