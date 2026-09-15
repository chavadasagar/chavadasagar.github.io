/**
 * Modern File Inspector & Metadata Tool
 * Fully Client-Side Metadata & Security Inspector Engine
 */

let currentFileInfo = null;
let toastInstance = null;

// Magic Bytes Signature Database
const FILE_SIGNATURES = [
    { magic: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], ext: 'PNG', mime: 'image/png', desc: 'Portable Network Graphics Image' },
    { magic: [0xFF, 0xD8, 0xFF], ext: 'JPG', mime: 'image/jpeg', desc: 'JPEG / JFIF Image' },
    { magic: [0x47, 0x49, 0x46, 0x38], ext: 'GIF', mime: 'image/gif', desc: 'Graphics Interchange Format Image' },
    { magic: [0x25, 0x50, 0x44, 0x46], ext: 'PDF', mime: 'application/pdf', desc: 'Adobe Portable Document Format' },
    { magic: [0x50, 0x4B, 0x03, 0x04], ext: 'ZIP / Office', mime: 'application/zip', desc: 'ZIP Archive or Office OpenXML File (DOCX/XLSX/PPTX)' },
    { magic: [0x52, 0x61, 0x72, 0x21], ext: 'RAR', mime: 'application/vnd.rar', desc: 'Roshal ARchive Compressed File' },
    { magic: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C], ext: '7Z', mime: 'application/x-7z-compressed', desc: '7-Zip Compressed Archive' },
    { magic: [0x49, 0x44, 0x33], ext: 'MP3', mime: 'audio/mpeg', desc: 'MPEG Audio Layer III File (ID3 Header)' },
    { magic: [0x7F, 0x45, 0x4C, 0x46], ext: 'ELF', mime: 'application/x-executable', desc: 'Executable and Linkable Format (Linux Binary)' },
    { magic: [0x4D, 0x5A], ext: 'EXE / DLL', mime: 'application/x-msdownload', desc: 'DOS / Windows PE Executable or DLL' },
    { magic: [0x00, 0x61, 0x73, 0x6D], ext: 'WASM', mime: 'application/wasm', desc: 'WebAssembly Binary Module' },
    { magic: [0x53, 0x51, 0x4C, 0x69, 0x74, 0x65], ext: 'DB', mime: 'application/x-sqlite3', desc: 'SQLite 3 Database File' },
    { magic: [0x1F, 0x8B], ext: 'GZ', mime: 'application/gzip', desc: 'Gzip Compressed Data' },
    { magic: [0x42, 0x5A, 0x68], ext: 'BZ2', mime: 'application/x-bzip2', desc: 'Bzip2 Compressed Data' }
];

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initDragAndDrop();
    initToast();
});

// Toast notification initializer
function initToast() {
    const toastEl = document.getElementById('appToast');
    if (toastEl) {
        toastInstance = new bootstrap.Toast(toastEl, { delay: 2600 });
    }
}

function showToast(message, isError = false) {
    const toastMsg = document.getElementById('toastMessage');
    if (toastMsg) {
        const icon = isError ? 'bi-exclamation-octagon-fill text-danger' : 'bi-check-circle-fill text-success';
        toastMsg.innerHTML = `<i class="bi ${icon} me-2 fs-5"></i><span>${message}</span>`;
    }
    if (toastInstance) {
        toastInstance.show();
    }
}

// Theme handling
function initTheme() {
    const savedTheme = localStorage.getItem('appTheme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('appTheme', theme);
    
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    if (themeIcon && themeText) {
        if (theme === 'dark') {
            themeIcon.className = 'bi bi-sun-fill text-warning';
            themeText.innerText = 'Light Mode';
        } else {
            themeIcon.className = 'bi bi-moon-stars-fill';
            themeText.innerText = 'Dark Mode';
        }
    }
}

// Drag & Drop Handling
function initDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    }, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleFileSelect(event) {
    const files = event.target.files;
    if (files && files.length > 0) {
        processFile(files[0]);
    }
}

