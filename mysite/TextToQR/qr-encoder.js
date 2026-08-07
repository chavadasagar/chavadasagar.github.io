/**
 * ==========================================================================
 * Custom QR Code Encoder Engine (ISO/IEC 18004 Specification)
 * 100% Native Vanilla JavaScript - Zero Third-Party Libraries
 * Features: Mode Detection, GF(256) RS Error Correction, Interleaving,
 * Matrix Layout, Alignment Patterns, Format/Version BCH, 8 Mask Penalty Evaluation
 * ==========================================================================
 */

const QREncoder = (() => {

  // ==========================================================================
  // 1. GALOIS FIELD GF(256) ARITHMETIC & REED-SOLOMON ENGINE
  // Primitive Polynomial: x^8 + x^4 + x^3 + x^2 + 1 (285 / 0x11D)
  // ==========================================================================
  const EXP_TABLE = new Uint8Array(512);
  const LOG_TABLE = new Uint8Array(256);

  // Initialize GF(256) Exp & Log tables
  (function initGaloisField() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP_TABLE[i] = x;
      LOG_TABLE[x] = i;
      x <<= 1;
      if (x & 0x100) {
        x ^= 0x11D;
      }
    }
    for (let i = 255; i < 512; i++) {
      EXP_TABLE[i] = EXP_TABLE[i - 255];
    }
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
  }

  function gfPolyMul(p1, p2) {
    const result = new Uint8Array(p1.length + p2.length - 1);
    for (let i = 0; i < p1.length; i++) {
      for (let j = 0; j < p2.length; j++) {
        result[i + j] ^= gfMul(p1[i], p2[j]);
      }
    }
    return result;
  }

  // Generate Reed-Solomon generator polynomial g(x) = (x - a^0)(x - a^1)...(x - a^(ecCount-1))
  function gfGenPoly(ecCount) {
    let g = new Uint8Array([1]);
    for (let i = 0; i < ecCount; i++) {
      g = gfPolyMul(g, new Uint8Array([1, EXP_TABLE[i]]));
    }
    return g;
  }

  // Compute Reed-Solomon error correction codewords for a message block
  function rsComputeCodewords(msg, ecCount) {
    const gen = gfGenPoly(ecCount);
    const res = new Uint8Array(msg.length + ecCount);
    res.set(msg, 0);

    for (let i = 0; i < msg.length; i++) {
      const coef = res[i];
      if (coef !== 0) {
        for (let j = 0; j < gen.length; j++) {
          res[i + j] ^= gfMul(gen[j], coef);
        }
      }
    }
    return res.slice(msg.length);
  }


  // ==========================================================================
  // 2. SPECIFICATION TABLES & METADATA (Versions 1 to 40)
  // Alignment Pattern Position Table
  // ==========================================================================
  const ALIGNMENT_PATTERN_POS = [
    [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54],
    [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74],
    [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90],
    [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106],
    [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130],
    [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142],
    [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166],
    [6, 30, 58, 86, 114, 142, 170]
  ];

  // Official ISO/IEC 18004 Table 9 RS Block Specs
  // Format: Version: { L: [totalDataBytes, ecPerBlock, g1Blocks, g1DataPerBlock, g2Blocks, g2DataPerBlock], ... }
  const RS_SPECS = {
    1:  { L: [19, 7, 1, 19, 0, 0],   M: [16, 10, 1, 16, 0, 0],   Q: [13, 13, 1, 13, 0, 0],   H: [9, 17, 1, 9, 0, 0] },
    2:  { L: [34, 10, 1, 34, 0, 0],  M: [28, 16, 1, 28, 0, 0],   Q: [22, 22, 1, 22, 0, 0],   H: [16, 28, 1, 16, 0, 0] },
    3:  { L: [55, 15, 1, 55, 0, 0],  M: [44, 26, 1, 44, 0, 0],   Q: [34, 18, 2, 17, 0, 0],   H: [26, 22, 2, 13, 0, 0] },
    4:  { L: [80, 20, 1, 80, 0, 0],  M: [64, 18, 2, 32, 0, 0],   Q: [48, 26, 2, 24, 0, 0],   H: [36, 16, 4, 9, 0, 0] },
    5:  { L: [108, 26, 1, 108, 0, 0], M: [86, 24, 2, 43, 0, 0],  Q: [62, 18, 2, 15, 2, 16],  H: [46, 22, 2, 11, 2, 12] },
    6:  { L: [136, 18, 2, 68, 0, 0], M: [108, 16, 4, 27, 0, 0],  Q: [76, 24, 4, 19, 0, 0],   H: [60, 28, 4, 15, 0, 0] },
    7:  { L: [156, 20, 2, 78, 0, 0], M: [124, 18, 4, 31, 0, 0],  Q: [88, 18, 2, 14, 4, 15],  H: [66, 26, 4, 13, 1, 14] },
    8:  { L: [194, 24, 2, 97, 0, 0], M: [154, 22, 2, 38, 2, 39], Q: [110, 22, 4, 18, 2, 19], H: [86, 26, 4, 14, 2, 15] },
    9:  { L: [232, 30, 2, 116, 0, 0],M: [182, 22, 3, 36, 2, 37], Q: [132, 20, 4, 16, 4, 17], H: [100, 24, 4, 12, 4, 13] },
    10: { L: [274, 18, 2, 68, 2, 69], M: [216, 26, 4, 43, 1, 44], Q: [154, 24, 6, 19, 2, 20], H: [122, 28, 6, 15, 2, 16] },
    11: { L: [324, 20, 4, 81, 0, 0], M: [254, 30, 1, 50, 4, 51], Q: [180, 28, 4, 22, 4, 23], H: [140, 24, 3, 12, 8, 13] },
    12: { L: [370, 24, 2, 92, 2, 93], M: [290, 22, 6, 36, 2, 37], Q: [206, 26, 4, 20, 6, 21], H: [158, 28, 7, 14, 4, 15] },
    13: { L: [428, 26, 4, 107, 0, 0],M: [334, 22, 8, 37, 1, 38], Q: [244, 24, 8, 20, 4, 21], H: [180, 22, 12, 11, 4, 12] },
    14: { L: [461, 30, 3, 115, 1, 116], M: [365, 24, 4, 40, 5, 41], Q: [261, 20, 11, 16, 5, 17], H: [197, 24, 11, 12, 5, 13] },
    15: { L: [523, 22, 5, 87, 1, 88],  M: [415, 24, 5, 41, 5, 42], Q: [295, 30, 5, 24, 7, 25], H: [223, 24, 11, 12, 7, 13] },
    16: { L: [589, 24, 5, 98, 1, 99],  M: [453, 28, 7, 45, 3, 46], Q: [325, 24, 15, 19, 2, 20], H: [253, 30, 3, 15, 13, 16] },
    17: { L: [647, 28, 1, 107, 5, 108], M: [507, 28, 10, 46, 1, 47], Q: [367, 28, 1, 22, 15, 23], H: [283, 28, 2, 14, 17, 15] },
    18: { L: [721, 30, 5, 120, 1, 121], M: [563, 26, 9, 43, 4, 44], Q: [397, 28, 17, 22, 1, 23], H: [313, 28, 2, 14, 19, 15] },
    19: { L: [795, 28, 3, 113, 4, 114], M: [627, 26, 3, 44, 11, 45], Q: [445, 26, 17, 21, 4, 22], H: [341, 26, 9, 13, 16, 14] },
    20: { L: [861, 28, 3, 107, 5, 108], M: [669, 26, 3, 41, 13, 42], Q: [485, 30, 15, 24, 5, 25], H: [310, 28, 15, 12, 10, 13] },
    21: { L: [932, 28, 4, 116, 4, 117], M: [752, 26, 4, 41, 14, 42], Q: [466, 28, 17, 22, 4, 23], H: [282, 28, 4, 12, 18, 13] },
    22: { L: [1006, 28, 2, 111, 7, 112], M: [854, 28, 6, 42, 14, 43], Q: [568, 30, 7, 24, 16, 25], H: [292, 28, 20, 12, 4, 13] },
    23: { L: [1094, 30, 4, 121, 5, 122], M: [895, 28, 8, 42, 13, 43], Q: [614, 30, 11, 24, 14, 25], H: [308, 30, 4, 11, 22, 12] },
    24: { L: [1174, 30, 6, 117, 4, 118], M: [936, 28, 10, 42, 12, 43], Q: [664, 30, 11, 24, 16, 25], H: [330, 30, 6, 11, 22, 12] },
    25: { L: [1276, 26, 8, 106, 4, 107], M: [959, 28, 9, 43, 13, 44], Q: [668, 30, 7, 24, 20, 25], H: [352, 30, 8, 11, 22, 12] },
    26: { L: [1370, 28, 10, 114, 2, 115], M: [1005, 28, 3, 41, 21, 42], Q: [764, 30, 11, 24, 20, 25], H: [380, 30, 4, 11, 28, 12] },
    27: { L: [1468, 30, 8, 122, 4, 123], M: [1089, 28, 3, 41, 23, 42], Q: [814, 30, 11, 24, 22, 25], H: [383, 30, 1, 11, 31, 12] },
    28: { L: [1531, 30, 3, 117, 10, 118], M: [1155, 28, 21, 41, 7, 42], Q: [806, 30, 19, 24, 14, 25], H: [393, 30, 15, 11, 19, 12] },
    29: { L: [1631, 30, 7, 116, 7, 117], M: [1199, 28, 19, 41, 10, 42], Q: [854, 30, 21, 24, 14, 25], H: [421, 30, 11, 11, 25, 12] },
    30: { L: [1735, 30, 5, 115, 10, 116], M: [1283, 28, 19, 41, 12, 42], Q: [867, 30, 33, 24, 3, 25], H: [428, 30, 16, 11, 21, 12] },
    31: { L: [1843, 30, 13, 115, 3, 116], M: [1384, 28, 2, 41, 31, 42], Q: [927, 30, 23, 24, 15, 25], H: [442, 30, 26, 11, 13, 12] },
    32: { L: [1955, 30, 17, 115, 0, 0], M: [1446, 28, 24, 41, 11, 42], Q: [1027, 30, 23, 24, 19, 25], H: [449, 30, 31, 11, 9, 12] },
    33: { L: [2071, 30, 17, 115, 1, 116], M: [1764, 28, 42, 41, 1, 42], Q: [1131, 30, 19, 24, 27, 25], H: [498, 30, 18, 11, 25, 12] },
    34: { L: [2191, 30, 13, 115, 6, 116], M: [1880, 28, 10, 41, 35, 42], Q: [1189, 30, 11, 24, 37, 25], H: [526, 30, 14, 11, 31, 12] },
    35: { L: [2306, 30, 12, 121, 7, 122], M: [1987, 28, 29, 41, 19, 42], Q: [1264, 30, 11, 24, 40, 25], H: [550, 30, 14, 11, 33, 12] },
    36: { L: [2434, 30, 6, 121, 14, 122], M: [2059, 28, 41, 41, 9, 42], Q: [1339, 30, 11, 24, 43, 25], H: [574, 30, 14, 11, 35, 12] },
    37: { L: [2566, 30, 17, 122, 4, 123], M: [2158, 28, 26, 41, 26, 42], Q: [1414, 30, 11, 24, 46, 25], H: [622, 30, 14, 11, 39, 12] },
    38: { L: [2702, 30, 4, 122, 18, 123], M: [2237, 28, 31, 41, 23, 42], Q: [1514, 30, 11, 24, 50, 25], H: [670, 30, 14, 11, 43, 12] },
    39: { L: [2812, 30, 20, 117, 4, 118], M: [2324, 28, 28, 41, 28, 42], Q: [1614, 30, 11, 24, 54, 25], H: [718, 30, 14, 11, 47, 12] },
    40: { L: [2956, 30, 19, 118, 6, 119], M: [2543, 28, 61, 41, 1, 42], Q: [1714, 30, 11, 24, 58, 25], H: [736, 30, 20, 11, 43, 12] }
  };

  function getRSBlockSpec(version, ecl) {
    if (RS_SPECS[version] && RS_SPECS[version][ecl]) {
      return RS_SPECS[version][ecl];
    }
    return RS_SPECS[40]['L'];
  }

  // ==========================================================================
  // 3. DATA ANALYSIS & BITSTREAM GENERATOR
  // Detects Numeric, Alphanumeric, or Byte Mode
  // ==========================================================================
  function detectMode(text) {
    if (/^[0-9]+$/.test(text)) return 'Numeric';
    if (/^[0-9A-Z $%*+\-./:]+$/.test(text)) return 'Alphanumeric';
    return 'Byte';
  }

  // Length indicator bit counts based on QR Version
  function getCharCountBits(version, mode) {
    if (version >= 1 && version <= 9) {
      return mode === 'Numeric' ? 10 : mode === 'Alphanumeric' ? 9 : 8;
    } else if (version <= 26) {
      return mode === 'Numeric' ? 12 : mode === 'Alphanumeric' ? 11 : 16;
    } else {
      return mode === 'Numeric' ? 14 : mode === 'Alphanumeric' ? 13 : 16;
    }
  }

  const ALPHANUM_MAP = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

  class BitBuffer {
    constructor() {
      this.buffer = [];
      this.length = 0;
    }

    put(num, length) {
      for (let i = 0; i < length; i++) {
        const bit = ((num >>> (length - i - 1)) & 1) === 1;
        this.putBit(bit);
      }
    }

    putBit(bit) {
      const bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) {
        this.buffer.push(0);
      }
      if (bit) {
        this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
      }
      this.length++;
    }

    getBytes() {
      return new Uint8Array(this.buffer);
    }
  }

  function encodeDataToBits(text, mode, version, targetDataBytes) {
    const bitBuf = new BitBuffer();

    // 1. Mode Indicator
    const modeBits = mode === 'Numeric' ? 0b0001 : mode === 'Alphanumeric' ? 0b0010 : 0b0100;
    bitBuf.put(modeBits, 4);

    // 2. Character Count Indicator
    const countBits = getCharCountBits(version, mode);
    const dataLen = mode === 'Byte' ? new TextEncoder().encode(text).length : text.length;
    bitBuf.put(dataLen, countBits);

    // 3. Payload Data Encoding
    if (mode === 'Numeric') {
      for (let i = 0; i < text.length; i += 3) {
        const chunk = text.substr(i, 3);
        const len = chunk.length;
        const val = parseInt(chunk, 10);
        const bits = len === 3 ? 10 : len === 2 ? 7 : 4;
        bitBuf.put(val, bits);
      }
    } else if (mode === 'Alphanumeric') {
      for (let i = 0; i < text.length; i += 2) {
        if (i + 1 < text.length) {
          const val = ALPHANUM_MAP.indexOf(text[i]) * 45 + ALPHANUM_MAP.indexOf(text[i + 1]);
          bitBuf.put(val, 11);
        } else {
          const val = ALPHANUM_MAP.indexOf(text[i]);
          bitBuf.put(val, 6);
        }
      }
    } else {
      // Byte Mode (UTF-8 encoding)
      const encoder = new TextEncoder();
      const utf8Bytes = encoder.encode(text);
      for (let i = 0; i < utf8Bytes.length; i++) {
        bitBuf.put(utf8Bytes[i], 8);
      }
    }

    // 4. Terminator (up to 4 zero bits)
    const targetBits = targetDataBytes * 8;
    const remainingBits = targetBits - bitBuf.length;
    if (remainingBits > 0) {
      bitBuf.put(0, Math.min(4, remainingBits));
    }

    // 5. Byte Alignment Padding
    while (bitBuf.length % 8 !== 0) {
      bitBuf.putBit(false);
    }

    // 6. Alternate Pad Bytes 0xEC (236) & 0x11 (17) until capacity reached
    const padBytes = [0xEC, 0x11];
    let padIdx = 0;
    while (bitBuf.length / 8 < targetDataBytes) {
      bitBuf.put(padBytes[padIdx], 8);
      padIdx = (padIdx + 1) % 2;
    }

    return bitBuf.getBytes();
  }


  // ==========================================================================
  // 4. RS BLOCK INTERLEAVING & CODING ENGINE
  // ==========================================================================
  function createInterleavedCodewords(dataBytes, version, ecl) {
    const spec = getRSBlockSpec(version, ecl);
    const [totalDataBytes, ecPerBlock, g1Blocks, g1DataBytes, g2Blocks, g2DataBytes] = spec;

    const blocksData = [];
    const blocksEC = [];
    let offset = 0;

    // Group 1 Blocks
    for (let i = 0; i < g1Blocks; i++) {
      const block = dataBytes.slice(offset, offset + g1DataBytes);
      offset += g1DataBytes;
      blocksData.push(block);
      blocksEC.push(rsComputeCodewords(block, ecPerBlock));
    }

    // Group 2 Blocks
    for (let i = 0; i < g2Blocks; i++) {
      const block = dataBytes.slice(offset, offset + g2DataBytes);
      offset += g2DataBytes;
      blocksData.push(block);
      blocksEC.push(rsComputeCodewords(block, ecPerBlock));
    }

    // Interleave Data Bytes
    const interleaved = [];
    const maxDataLen = Math.max(g1DataBytes, g2DataBytes || 0);

    for (let i = 0; i < maxDataLen; i++) {
      for (let b = 0; b < blocksData.length; b++) {
        if (i < blocksData[b].length) {
          interleaved.push(blocksData[b][i]);
        }
      }
    }

    // Interleave Error Correction Bytes
    for (let i = 0; i < ecPerBlock; i++) {
      for (let b = 0; b < blocksEC.length; b++) {
        interleaved.push(blocksEC[b][i]);
      }
    }

    return new Uint8Array(interleaved);
  }


  // ==========================================================================
  // 5. MATRIX LAYOUT & PATTERN PLACEMENT
  // ==========================================================================
  class QRMatrix {
    constructor(version) {
      this.version = version;
      this.size = version * 4 + 17;
      // Matrix values: null = unassigned, 0 = white/light, 1 = black/dark
      this.modules = Array.from({ length: this.size }, () => new Array(this.size).fill(null));
      this.isFunction = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
    }

    setModule(r, c, val, isFunc = true) {
      if (r >= 0 && r < this.size && c >= 0 && c < this.size) {
        this.modules[r][c] = val ? 1 : 0;
        if (isFunc) this.isFunction[r][c] = true;
      }
    }

    // Draw 7x7 Finder Pattern + 1-module Separator
    placeFinderPattern(row, col) {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const mr = row + r;
          const mc = col + c;
          if (mr >= 0 && mr < this.size && mc >= 0 && mc < this.size) {
            let isDark = false;
            if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
              if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
                isDark = true;
              }
            }
            this.setModule(mr, mc, isDark, true);
          }
        }
      }
    }

    // Draw 5x5 Alignment Pattern
    placeAlignmentPattern(row, col) {
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const isDark = (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0));
          this.setModule(row + r, col + c, isDark, true);
        }
      }
    }

    // Setup function patterns per ISO/IEC 18004
    // ORDER IS CRITICAL: Finder -> Alignment -> Timing -> Format/Version reservations
    setupFunctionPatterns() {
      // 1. Finder Patterns (+ separators)
      this.placeFinderPattern(0, 0); // Top-Left
      this.placeFinderPattern(0, this.size - 7); // Top-Right
      this.placeFinderPattern(this.size - 7, 0); // Bottom-Left

      // 2. Alignment Patterns (Version >= 2) - MUST BE PLACED BEFORE TIMING PATTERNS!
      const alignPos = ALIGNMENT_PATTERN_POS[this.version] || [];
      for (let i = 0; i < alignPos.length; i++) {
        for (let j = 0; j < alignPos.length; j++) {
          const r = alignPos[i];
          const c = alignPos[j];
          if (!this.isFunction[r][c]) {
            this.placeAlignmentPattern(r, c);
          }
        }
      }

      // 3. Timing Patterns (row 6 and col 6) - Placed after Alignment so it skips claims
      for (let i = 8; i < this.size - 8; i++) {
        if (!this.isFunction[6][i]) {
          this.setModule(6, i, i % 2 === 0, true);
        }
        if (!this.isFunction[i][6]) {
          this.setModule(i, 6, i % 2 === 0, true);
        }
      }

      // 4. Reserve Format Info Area (around finders)
      for (let i = 0; i < 9; i++) {
        if (i !== 6) {
          this.setModule(8, i, 0, true);
          this.setModule(i, 8, 0, true);
        }
      }
      for (let i = 0; i < 8; i++) {
        this.setModule(8, this.size - 1 - i, 0, true);
        this.setModule(this.size - 1 - i, 8, 0, true);
      }
      // Fixed Dark Module at (4V + 9, 8)
      this.setModule(this.size - 8, 8, 1, true);

      // 5. Reserve Version Info Area (Version >= 7)
      if (this.version >= 7) {
        for (let r = 0; r < 6; r++) {
          for (let c = 0; c < 3; c++) {
            this.setModule(this.size - 11 + c, r, 0, true);
            this.setModule(r, this.size - 11 + c, 0, true);
          }
        }
      }
    }

    // Place data bits in Right-to-Left 2-col upward/downward zigzag
    placeDataBits(codewords) {
      let bitIdx = 0;
      let upward = true;

      for (let right = this.size - 1; right > 0; right -= 2) {
        if (right === 6) right = 5; // Skip Vertical Timing Column

        const rows = [];
        if (upward) {
          for (let r = this.size - 1; r >= 0; r--) rows.push(r);
        } else {
          for (let r = 0; r < this.size; r++) rows.push(r);
        }

        for (const r of rows) {
          for (let col = right; col > right - 2; col--) {
            if (!this.isFunction[r][col]) {
              let bit = 0;
              if (bitIdx < codewords.length * 8) {
                const byteIdx = Math.floor(bitIdx / 8);
                const bitShift = 7 - (bitIdx % 8);
                bit = (codewords[byteIdx] >>> bitShift) & 1;
                bitIdx++;
              }
              this.modules[r][col] = bit;
            }
          }
        }
        upward = !upward;
      }
    }
  }


  // ==========================================================================
  // 6. FORMAT & VERSION BCH ENCODING
  // ==========================================================================
  function getBCHFormatBits(ecl, maskId) {
    const eclMap = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 };
    const data = (eclMap[ecl] << 3) | maskId;
    
    // BCH(15, 5) division polynomial g(x) = x^10 + x^8 + x^5 + x^4 + x^2 + x + 1 (0x537)
    let rem = data << 10;
    for (let i = 4; i >= 0; i--) {
      if ((rem >>> (i + 10)) & 1) {
        rem ^= (0x537 << i);
      }
    }
    const formatBits = ((data << 10) | rem) ^ 0x5412; // XOR mask 101010000010010
    return formatBits;
  }

  function getBCHVersionBits(version) {
    if (version < 7) return 0;
    // BCH(18, 6) division polynomial g(x) = x^12 + x^11 + x^10 + x^9 + x^8 + x^5 + x^2 + 1 (0x1F25)
    let rem = version << 12;
    for (let i = 5; i >= 0; i--) {
      if ((rem >>> (i + 12)) & 1) {
        rem ^= (0x1F25 << i);
      }
    }
    return (version << 12) | rem;
  }


  // ==========================================================================
  // 7. DATA MASKING & 4 PENALTY EVALUATION RULES
  // Mask condition functions (0 to 7)
  // ==========================================================================
  const MASK_FUNCTIONS = [
    (r, c) => (r + c) % 2 === 0,
    (r, c) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2 + (r * c) % 3) === 0,
    (r, c) => (((r * c) % 2 + (r * c) % 3) % 2) === 0,
    (r, c) => (((r * c) % 3 + (r + c) % 2) % 2) === 0,
  ];

  function calculatePenaltyScore(matrix) {
    const N = matrix.size;
    let penalty = 0;

    // Rule 1: 5 or more consecutive modules of same color in row/col
    for (let r = 0; r < N; r++) {
      let rowRunColor = null, rowRunLen = 0;
      let colRunColor = null, colRunLen = 0;
      for (let c = 0; c < N; c++) {
        // Row check
        const rVal = matrix.modules[r][c];
        if (rVal === rowRunColor) {
          rowRunLen++;
        } else {
          if (rowRunLen >= 5) penalty += 3 + (rowRunLen - 5);
          rowRunColor = rVal;
          rowRunLen = 1;
        }
        // Col check
        const cVal = matrix.modules[c][r];
        if (cVal === colRunColor) {
          colRunLen++;
        } else {
          if (colRunLen >= 5) penalty += 3 + (colRunLen - 5);
          colRunColor = cVal;
          colRunLen = 1;
        }
      }
      if (rowRunLen >= 5) penalty += 3 + (rowRunLen - 5);
      if (colRunLen >= 5) penalty += 3 + (colRunLen - 5);
    }

    // Rule 2: 2x2 blocks of same color
    for (let r = 0; r < N - 1; r++) {
      for (let c = 0; c < N - 1; c++) {
        const val = matrix.modules[r][c];
        if (val === matrix.modules[r + 1][c] &&
            val === matrix.modules[r][c + 1] &&
            val === matrix.modules[r + 1][c + 1]) {
          penalty += 3;
        }
      }
    }

    // Rule 3: 1:1:3:1:1 pattern highlights surrounded by 4 white modules
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N - 6; c++) {
        // Row 1-0-1-1-1-0-1
        if (matrix.modules[r][c] === 1 && matrix.modules[r][c+1] === 0 &&
            matrix.modules[r][c+2] === 1 && matrix.modules[r][c+3] === 1 &&
            matrix.modules[r][c+4] === 1 && matrix.modules[r][c+5] === 0 &&
            matrix.modules[r][c+6] === 1) {
          if (c >= 4 || c + 10 < N) penalty += 40;
        }
        // Col 1-0-1-1-1-0-1
        if (matrix.modules[c][r] === 1 && matrix.modules[c+1][r] === 0 &&
            matrix.modules[c+2][r] === 1 && matrix.modules[c+3][r] === 1 &&
            matrix.modules[c+4][r] === 1 && matrix.modules[c+5][r] === 0 &&
            matrix.modules[c+6][r] === 1) {
          if (c >= 4 || c + 10 < N) penalty += 40;
        }
      }
    }

    // Rule 4: Total dark module balance ratio
    let darkCount = 0;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (matrix.modules[r][c] === 1) darkCount++;
      }
    }
    const percentDark = (darkCount / (N * N)) * 100;
    const prev5 = Math.floor(percentDark / 5) * 5;
    const next5 = Math.ceil(percentDark / 5) * 5;
    const dev1 = Math.abs(prev5 - 50) / 5;
    const dev2 = Math.abs(next5 - 50) / 5;
    penalty += Math.min(dev1, dev2) * 10;

    return penalty;
  }

  function applyFormatAndVersionBits(matrix, ecl, maskId) {
    const formatBits = getBCHFormatBits(ecl, maskId);
    const N = matrix.size;

    // Top-Left Finder Format Bits (15 bits)
    const seqTL = [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
      [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
    ];
    // Bottom-Left & Top-Right Format Bits
    const seqBLTR = [
      [N - 1, 8], [N - 2, 8], [N - 3, 8], [N - 4, 8], [N - 5, 8], [N - 6, 8], [N - 7, 8],
      [8, N - 8], [8, N - 7], [8, N - 6], [8, N - 5], [8, N - 4], [8, N - 3], [8, N - 2], [8, N - 1]
    ];

    for (let i = 0; i < 15; i++) {
      const bit = (formatBits >>> i) & 1;
      const [r1, c1] = seqTL[i];
      const [r2, c2] = seqBLTR[i];
      matrix.setModule(r1, c1, bit, true);
      matrix.setModule(r2, c2, bit, true);
    }

    // Version Info Bits (Version >= 7)
    if (matrix.version >= 7) {
      const versionBits = getBCHVersionBits(matrix.version);
      for (let i = 0; i < 18; i++) {
        const bit = (versionBits >>> i) & 1;
        const r = Math.floor(i / 3);
        const c = (i % 3) + matrix.size - 11;
        matrix.setModule(r, c, bit, true); // Top-Right
        matrix.setModule(c, r, bit, true); // Bottom-Left
      }
    }
  }


  // ==========================================================================
  // 8. MAIN ENCODER ENTRYPOINT
  // ==========================================================================
  function encode(text, options = {}) {
    if (!text || text.length === 0) {
      throw new Error('Input content cannot be empty');
    }

    const ecl = options.ecl || 'M';
    const mode = options.mode || detectMode(text);

    // Find smallest QR version (1 to 40) that fits content length
    let selectedVersion = null;
    let spec = null;

    for (let v = 1; v <= 40; v++) {
      const s = getRSBlockSpec(v, ecl);
      const targetDataBytes = s[0];
      
      // Calculate bits required
      const countBits = getCharCountBits(v, mode);
      let payloadBits = 0;
      if (mode === 'Numeric') {
        payloadBits = Math.ceil(text.length / 3) * 10;
      } else if (mode === 'Alphanumeric') {
        payloadBits = Math.floor(text.length / 2) * 11 + (text.length % 2 ? 6 : 0);
      } else {
        payloadBits = new TextEncoder().encode(text).length * 8;
      }

      const totalBits = 4 + countBits + payloadBits;
      if (totalBits <= targetDataBytes * 8) {
        selectedVersion = v;
        spec = s;
        break;
      }
    }

    if (!selectedVersion) {
      throw new Error('Content exceeds maximum QR code capacity (Version 40)');
    }

    // 1. Bitstream Generation
    const dataBytes = encodeDataToBits(text, mode, selectedVersion, spec[0]);

    // 2. Reed-Solomon Interleaving
    const finalCodewords = createInterleavedCodewords(dataBytes, selectedVersion, ecl);

    // 3. Matrix Construction & Placement
    const baseMatrix = new QRMatrix(selectedVersion);
    baseMatrix.setupFunctionPatterns();
    baseMatrix.placeDataBits(finalCodewords);

    // 4. Test all 8 Masks to find minimum penalty score
    let bestMaskId = 0;
    let minPenalty = Infinity;
    let bestMatrix = null;

    for (let maskId = 0; maskId < 8; maskId++) {
      const testMatrix = new QRMatrix(selectedVersion);
      testMatrix.isFunction = baseMatrix.isFunction;
      
      const maskFunc = MASK_FUNCTIONS[maskId];
      for (let r = 0; r < baseMatrix.size; r++) {
        for (let c = 0; c < baseMatrix.size; c++) {
          const val = baseMatrix.modules[r][c];
          if (baseMatrix.isFunction[r][c]) {
            testMatrix.modules[r][c] = val;
          } else {
            testMatrix.modules[r][c] = maskFunc(r, c) ? (val ^ 1) : val;
          }
        }
      }

      applyFormatAndVersionBits(testMatrix, ecl, maskId);
      const score = calculatePenaltyScore(testMatrix);

      if (score < minPenalty) {
        minPenalty = score;
        bestMaskId = maskId;
        bestMatrix = testMatrix;
      }
    }

    return {
      version: selectedVersion,
      ecl,
      mode,
      maskId: bestMaskId,
      size: bestMatrix.size,
      matrix: bestMatrix.modules,
      ecBytes: spec[1]
    };
  }

  // Canvas Renderer Function
  function renderToCanvas(canvas, qrResult, options = {}) {
    const size = options.size || 400;
    const fgColor = options.fgColor || '#0F172A';
    const bgColor = options.bgColor || '#FFFFFF';

    const matrix = qrResult.matrix;
    const moduleCount = qrResult.size;
    const margin = 2; // 2 modules quiet zone
    const totalModules = moduleCount + margin * 2;
    const cellSize = size / totalModules;

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    // Render modules
    ctx.fillStyle = fgColor;
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (matrix[r][c] === 1) {
          const x = Math.floor((c + margin) * cellSize);
          const y = Math.floor((r + margin) * cellSize);
          const w = Math.ceil(cellSize);
          const h = Math.ceil(cellSize);
          ctx.fillRect(x, y, w, h);
        }
      }
    }
  }

  // Expose Public API
  return {
    encode,
    detectMode,
    renderToCanvas
  };

})();
