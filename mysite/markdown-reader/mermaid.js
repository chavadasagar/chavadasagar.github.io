/**
 * Mermaid Module
 * Integrates Mermaid.js diagrams, handling rendering, styling based on themes,
 * interactive pan/zoom controls, and svg/png exporting.
 * Attached to window.MermaidHandler.
 */

let mermaidInitialized = false;

function ensureMermaidInit() {
    if (mermaidInitialized) return;
    if (typeof mermaid === 'undefined') {
        console.warn('Mermaid library not loaded yet.');
        return;
    }

    const dark = window.ThemeManager.isDark();
    mermaid.initialize({
        startOnLoad: false,
        theme: dark ? 'dark' : 'default',
        securityLevel: 'loose',
        themeVariables: dark ? {
            background: '#1e1e1e',
            primaryColor: '#007acc',
            primaryTextColor: '#d4d4d4',
            lineColor: '#5a5a5a'
        } : {
            background: '#ffffff',
            primaryColor: '#005999',
            primaryTextColor: '#333333',
            lineColor: '#cccccc'
        }
    });
    mermaidInitialized = true;
}

window.MermaidHandler = {
    reinitMermaidTheme(isDarkTheme) {
        if (typeof mermaid === 'undefined') return;
        mermaidInitialized = false;
        ensureMermaidInit();
    },

    async renderMermaidDiagrams(container) {
        if (typeof mermaid === 'undefined') {
            console.warn('Mermaid.js is not loaded.');
            return;
        }

        ensureMermaidInit();

        const mermaidBlocks = container.querySelectorAll('.mermaid-raw');
        for (let i = 0; i < mermaidBlocks.length; i++) {
            const block = mermaidBlocks[i];
            const code = block.textContent.trim();
            const id = `mermaid-diagram-${Date.now()}-${i}`;
            const parent = block.parentNode;

            const wrapper = document.createElement('div');
            wrapper.className = 'mermaid-container search-exclude';
            
            wrapper.innerHTML = `
                <div class="mermaid-toolbar">
                    <span class="mermaid-label">Mermaid Diagram</span>
                    <div class="mermaid-actions">
                        <button class="mermaid-btn btn-zoom-in" title="Zoom In"><span class="material-icons-round">zoom_in</span></button>
                        <button class="mermaid-btn btn-zoom-out" title="Zoom Out"><span class="material-icons-round">zoom_out</span></button>
                        <button class="mermaid-btn btn-reset" title="Reset"><span class="material-icons-round">restart_alt</span></button>
                        <button class="mermaid-btn btn-fullscreen" title="Fullscreen"><span class="material-icons-round">fullscreen</span></button>
                        <div class="dropdown-wrapper">
                            <button class="mermaid-btn btn-download" title="Download"><span class="material-icons-round">download</span></button>
                            <div class="dropdown-menu">
                                <button class="export-svg-btn">Download SVG</button>
                                <button class="export-png-btn">Download PNG</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const viewport = document.createElement('div');
            viewport.className = 'mermaid-viewport';
            wrapper.appendChild(viewport);
            
            parent.replaceChild(wrapper, block);

            try {
                const { svg } = await mermaid.render(id, code);
                viewport.innerHTML = svg;
                
                setupZoomPan(viewport, wrapper);
                setupExports(viewport, wrapper);
            } catch (err) {
                console.error('Mermaid render error: ', err);
                viewport.innerHTML = `
                    <div class="mermaid-error">
                        <span class="material-icons-round">error_outline</span>
                        <span>Error rendering diagram: Check syntax.</span>
                        <pre class="mermaid-error-details">${window.Utils.escapeHtml(err.message || err)}</pre>
                    </div>
                `;
                const badSvg = document.getElementById(id);
                if (badSvg) badSvg.remove();
            }
        }
    }
};

function setupZoomPan(viewport, wrapper) {
    const svg = viewport.querySelector('svg');
    if (!svg) return;

    svg.style.width = '100%';
    svg.style.height = 'auto';
    svg.style.maxWidth = '100%';
    svg.style.transformOrigin = 'center center';

    let scale = 1;
    let x = 0;
    let y = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const applyTransform = () => {
        svg.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    };

    const btnZoomIn = wrapper.querySelector('.btn-zoom-in');
    const btnZoomOut = wrapper.querySelector('.btn-zoom-out');
    const btnReset = wrapper.querySelector('.btn-reset');
    const btnFullscreen = wrapper.querySelector('.btn-fullscreen');

    btnZoomIn.addEventListener('click', () => {
        scale = Math.min(scale + 0.15, 6);
        applyTransform();
    });

    btnZoomOut.addEventListener('click', () => {
        scale = Math.max(scale - 0.15, 0.25);
        applyTransform();
    });

    btnReset.addEventListener('click', () => {
        scale = 1;
        x = 0;
        y = 0;
        applyTransform();
    });

    btnFullscreen.addEventListener('click', () => {
        toggleFullscreen(viewport);
    });

    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        scale = Math.min(Math.max(scale + delta, 0.25), 6);
        applyTransform();
    }, { passive: false });

    viewport.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        isDragging = true;
        viewport.style.cursor = 'grabbing';
        viewport.setPointerCapture(e.pointerId);
        startX = e.clientX - x;
        startY = e.clientY - y;
    });

    viewport.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        x = e.clientX - startX;
        y = e.clientY - startY;
        applyTransform();
    });

    const stopDragging = (e) => {
        if (!isDragging) return;
        isDragging = false;
        viewport.style.cursor = 'grab';
        try {
            viewport.releasePointerCapture(e.pointerId);
        } catch (err) {}
    };

    viewport.addEventListener('pointerup', stopDragging);
    viewport.addEventListener('pointercancel', stopDragging);

    viewport.style.cursor = 'grab';
}

function toggleFullscreen(viewport) {
    const isCurrentlyFullscreen = document.fullscreenElement === viewport;
    if (!isCurrentlyFullscreen) {
        if (viewport.requestFullscreen) {
            viewport.requestFullscreen();
            viewport.classList.add('fullscreen-mode');
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            viewport.classList.remove('fullscreen-mode');
        }
    }
}

document.addEventListener('fullscreenchange', () => {
    document.querySelectorAll('.mermaid-viewport').forEach(vp => {
        if (document.fullscreenElement !== vp) {
            vp.classList.remove('fullscreen-mode');
        }
    });
});

function setupExports(viewport, wrapper) {
    const svg = viewport.querySelector('svg');
    if (!svg) return;

    const exportSvgBtn = wrapper.querySelector('.export-svg-btn');
    const exportPngBtn = wrapper.querySelector('.export-png-btn');
    const downloadBtn = wrapper.querySelector('.btn-download');
    const dropdownMenu = wrapper.querySelector('.dropdown-menu');

    downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        dropdownMenu.classList.remove('show');
    });

    exportSvgBtn.addEventListener('click', () => {
        try {
            const svgData = new XMLSerializer().serializeToString(svg);
            const fileName = `mermaid-diagram-${Date.now()}.svg`;
            window.Utils.downloadFile(svgData, fileName, 'image/svg+xml;charset=utf-8');
            window.Utils.showToast('SVG downloaded successfully!', 'success');
        } catch (e) {
            console.error(e);
            window.Utils.showToast('Failed to download SVG', 'error');
        }
    });

    exportPngBtn.addEventListener('click', () => {
        try {
            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const DOMURL = window.URL || window.webkitURL || window;
            const url = DOMURL.createObjectURL(svgBlob);
            
            const bbox = svg.getBoundingClientRect();
            const width = bbox.width * 2 || 1600;
            const height = bbox.height * 2 || 1200;

            const image = new Image();
            image.width = width;
            image.height = height;
            image.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext('2d');
                
                context.fillStyle = window.ThemeManager.isDark() ? '#1e1e1e' : '#ffffff';
                context.fillRect(0, 0, width, height);
                context.drawImage(image, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    const fileName = `mermaid-diagram-${Date.now()}.png`;
                    const fileUrl = DOMURL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = fileUrl;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    
                    setTimeout(() => {
                        document.body.removeChild(a);
                        DOMURL.revokeObjectURL(fileUrl);
                        DOMURL.revokeObjectURL(url);
                    }, 100);
                    window.Utils.showToast('PNG downloaded successfully!', 'success');
                }, 'image/png');
            };
            image.src = url;
        } catch (e) {
            console.error(e);
            window.Utils.showToast('Failed to download PNG', 'error');
        }
    });
}