// Format bytes
function formatBytes(bytes, decimals = 2) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Format date
function formatDate(date) {
    if (!date || isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Relative time calculator
function getRelativeTime(timestamp) {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
}

// Core File Processor
async function processFile(file) {
    if (!file) return;

    const extension = file.name.includes('.') ? '.' + file.name.split('.').pop().toLowerCase() : 'None';
    const formattedSize = formatBytes(file.size);
    const rawBytes = file.size.toLocaleString() + ' bytes';
    const modifiedDate = formatDate(new Date(file.lastModified));
    const relativeTime = getRelativeTime(file.lastModified);
    const mimeType = file.type || 'Unknown / Generic Binary';

    currentFileInfo = {
        name: file.name,
        extension: extension,
        sizeFormatted: formattedSize,
        sizeBytes: file.size,
        mimeType: mimeType,
        lastModified: modifiedDate,
        relativeTime: relativeTime,
        lastModifiedTimestamp: file.lastModified,
        magicSignature: 'Analyzing...',
        sha256: 'Calculating...',
        sha512: 'Calculating...',
        sha384: 'Calculating...',
        sha1: 'Calculating...',
        md5: 'Calculating...',
        analysis: {}
    };

    // Update Overview DOM
    document.getElementById('valFileName').innerText = file.name;
    document.getElementById('valFileExt').innerText = extension.toUpperCase();
    document.getElementById('valFileSize').innerText = `${formattedSize} (${rawBytes})`;
    document.getElementById('valMimeType').innerText = mimeType;
    document.getElementById('valLastModified').innerText = `${modifiedDate} (${relativeTime})`;

    document.getElementById('displayFileName').innerText = file.name;
    document.getElementById('displayFileTypeBadge').innerText = extension.toUpperCase();

    // Show container
    const container = document.getElementById('fileInfoContainer');
    container.classList.remove('d-none');
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Inspect Magic Bytes & Generate Hex Dump
    inspectMagicBytesAndHex(file);

    // Calculate Cryptographic Hashes
    calculateHashes(file);

    // Generate Preview and Type Analysis
    setupPreviewAndAnalysis(file, extension);
}

// Magic Bytes & Hex Dump Generator
async function inspectMagicBytesAndHex(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const buffer = new Uint8Array(e.target.result);
        
        // Check magic bytes
        let detectedSig = null;
        for (const sig of FILE_SIGNATURES) {
            if (buffer.length >= sig.magic.length) {
                let match = true;
                for (let i = 0; i < sig.magic.length; i++) {
                    if (buffer[i] !== sig.magic[i]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    detectedSig = sig;
                    break;
                }
            }
        }

        const magicBadgeEl = document.getElementById('magicSignatureBadge');
        if (detectedSig) {
            currentFileInfo.magicSignature = `${detectedSig.ext} - ${detectedSig.desc}`;
            magicBadgeEl.innerHTML = `<span class="magic-badge"><i class="bi bi-shield-check me-1"></i> Verified: ${detectedSig.desc}</span>`;
        } else {
            const hexHeader = Array.from(buffer.slice(0, 4)).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
            currentFileInfo.magicSignature = `Header Bytes: [${hexHeader}]`;
            magicBadgeEl.innerHTML = `<span class="badge bg-secondary-subtle text-secondary-emphasis font-mono">Magic Bytes: ${hexHeader}</span>`;
        }

        // Render Hex Dump Table (First 256 bytes)
        const hexRows = [];
        const bytesToRead = Math.min(buffer.length, 256);
        for (let offset = 0; offset < bytesToRead; offset += 16) {
            const chunk = buffer.slice(offset, offset + 16);
            const hexPart = Array.from(chunk).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
            const asciiPart = Array.from(chunk).map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');
            const offsetStr = offset.toString(16).padStart(8, '0').toUpperCase();
            
            hexRows.push(`
                <tr>
                    <td class="hex-offset">${offsetStr}</td>
                    <td class="hex-bytes">${hexPart}</td>
                    <td class="hex-ascii">${escapeHtml(asciiPart)}</td>
                </tr>
            `);
        }
        document.getElementById('hexTableBody').innerHTML = hexRows.join('');
    };
    reader.readAsArrayBuffer(file.slice(0, 512));
}

// Calculate Hashes using Web Crypto API + Fast JS MD5
async function calculateHashes(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();

        const [sha256Buf, sha512Buf, sha384Buf, sha1Buf] = await Promise.all([
            crypto.subtle.digest('SHA-256', arrayBuffer),
            crypto.subtle.digest('SHA-512', arrayBuffer),
            crypto.subtle.digest('SHA-384', arrayBuffer),
            crypto.subtle.digest('SHA-1', arrayBuffer)
        ]);

        const sha256Hex = bufferToHex(sha256Buf);
        const sha512Hex = bufferToHex(sha512Buf);
        const sha384Hex = bufferToHex(sha384Buf);
        const sha1Hex = bufferToHex(sha1Buf);
        const md5Hex = calculateMD5(new Uint8Array(arrayBuffer));

        currentFileInfo.sha256 = sha256Hex;
        currentFileInfo.sha512 = sha512Hex;
        currentFileInfo.sha384 = sha384Hex;
        currentFileInfo.sha1 = sha1Hex;
        currentFileInfo.md5 = md5Hex;

        document.getElementById('valSha256').innerText = sha256Hex;
        document.getElementById('valSha512').innerText = sha512Hex;
        document.getElementById('valSha384').innerText = sha384Hex;
        document.getElementById('valSha1').innerText = sha1Hex;
        document.getElementById('valMd5').innerText = md5Hex;

    } catch (err) {
        console.error('Hash calculation error:', err);
        showToast('Failed to calculate some cryptographic hashes', true);
    }
}

// Fast Pure JS MD5 implementation
function calculateMD5(bytes) {
    function md5cycle(x, k) {
        let a = x[0], b = x[1], c = x[2], d = x[3];
        a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586); c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
        a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426); c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
        a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417); c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
        a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101); c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
        a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632); c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
        a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083); c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
        a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690); c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
        a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784); c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
        a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463); c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
        a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353); c = hh(c, d, a, b, k[7], 16, -1554976322); b = hh(b, c, d, a, k[10], 23, -1094730640);
        a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222); c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
        a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415); c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
        a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894980668); c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
        a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744); c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[2], 21, 1309151649);
        x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
    }
    function cmn(q, a, b, x, s, t) { a = add32(add32(a, q), add32(x, t)); return add32((a << s) | (a >>> (32 - s)), b); }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
    function add32(a, b) { return (a + b) & 0xFFFFFFFF; }

    const n = bytes.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= n; i += 64) {
        md5cycle(state, md5blk(bytes.subarray(i - 64, i)));
    }
    const tail = new Uint8Array(64);
    tail.set(bytes.subarray(i - 64));
    tail[n % 64] = 0x80;
    if (n % 64 >= 56) {
        md5cycle(state, md5blk(tail));
        tail.fill(0);
    }
    const bits = n * 8;
    tail[56] = bits & 0xff; tail[57] = (bits >>> 8) & 0xff; tail[58] = (bits >>> 16) & 0xff; tail[59] = (bits >>> 24) & 0xff;
    md5cycle(state, md5blk(tail));

    return state.map(val => {
        let hex = '';
        for (let j = 0; j < 4; j++) {
            hex += ((val >> (j * 8)) & 0xff).toString(16).padStart(2, '0');
        }
        return hex;
    }).join('');
}

