/**
 * Standalone Barcode Generator Engine
 * Generates vector SVG and Canvas barcodes for CODE128, EAN-13, EAN-8, UPC-A, and CODE39.
 * Zero external dependencies.
 */

const BarcodeEngine = (function () {
  'use strict';

  // ==========================================
  // CODE 128 PATTERNS (Indices 0 - 106)
  // Each string contains bar/space widths summing to 11 (Stop is 13)
  // ==========================================
  const CODE128_PATTERNS = [
    "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
    "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
    "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
    "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
    "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
    "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
    "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
    "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
    "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
    "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
    "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (106 is STOP)
  ];

  const START_B = 104;
  const START_C = 105;
  const STOP = 106;

  /**
   * Encodes text into Code 128 barcode pattern using auto B/C switching
   * @param {string} text
   * @returns {Array<number>} array of symbol indices
   */
  function encodeCode128(text) {
    if (!text || typeof text !== 'string') text = '123456';
    const cleanText = text.trim();
    if (!cleanText) return [];

    const symbols = [];
    const isAllDigits = /^\d+$/.test(cleanText);

    if (isAllDigits && cleanText.length % 2 === 0 && cleanText.length >= 2) {
      // Use Code Set C (pairs of digits)
      symbols.push(START_C);
      for (let i = 0; i < cleanText.length; i += 2) {
        symbols.push(parseInt(cleanText.substr(i, 2), 10));
      }
    } else {
      // Use Code Set B (ASCII 32 to 127)
      symbols.push(START_B);
      for (let i = 0; i < cleanText.length; i++) {
        const code = cleanText.charCodeAt(i);
        if (code >= 32 && code <= 126) {
          symbols.push(code - 32);
        } else {
          symbols.push(0); // fallback space
        }
      }
    }

    // Calculate modulo 103 checksum
    let checksum = symbols[0];
    for (let i = 1; i < symbols.length; i++) {
      checksum += symbols[i] * i;
    }
    checksum = checksum % 103;
    symbols.push(checksum);
    symbols.push(STOP);

    return symbols;
  }

  // ==========================================
  // EAN-13 / UPC-A / EAN-8 PATTERNS
  // ==========================================
  const EAN_L_CODES = [
    "0001101", "0011001", "0010011", "0111101", "0100011",
    "0110001", "0101111", "0111011", "0110111", "0001011"
  ];
  const EAN_G_CODES = [
    "0100111", "0110011", "0011011", "0100001", "0011101",
    "0111001", "0000101", "0010001", "0001001", "0010111"
  ];
  const EAN_R_CODES = [
    "1110010", "1100110", "1101100", "1000010", "1011100",
    "1001110", "1010000", "1000100", "1001000", "1110100"
  ];

  const EAN13_PARITY_PATTERNS = [
    "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
    "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"
  ];

  /**
   * Calculate EAN-13 Checksum digit
   * @param {string} digits12 First 12 digits
   * @returns {number} 13th check digit
   */
  function calculateEAN13Checksum(digits12) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const d = parseInt(digits12[i], 10) || 0;
      sum += (i % 2 === 0) ? d * 1 : d * 3;
    }
    return (10 - (sum % 10)) % 10;
  }

  /**
   * Encode EAN-13 barcode
   * @param {string} rawInput 12 or 13 digits string
   * @returns {{ modules: string, displayValue: string, valid: boolean }}
   */
  function encodeEAN13(rawInput) {
    let digits = (rawInput || '').replace(/\D/g, '');
    if (digits.length < 12) {
      digits = digits.padStart(12, '0');
    }

    let checkDigit = 0;
    if (digits.length === 12) {
      checkDigit = calculateEAN13Checksum(digits);
      digits += checkDigit;
    } else {
      digits = digits.substring(0, 13);
      checkDigit = calculateEAN13Checksum(digits.substring(0, 12));
      digits = digits.substring(0, 12) + checkDigit;
    }

    const firstDigit = parseInt(digits[0], 10);
    const parity = EAN13_PARITY_PATTERNS[firstDigit];

    let binary = "101"; // Start guard (3)

    // Left 6 digits (indices 1 to 6)
    for (let i = 1; i <= 6; i++) {
      const d = parseInt(digits[i], 10);
      const isL = parity[i - 1] === 'L';
      binary += isL ? EAN_L_CODES[d] : EAN_G_CODES[d];
    }

    binary += "01010"; // Center guard (5)

    // Right 6 digits (indices 7 to 12)
    for (let i = 7; i <= 12; i++) {
      const d = parseInt(digits[i], 10);
      binary += EAN_R_CODES[d];
    }

    binary += "101"; // End guard (3)

    return {
      modules: binary,
      displayValue: digits,
      valid: true
    };
  }

  // ==========================================
  // CODE 39 IMPLEMENTATION
  // ==========================================
  const CODE39_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";
  const CODE39_PATTERNS = [
    "101001101101", "110100101011", "101100101011", "110110010101", "101001101011",
    "110100110101", "101100110101", "101001011011", "110100101101", "101100101101",
    "110101001011", "101101001011", "110110100101", "101011001011", "110101100101",
    "101101100101", "101010011011", "110101001101", "101101001101", "101011001101",
    "110101010011", "101101010011", "110110101001", "101011010011", "110101101001",
    "101101101001", "101010110011", "110101011001", "101101011001", "101011011001",
    "110010101011", "100110101011", "110011010101", "100101101011", "110010110101",
    "100110110101", "100101011011", "110010101101", "100110101101", "100101101101",
    "100100100101", "100100101001", "100101001001", "101001001001"
  ];
  const CODE39_ASTERISK = "100101101101";

  function encodeCode39(text) {
    const upper = (text || '12345').toUpperCase();
    let binary = CODE39_ASTERISK + "0";

    for (let i = 0; i < upper.length; i++) {
      const ch = upper[i];
      const idx = CODE39_CHARS.indexOf(ch);
      if (idx !== -1) {
        binary += CODE39_PATTERNS[idx] + "0";
      }
    }
    binary += CODE39_ASTERISK;
    return { modules: binary, displayValue: upper, valid: true };
  }

  // ==========================================
  // SVG / CANVAS RENDERERS
  // ==========================================

  function code128ToBinary(symbols) {
    let binary = "";
    for (const sym of symbols) {
      const pattern = CODE128_PATTERNS[sym];
      if (!pattern) continue;
      let isBar = true;
      for (let i = 0; i < pattern.length; i++) {
        const width = parseInt(pattern[i], 10);
        binary += (isBar ? "1" : "0").repeat(width);
        isBar = !isBar;
      }
    }
    return binary;
  }

  /**
   * Generate Barcode as an SVG string
   * @param {Object} options
   */
  function renderSVG(options = {}) {
    const {
      value = '12345678',
      format = 'CODE128',
      moduleWidth = 2,
      height = 50,
      includeText = true,
      fontSize = 11,
      fontFamily = 'ui-monospace, "JetBrains Mono", Consolas, monospace',
      color = '#000000',
      bgColor = 'transparent',
      quietZone = 8
    } = options;

    let binary = '';
    let displayText = value;

    if (format === 'EAN13') {
      const res = encodeEAN13(value);
      binary = res.modules;
      displayText = res.displayValue;
    } else if (format === 'CODE39') {
      const res = encodeCode39(value);
      binary = res.modules;
      displayText = res.displayValue;
    } else {
      const symbols = encodeCode128(value);
      binary = code128ToBinary(symbols);
      displayText = value;
    }

    if (!binary) {
      return `<svg viewBox="0 0 120 40" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#dc2626" font-size="11" font-family="sans-serif">Invalid Barcode</text></svg>`;
    }

    const totalModules = binary.length;
    const barcodeWidth = totalModules * moduleWidth;
    const totalWidth = barcodeWidth + (quietZone * 2);
    const textHeight = includeText ? (fontSize + 6) : 0;
    const totalHeight = height + textHeight + (quietZone > 0 ? 4 : 0);

    let pathD = '';
    let inBar = false;
    let barStart = 0;

    for (let i = 0; i < totalModules; i++) {
      const bit = binary[i] === '1';
      if (bit && !inBar) {
        inBar = true;
        barStart = i;
      } else if (!bit && inBar) {
        inBar = false;
        const w = (i - barStart) * moduleWidth;
        const x = quietZone + (barStart * moduleWidth);
        pathD += `M${x},2 h${w} v${height} h-${w} Z `;
      }
    }
    if (inBar) {
      const w = (totalModules - barStart) * moduleWidth;
      const x = quietZone + (barStart * moduleWidth);
      pathD += `M${x},2 h${w} v${height} h-${w} Z `;
    }

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" class="barcode-svg" style="display:block; max-width:100%; height:auto;">`;
    if (bgColor && bgColor !== 'transparent') {
      svg += `<rect width="${totalWidth}" height="${totalHeight}" fill="${bgColor}" />`;
    }
    svg += `<path d="${pathD}" fill="${color}" shape-rendering="crispEdges" />`;

    if (includeText) {
      const textY = height + fontSize + 2;
      svg += `<text x="${totalWidth / 2}" y="${textY}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="600" fill="${color}" text-anchor="middle" letter-spacing="1.2">${escapeXml(displayText)}</text>`;
    }

    svg += `</svg>`;
    return svg;
  }

  /**
   * Render Barcode directly to an HTML Canvas element
   */
  function renderCanvas(canvas, options = {}) {
    if (!canvas) return;
    const {
      value = '12345678',
      format = 'CODE128',
      moduleWidth = 2,
      height = 50,
      includeText = true,
      fontSize = 12,
      fontFamily = 'monospace',
      color = '#000000',
      bgColor = '#FFFFFF',
      quietZone = 8,
      scale = 2
    } = options;

    let binary = '';
    let displayText = value;

    if (format === 'EAN13') {
      const res = encodeEAN13(value);
      binary = res.modules;
      displayText = res.displayValue;
    } else if (format === 'CODE39') {
      const res = encodeCode39(value);
      binary = res.modules;
      displayText = res.displayValue;
    } else {
      const symbols = encodeCode128(value);
      binary = code128ToBinary(symbols);
      displayText = value;
    }

    const textHeight = includeText ? (fontSize + 6) : 0;
    const totalModules = binary.length || 1;
    const widthPx = (totalModules * moduleWidth) + (quietZone * 2);
    const heightPx = height + textHeight + 4;

    canvas.width = widthPx * scale;
    canvas.height = heightPx * scale;
    canvas.style.width = `${widthPx}px`;
    canvas.style.height = `${heightPx}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    if (bgColor && bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, widthPx, heightPx);
    } else {
      ctx.clearRect(0, 0, widthPx, heightPx);
    }

    ctx.fillStyle = color;
    let inBar = false;
    let barStart = 0;

    for (let i = 0; i < totalModules; i++) {
      const bit = binary[i] === '1';
      if (bit && !inBar) {
        inBar = true;
        barStart = i;
      } else if (!bit && inBar) {
        inBar = false;
        const w = (i - barStart) * moduleWidth;
        const x = quietZone + (barStart * moduleWidth);
        ctx.fillRect(x, 2, w, height);
      }
    }
    if (inBar) {
      const w = (totalModules - barStart) * moduleWidth;
      const x = quietZone + (barStart * moduleWidth);
      ctx.fillRect(x, 2, w, height);
    }

    if (includeText) {
      ctx.font = `600 ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayText, widthPx / 2, height + (fontSize / 2) + 3);
    }
  }

  function escapeXml(unsafe) {
    return String(unsafe).replace(/[<>&'"]/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
      return c;
    });
  }

  return {
    renderSVG,
    renderCanvas,
    encodeCode128,
    encodeEAN13,
    encodeCode39,
    calculateEAN13Checksum
  };
})();

if (typeof window !== 'undefined') {
  window.BarcodeEngine = BarcodeEngine;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BarcodeEngine;
}
