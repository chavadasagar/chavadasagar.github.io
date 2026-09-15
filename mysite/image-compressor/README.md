# OptiPic Studio - Mobile-Friendly Image Compressor & Resizer

A modern, high-performance, 100% client-side web application for compressing, resizing, and converting images directly in your browser using the HTML5 Canvas API.

## 🚀 Features

- **100% Private & Client-Side**: No image is ever uploaded to any server. All processing runs directly in browser memory.
- **Multiple Upload Channels**:
  - Drag & drop zone with active visual feedback
  - File picker (supports JPG, PNG, WebP, GIF, BMP, AVIF, SVG)
  - Mobile camera capture (`capture="environment"`)
  - Clipboard image paste (<kbd>Ctrl</kbd>+<kbd>V</kbd> / <kbd>Cmd</kbd>+<kbd>V</kbd>)
  - Built-in high-res sample image generator for instant testing
- **Interactive Before / After Preview**:
  - Split comparison slider with smooth touch and mouse dragging
  - Side-by-side comparison view
  - 50% to 300% zoom visualizer
- **Smart Resizing**:
  - Exact pixel mode (Width × Height) with aspect ratio lock toggle
  - Percentage scale mode (10% to 200%)
  - Social media and device presets (Instagram 1080×1080, HD 1080p, 720p, Email friendly 800px)
  - Prevention against accidental pixelation enlarging
- **Compression & Conversion**:
  - Output formats: **WebP**, **JPEG**, **PNG**, or preserve original
  - Real-time quality slider with numeric precision
  - Target file size matcher (binary search estimation)
  - Custom transparency background fill for PNG to JPEG conversion
- **Batch Processing & ZIP Export**:
  - Queue multiple images simultaneously
  - Global rules with one-click "Apply to All"
  - Individual fine-tuning and single downloads
  - One-click **Download All as ZIP** bundled archive
- **Privacy-Safe Compression History**:
  - Persistent compression metadata in `localStorage` (no image blob bloating)
  - Cumulative space savings counter
  - Filterable history table with CSV export and clear options
- **Mobile-First Responsive UI**:
  - Fluid layout optimized for smartphones, tablets, and wide screens
  - Dark mode and light mode theme switcher
  - Accessible keyboard shortcuts and touch-friendly targets

## 🛠️ Technology Stack

- **Markup**: Semantic HTML5 with ARIA accessibility roles
- **Styling**: Vanilla CSS3 (Custom properties, Glassmorphism, CSS Grid & Flexbox)
- **Scripting**: Vanilla JavaScript (ES6+, Canvas API, FileReader, Blob, URL APIs)
- **Packaging**: JSZip (CDN with offline fallbacks)

## 📱 Browser Compatibility

Compatible with all modern mobile and desktop browsers:
- Google Chrome / Chromium / Edge
- Apple Safari (iOS 14+ & macOS)
- Mozilla Firefox
- Android Mobile Browsers