function md5blk(bytes) {
    const blk = new Int32Array(16);
    for (let i = 0; i < 16; i++) {
        blk[i] = bytes[i * 4] | (bytes[i * 4 + 1] << 8) | (bytes[i * 4 + 2] << 16) | (bytes[i * 4 + 3] << 24);
    }
    return blk;
}

// Media & Preview Setup
function setupPreviewAndAnalysis(file, ext) {
    const previewContainer = document.getElementById('previewContainer');
    const headerIcon = document.getElementById('fileHeaderIcon');
    const statsContainer = document.getElementById('analysisStatsContainer');

    previewContainer.innerHTML = '';
    statsContainer.innerHTML = '';

    const mime = file.type.toLowerCase();

    if (mime.startsWith('image/')) {
        headerIcon.innerHTML = '<i class="bi bi-file-earmark-image-fill text-info"></i>';
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const aspect = getAspectRatio(img.naturalWidth, img.naturalHeight);
                const mp = ((img.naturalWidth * img.naturalHeight) / 1000000).toFixed(2);
                
                currentFileInfo.analysis = {
                    dimensions: `${img.naturalWidth} × ${img.naturalHeight} px`,
                    aspectRatio: aspect,
                    megapixels: `${mp} MP`
                };

                previewContainer.innerHTML = `
                    <div class="text-center w-100">
                        <img src="${e.target.result}" alt="Preview" class="media-preview-img mb-3">
                    </div>
                `;

                statsContainer.innerHTML = `
                    <div class="col-sm-4">
                        <div class="info-card-item">
                            <span class="info-card-label">Resolution</span>
                            <span class="info-card-value font-mono">${img.naturalWidth} × ${img.naturalHeight}</span>
                        </div>
                    </div>
                    <div class="col-sm-4">
                        <div class="info-card-item">
                            <span class="info-card-label">Aspect Ratio</span>
                            <span class="info-card-value font-mono">${aspect}</span>
                        </div>
                    </div>
                    <div class="col-sm-4">
                        <div class="info-card-item">
                            <span class="info-card-label">Megapixels</span>
                            <span class="info-card-value font-mono">${mp} MP</span>
                        </div>
                    </div>
                `;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);

    } else if (mime.startsWith('audio/')) {
        headerIcon.innerHTML = '<i class="bi bi-file-earmark-music-fill text-rose"></i>';
        const audioUrl = URL.createObjectURL(file);

        previewContainer.innerHTML = `
            <div class="w-100 text-center p-3">
                <i class="bi bi-music-note-beaming display-3 text-danger mb-3 d-block"></i>
                <audio controls class="w-100" src="${audioUrl}"></audio>
            </div>
        `;

    } else if (mime.startsWith('video/')) {
        headerIcon.innerHTML = '<i class="bi bi-file-earmark-play-fill text-warning"></i>';
        const videoUrl = URL.createObjectURL(file);

        previewContainer.innerHTML = `
            <div class="w-100 text-center">
                <video controls class="media-preview-img w-100" src="${videoUrl}"></video>
            </div>
        `;

    } else if (mime.startsWith('text/') || isCodeExtension(ext)) {
        headerIcon.innerHTML = '<i class="bi bi-file-earmark-code-fill text-primary"></i>';
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split(/\r\n|\r|\n/).length;
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            const chars = text.length;
            const lineEnding = text.includes('\r\n') ? 'CRLF (Windows)' : 'LF (Unix/Mac)';

            currentFileInfo.analysis = {
                lineCount: lines,
                wordCount: words,
                charCount: chars,
                lineEnding: lineEnding
            };

            const snippet = text.length > 5000 ? text.substring(0, 5000) + '\n\n... [Content Truncated]' : text;

            previewContainer.innerHTML = `
                <div class="w-100">
                    <pre class="code-preview-box mb-0"><code>${escapeHtml(snippet)}</code></pre>
                </div>
            `;

            statsContainer.innerHTML = `
                <div class="col-sm-3">
                    <div class="info-card-item">
                        <span class="info-card-label">Lines</span>
                        <span class="info-card-value font-mono">${lines.toLocaleString()}</span>
                    </div>
                </div>
                <div class="col-sm-3">
                    <div class="info-card-item">
                        <span class="info-card-label">Words</span>
                        <span class="info-card-value font-mono">${words.toLocaleString()}</span>
                    </div>
                </div>
                <div class="col-sm-3">
                    <div class="info-card-item">
                        <span class="info-card-label">Characters</span>
                        <span class="info-card-value font-mono">${chars.toLocaleString()}</span>
                    </div>
                </div>
                <div class="col-sm-3">
                    <div class="info-card-item">
                        <span class="info-card-label">Endings</span>
                        <span class="info-card-value font-mono">${lineEnding}</span>
                    </div>
                </div>
            `;
        };
        reader.readAsText(file.slice(0, 100000));

    } else {
        headerIcon.innerHTML = '<i class="bi bi-file-earmark-binary-fill text-secondary"></i>';
        previewContainer.innerHTML = `
            <div class="text-center p-4 text-muted">
                <i class="bi bi-file-earmark-binary display-3 mb-2 d-block text-secondary"></i>
                <p class="mb-0">No graphical preview available for binary data.</p>
            </div>
        `;
    }
}

// Helpers
function bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getAspectRatio(w, h) {
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
    const d = gcd(w, h);
    return `${w / d}:${h / d}`;
}

function isCodeExtension(ext) {
    const exts = ['.js', '.json', '.html', '.css', '.md', '.txt', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.ts', '.jsx', '.tsx', '.yaml', '.yml', '.xml', '.sql', '.sh'];
    return exts.includes(ext);
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Copy single text element
function copyText(elementId, label) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = el.innerText.trim();
    if (!text || text.includes('Calculating...')) return;

    navigator.clipboard.writeText(text).then(() => {
        showToast(`${label} copied to clipboard!`);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

// Copy All Report as Markdown
function copyAllDetails() {
    if (!currentFileInfo) return;

    let summary = `### File Inspection Report: ${currentFileInfo.name}\n\n`;
    summary += `* **File Name**: \`${currentFileInfo.name}\`\n`;
    summary += `* **File Extension**: \`${currentFileInfo.extension}\`\n`;
    summary += `* **Size**: \`${currentFileInfo.sizeFormatted}\` (${currentFileInfo.sizeBytes} bytes)\n`;
    summary += `* **MIME Type**: \`${currentFileInfo.mimeType}\`\n`;
    summary += `* **Last Modified**: \`${currentFileInfo.lastModified}\`\n`;
    summary += `* **Magic Bytes**: \`${currentFileInfo.magicSignature}\`\n\n`;

    summary += `#### Cryptographic Hashes\n`;
    summary += `* **SHA-256**: \`${currentFileInfo.sha256}\`\n`;
    summary += `* **SHA-512**: \`${currentFileInfo.sha512}\`\n`;
    summary += `* **SHA-384**: \`${currentFileInfo.sha384}\`\n`;
    summary += `* **SHA-1**: \`${currentFileInfo.sha1}\`\n`;
    summary += `* **MD5**: \`${currentFileInfo.md5}\`\n`;

    navigator.clipboard.writeText(summary).then(() => {
        showToast('Full Markdown report copied to clipboard!');
    });
}

// Export Report as Downloadable JSON or MD
function exportReport(format = 'json') {
    if (!currentFileInfo) return;

    let content = '';
    let filename = `${currentFileInfo.name}_inspection.${format}`;
    let mime = 'application/json';

    if (format === 'json') {
        content = JSON.stringify(currentFileInfo, null, 2);
    } else {
        mime = 'text/markdown';
        content = `# File Inspection Report: ${currentFileInfo.name}\n\nGenerated on ${new Date().toLocaleString()}\n\n`;
        for (const [k, v] of Object.entries(currentFileInfo)) {
            if (typeof v !== 'object') {
                content += `- **${k}**: ${v}\n`;
            }
        }
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast(`Report exported as ${format.toUpperCase()}!`);
}

// Reset Inspector
function resetFile() {
    currentFileInfo = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfoContainer').classList.add('d-none');
    document.getElementById('dropZone').scrollIntoView({ behavior: 'smooth' });
}