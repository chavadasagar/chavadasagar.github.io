/**
 * ==========================================================================
 * QR Studio Engine - Pure Vanilla JavaScript (Zero External Dependencies)
 * Includes:
 * 1. ISO/IEC 18004 QR Code Matrix Generator (Versions 1-40, ECC L/M/Q/H)
 * 2. Canvas Stylizer (Square, Rounded, Dots, Squircles, Custom Colors & Logo Badge)
 * 3. High-Precision QR Decoder Engine (Native BarcodeDetector + Pure JS Decoder)
 * ==========================================================================
 */

const QREngine = (() => {

  // ==========================================================================
  // SECTION 1: QR CODE MATRIX GENERATOR (ISO/IEC 18004)
  // ==========================================================================

  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);

  (function initGaloisField() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    for (let i = 255; i < 512; i++) {
      GF_EXP[i] = GF_EXP[i - 255];
    }
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
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

  function gfGenPoly(ecCount) {
    let g = new Uint8Array([1]);
    for (let i = 0; i < ecCount; i++) {
      g = gfPolyMul(g, new Uint8Array([1, GF_EXP[i]]));
    }
    return g;
  }

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

  // RS Block Specs: [totalDataBytes, ecPerBlock, g1Blocks, g1DataPerBlock, g2Blocks, g2DataPerBlock]
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
    20: { L: [861, 28, 3, 107, 5, 108], M: [669, 26, 3, 41, 13, 42], Q: [485, 30, 15, 24, 5, 25], H: [385, 28, 15, 12, 10, 13] },
    21: { L: [932, 28, 4, 116, 4, 117], M: [714, 26, 4, 41, 14, 42], Q: [512, 28, 17, 22, 4, 23], H: [406, 28, 4, 12, 18, 13] },
    22: { L: [1006, 28, 2, 111, 7, 112], M: [782, 28, 6, 42, 14, 43], Q: [568, 30, 7, 24, 16, 25], H: [442, 28, 20, 12, 4, 13] },
    23: { L: [1094, 30, 4, 121, 5, 122], M: [860, 28, 8, 42, 13, 43], Q: [614, 30, 11, 24, 14, 25], H: [464, 30, 4, 11, 22, 12] },
    24: { L: [1174, 30, 6, 117, 4, 118], M: [914, 28, 10, 42, 12, 43], Q: [664, 30, 11, 24, 16, 25], H: [514, 30, 6, 11, 22, 12] },
    25: { L: [1276, 26, 8, 106, 4, 107], M: [1000, 28, 9, 43, 13, 44], Q: [718, 30, 7, 24, 20, 25], H: [538, 30, 8, 11, 22, 12] },
    26: { L: [1370, 28, 10, 114, 2, 115], M: [1062, 28, 3, 41, 21, 42], Q: [754, 30, 11, 24, 20, 25], H: [596, 30, 4, 11, 28, 12] },
    27: { L: [1468, 30, 8, 122, 4, 123], M: [1128, 28, 3, 41, 23, 42], Q: [808, 30, 11, 24, 22, 25], H: [628, 30, 1, 11, 31, 12] },
    28: { L: [1531, 30, 3, 117, 10, 118], M: [1193, 28, 21, 41, 7, 42], Q: [871, 30, 19, 24, 14, 25], H: [661, 30, 15, 11, 19, 12] },
    29: { L: [1631, 30, 7, 116, 7, 117], M: [1267, 28, 19, 41, 10, 42], Q: [911, 30, 21, 24, 14, 25], H: [701, 30, 11, 11, 25, 12] },
    30: { L: [1735, 30, 5, 115, 10, 116], M: [1373, 28, 19, 41, 12, 42], Q: [985, 30, 33, 24, 3, 25], H: [745, 30, 16, 11, 21, 12] },
    31: { L: [1843, 30, 13, 115, 3, 116], M: [1455, 28, 2, 41, 31, 42], Q: [1033, 30, 23, 24, 15, 25], H: [793, 30, 26, 11, 13, 12] },
    32: { L: [1955, 30, 17, 115, 0, 0], M: [1541, 28, 24, 41, 11, 42], Q: [1115, 30, 23, 24, 19, 25], H: [845, 30, 31, 11, 9, 12] },
    33: { L: [2071, 30, 17, 115, 1, 116], M: [1631, 28, 42, 41, 1, 42], Q: [1171, 30, 19, 24, 27, 25], H: [901, 30, 18, 11, 25, 12] },
    34: { L: [2191, 30, 13, 115, 6, 116], M: [1725, 28, 10, 41, 35, 42], Q: [1231, 30, 11, 24, 37, 25], H: [961, 30, 14, 11, 31, 12] },
    35: { L: [2306, 30, 12, 121, 7, 122], M: [1812, 28, 29, 41, 19, 42], Q: [1286, 30, 11, 24, 40, 25], H: [986, 30, 14, 11, 33, 12] },
    36: { L: [2434, 30, 6, 121, 14, 122], M: [1914, 28, 41, 41, 9, 42], Q: [1354, 30, 11, 24, 43, 25], H: [1054, 30, 14, 11, 35, 12] },
    37: { L: [2566, 30, 17, 122, 4, 123], M: [1992, 28, 26, 41, 26, 42], Q: [1426, 30, 11, 24, 46, 25], H: [1096, 30, 14, 11, 39, 12] },
    38: { L: [2702, 30, 4, 122, 18, 123], M: [2102, 28, 31, 41, 23, 42], Q: [1502, 30, 11, 24, 50, 25], H: [1142, 30, 14, 11, 43, 12] },
    39: { L: [2812, 30, 20, 117, 4, 118], M: [2216, 28, 28, 41, 28, 42], Q: [1582, 30, 11, 24, 54, 25], H: [1222, 30, 14, 11, 47, 12] },
    40: { L: [2956, 30, 19, 118, 6, 119], M: [2334, 28, 61, 41, 1, 42], Q: [1666, 30, 11, 24, 58, 25], H: [1276, 30, 20, 11, 43, 12] }
  };

  const FORMAT_INFO_TABLE = [
    [0x77C4, 0x72F3, 0x7DAA, 0x789D, 0x662F, 0x6318, 0x6C41, 0x6976], // L
    [0x5412, 0x5125, 0x5E7C, 0x5B4B, 0x45F9, 0x40CE, 0x4F97, 0x4AA0], // M
    [0x355F, 0x3068, 0x3F31, 0x3A06, 0x24B4, 0x2183, 0x2EDA, 0x2BED], // Q
    [0x1689, 0x13BE, 0x1CE7, 0x19D0, 0x0762, 0x0255, 0x0D0C, 0x083B]  // H
  ];

  const VERSION_INFO_TABLE = [
    0, 0, 0, 0, 0, 0, 0,
    0x07C94, 0x085BC, 0x09A99, 0x0A4D3, 0x0BBF6, 0x0C762, 0x0D847, 0x0E60D,
    0x0F928, 0x10B78, 0x1145D, 0x12A17, 0x13532, 0x149A6, 0x15683, 0x168C9,
    0x177EC, 0x18EC4, 0x191E1, 0x1AFAB, 0x1B08E, 0x1CC1A, 0x1D33F, 0x1ED75,
    0x1F250, 0x209D5, 0x216F0, 0x228BA, 0x2379F, 0x24B0B, 0x2542E, 0x26A64,
    0x27541, 0x28C69
  ];

  const ALPHANUM_MAP = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

  class BitBuffer {
    constructor() {
      this.buffer = [];
      this.length = 0;
    }
    put(num, length) {
      for (let i = 0; i < length; i++) {
        this.putBit(((num >>> (length - i - 1)) & 1) === 1);
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

  function detectOptimalMode(dataStr) {
    if (/^[0-9]+$/.test(dataStr)) return 'NUMERIC';
    if (/^[0-9A-Z $%*+\-./:]+$/.test(dataStr)) return 'ALPHANUMERIC';
    return 'BYTE';
  }

  function encodeData(dataStr, mode, version) {
    const bb = new BitBuffer();
    const isV1to9 = version <= 9;
    const isV10to26 = version >= 10 && version <= 26;

    if (mode === 'NUMERIC') {
      bb.put(0b0001, 4);
      const countBits = isV1to9 ? 10 : (isV10to26 ? 12 : 14);
      bb.put(dataStr.length, countBits);
      for (let i = 0; i < dataStr.length; i += 3) {
        const chunk = dataStr.slice(i, i + 3);
        if (chunk.length === 3) bb.put(parseInt(chunk, 10), 10);
        else if (chunk.length === 2) bb.put(parseInt(chunk, 10), 7);
        else bb.put(parseInt(chunk, 10), 4);
      }
    } else if (mode === 'ALPHANUMERIC') {
      bb.put(0b0010, 4);
      const countBits = isV1to9 ? 9 : (isV10to26 ? 11 : 13);
      bb.put(dataStr.length, countBits);
      for (let i = 0; i < dataStr.length; i += 2) {
        if (i + 1 < dataStr.length) {
          const val = ALPHANUM_MAP.indexOf(dataStr[i]) * 45 + ALPHANUM_MAP.indexOf(dataStr[i + 1]);
          bb.put(val, 11);
        } else {
          bb.put(ALPHANUM_MAP.indexOf(dataStr[i]), 6);
        }
      }
    } else {
      // UTF-8 Byte Mode
      bb.put(0b0100, 4);
      const utf8Bytes = new TextEncoder().encode(dataStr);
      const countBits = isV1to9 ? 8 : 16;
      bb.put(utf8Bytes.length, countBits);
      for (let i = 0; i < utf8Bytes.length; i++) {
        bb.put(utf8Bytes[i], 8);
      }
    }
    return bb;
  }

  function determineMinimumVersion(dataStr, ecl) {
    const mode = detectOptimalMode(dataStr);
    for (let v = 1; v <= 40; v++) {
      const spec = RS_SPECS[v][ecl];
      const maxDataBytes = spec[0];
      const bb = encodeData(dataStr, mode, v);
      const totalBitsNeeded = bb.length + 4; // terminator
      const totalBytesNeeded = Math.ceil(totalBitsNeeded / 8);
      if (totalBytesNeeded <= maxDataBytes) {
        return { version: v, mode };
      }
    }
    throw new Error('Data payload too large for QR specification (Max V40 exceeded)');
  }

  function generateBitstream(dataStr, ecl, version, mode) {
    const spec = RS_SPECS[version][ecl];
    const totalDataBytes = spec[0];
    const bb = encodeData(dataStr, mode, version);

    // 1. Terminator bits (up to 4 zeroes)
    const bitsRemaining = (totalDataBytes * 8) - bb.length;
    const termLength = Math.min(4, Math.max(0, bitsRemaining));
    bb.put(0, termLength);

    // 2. Align to byte boundary
    while (bb.length % 8 !== 0) {
      bb.putBit(false);
    }

    // 3. Pad bytes 0xEC, 0x11 until totalDataBytes reached
    const padBytes = [0xEC, 0x11];
    let padIdx = 0;
    while (bb.length < totalDataBytes * 8) {
      bb.put(padBytes[padIdx % 2], 8);
      padIdx++;
    }

    return bb.getBytes();
  }

  function structureBlocksAndInterleave(dataBytes, ecl, version) {
    const spec = RS_SPECS[version][ecl];
    const ecCount = spec[1];
    const g1Count = spec[2];
    const g1DataLen = spec[3];
    const g2Count = spec[4];
    const g2DataLen = spec[5];

    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;

    for (let i = 0; i < g1Count; i++) {
      const block = dataBytes.slice(offset, offset + g1DataLen);
      dataBlocks.push(block);
      ecBlocks.push(rsComputeCodewords(block, ecCount));
      offset += g1DataLen;
    }
    for (let i = 0; i < g2Count; i++) {
      const block = dataBytes.slice(offset, offset + g2DataLen);
      dataBlocks.push(block);
      ecBlocks.push(rsComputeCodewords(block, ecCount));
      offset += g2DataLen;
    }

    // Interleave data codewords
    const finalStream = [];
    const maxDataLen = Math.max(g1DataLen, g2DataLen);
    for (let i = 0; i < maxDataLen; i++) {
      for (let b = 0; b < dataBlocks.length; b++) {
        if (i < dataBlocks[b].length) {
          finalStream.push(dataBlocks[b][i]);
        }
      }
    }

    // Interleave error correction codewords
    for (let i = 0; i < ecCount; i++) {
      for (let b = 0; b < ecBlocks.length; b++) {
        if (i < ecBlocks[b].length) {
          finalStream.push(ecBlocks[b][i]);
        }
      }
    }

    return new Uint8Array(finalStream);
  }

  function createMatrix(version) {
    const size = version * 4 + 17;
    const matrix = [];
    const reserved = [];
    for (let r = 0; r < size; r++) {
      matrix.push(new Int8Array(size).fill(0));
      reserved.push(new Uint8Array(size).fill(0));
    }
    return { size, matrix, reserved };
  }

  function placeFinderPattern(grid, row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < grid.size && nc >= 0 && nc < grid.size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
              grid.matrix[nr][nc] = 1;
            } else {
              grid.matrix[nr][nc] = 0;
            }
          } else {
            grid.matrix[nr][nc] = 0; // Separator
          }
          grid.reserved[nr][nc] = 1;
        }
      }
    }
  }

  function placeAlignmentPattern(grid, row, col) {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const nr = row + r;
        const nc = col + c;
        if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
          grid.matrix[nr][nc] = 1;
        } else {
          grid.matrix[nr][nc] = 0;
        }
        grid.reserved[nr][nc] = 1;
      }
    }
  }

  function setupFunctionPatterns(grid, version) {
    const size = grid.size;
    // Finder patterns & separators
    placeFinderPattern(grid, 0, 0);
    placeFinderPattern(grid, 0, size - 7);
    placeFinderPattern(grid, size - 7, 0);

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      const val = (i % 2 === 0) ? 1 : 0;
      if (!grid.reserved[6][i]) {
        grid.matrix[6][i] = val;
        grid.reserved[6][i] = 1;
      }
      if (!grid.reserved[i][6]) {
        grid.matrix[i][6] = val;
        grid.reserved[i][6] = 1;
      }
    }

    // Alignment patterns for V >= 2
    if (version >= 2) {
      const pos = ALIGNMENT_PATTERN_POS[version];
      for (let i = 0; i < pos.length; i++) {
        for (let j = 0; j < pos.length; j++) {
          const r = pos[i];
          const c = pos[j];
          if (grid.reserved[r][c]) continue; // Skip overlaps with finders
          placeAlignmentPattern(grid, r, c);
        }
      }
    }

    // Dark Module
    grid.matrix[size - 8][8] = 1;
    grid.reserved[size - 8][8] = 1;

    // Reserve Format Info Area
    for (let i = 0; i < 9; i++) {
      if (i < size) {
        grid.reserved[8][i] = 1;
        grid.reserved[i][8] = 1;
      }
    }
    for (let i = 0; i < 8; i++) {
      grid.reserved[8][size - 1 - i] = 1;
      grid.reserved[size - 1 - i][8] = 1;
    }

    // Reserve Version Info Area for V >= 7
    if (version >= 7) {
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 3; c++) {
          grid.reserved[r][size - 11 + c] = 1;
          grid.reserved[size - 11 + c][r] = 1;
        }
      }
    }
  }

  function placeDataBits(grid, interleavedBytes) {
    const size = grid.size;
    let bitIdx = 0;
    const totalBits = interleavedBytes.length * 8;
    let goingUp = true;

    for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
      if (rightCol === 6) rightCol--; // Skip vertical timing column

      for (let count = 0; count < size; count++) {
        const row = goingUp ? (size - 1 - count) : count;

        for (let c = 0; c < 2; c++) {
          const col = rightCol - c;
          if (!grid.reserved[row][col]) {
            let bit = 0;
            if (bitIdx < totalBits) {
              const byteVal = interleavedBytes[Math.floor(bitIdx / 8)];
              bit = (byteVal >>> (7 - (bitIdx % 8))) & 1;
              bitIdx++;
            }
            grid.matrix[row][col] = bit;
          }
        }
      }
      goingUp = !goingUp;
    }
  }

  function getMaskBit(maskId, r, c) {
    switch (maskId) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
      default: return false;
    }
  }

  function applyMask(grid, maskId) {
    const size = grid.size;
    const masked = [];
    for (let r = 0; r < size; r++) {
      masked.push(new Int8Array(size));
      for (let c = 0; c < size; c++) {
        if (grid.reserved[r][c]) {
          masked[r][c] = grid.matrix[r][c];
        } else {
          const invert = getMaskBit(maskId, r, c);
          masked[r][c] = invert ? (grid.matrix[r][c] ^ 1) : grid.matrix[r][c];
        }
      }
    }
    return masked;
  }

  function embedFormatAndVersion(matrix, version, ecl, maskId) {
    const size = matrix.length;
    const eclIdx = { L: 0, M: 1, Q: 2, H: 3 }[ecl];
    const formatVal = FORMAT_INFO_TABLE[eclIdx][maskId];

    // Format bits around top-left, top-right, and bottom-left
    for (let i = 0; i < 15; i++) {
      const bit = (formatVal >>> (14 - i)) & 1;
      if (i <= 5) matrix[8][i] = bit;
      else if (i === 6) matrix[8][7] = bit;
      else if (i === 7) matrix[8][8] = bit;
      else if (i === 8) matrix[7][8] = bit;
      else matrix[14 - i][8] = bit;

      if (i < 7) matrix[size - 1 - i][8] = bit;
      else matrix[8][size - 15 + i] = bit;
    }

    // Version bits for V >= 7
    if (version >= 7) {
      const vVal = VERSION_INFO_TABLE[version];
      for (let i = 0; i < 18; i++) {
        const bit = (vVal >>> i) & 1;
        const r = Math.floor(i / 3);
        const c = (i % 3);
        matrix[r][size - 11 + c] = bit;
        matrix[size - 11 + c][r] = bit;
      }
    }
  }

  function evaluatePenalty(matrix) {
    const size = matrix.length;
    let penalty = 0;

    // Condition 1: 5+ consecutive same-color modules in row/col
    for (let r = 0; r < size; r++) {
      let runColor = -1, runLen = 0;
      for (let c = 0; c < size; c++) {
        const val = matrix[r][c];
        if (val === runColor) {
          runLen++;
          if (runLen === 5) penalty += 3;
          else if (runLen > 5) penalty += 1;
        } else {
          runColor = val;
          runLen = 1;
        }
      }
    }
    for (let c = 0; c < size; c++) {
      let runColor = -1, runLen = 0;
      for (let r = 0; r < size; r++) {
        const val = matrix[r][c];
        if (val === runColor) {
          runLen++;
          if (runLen === 5) penalty += 3;
          else if (runLen > 5) penalty += 1;
        } else {
          runColor = val;
          runLen = 1;
        }
      }
    }

    // Condition 2: 2x2 blocks of same color
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const v = matrix[r][c];
        if (v === matrix[r+1][c] && v === matrix[r][c+1] && v === matrix[r+1][c+1]) {
          penalty += 3;
        }
      }
    }

    // Condition 3: 1:1:3:1:1 pattern check
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size - 6; c++) {
        if (matrix[r][c] === 1 && matrix[r][c+1] === 0 && matrix[r][c+2] === 1 &&
            matrix[r][c+3] === 1 && matrix[r][c+4] === 1 && matrix[r][c+5] === 0 && matrix[r][c+6] === 1) {
          if ((c >= 4 && matrix[r][c-1] === 0 && matrix[r][c-2] === 0 && matrix[r][c-3] === 0 && matrix[r][c-4] === 0) ||
              (c + 10 < size && matrix[r][c+7] === 0 && matrix[r][c+8] === 0 && matrix[r][c+9] === 0 && matrix[r][c+10] === 0)) {
            penalty += 40;
          }
        }
      }
    }

    // Condition 4: Dark/Light ratio balance
    let darkCount = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c] === 1) darkCount++;
      }
    }
    const ratio = (darkCount / (size * size)) * 100;
    const diff = Math.abs(ratio - 50);
    penalty += Math.floor(diff / 5) * 10;

    return penalty;
  }

  function generateMatrix(dataStr, ecl = 'M') {
    if (!dataStr) dataStr = ' ';
    const { version, mode } = determineMinimumVersion(dataStr, ecl);
    const dataBytes = generateBitstream(dataStr, ecl, version, mode);
    const interleavedBytes = structureBlocksAndInterleave(dataBytes, ecl, version);

    const baseGrid = createMatrix(version);
    setupFunctionPatterns(baseGrid, version);
    placeDataBits(baseGrid, interleavedBytes);

    let bestMask = 0;
    let bestPenalty = Infinity;
    let bestMatrix = null;

    for (let m = 0; m < 8; m++) {
      const candidateMatrix = applyMask(baseGrid, m);
      embedFormatAndVersion(candidateMatrix, version, ecl, m);
      const score = evaluatePenalty(candidateMatrix);
      if (score < bestPenalty) {
        bestPenalty = score;
        bestMask = m;
        bestMatrix = candidateMatrix;
      }
    }

    return {
      matrix: bestMatrix,
      version,
      ecl,
      mask: bestMask,
      size: bestMatrix.length
    };
  }

  // ==========================================================================
  // SECTION 2: CANVAS RENDERER & STYLIZER
  // ==========================================================================

  function renderToCanvas(qrData, canvas, options = {}) {
    const {
      size = 360,
      margin = 2,
      dotStyle = 'square', // 'square', 'rounded', 'dots', 'squircle'
      fgColor = '#0f172a',
      bgColor = '#ffffff',
      gradient = null,
      logoImage = null,
      logoSize = 0.22,
      logoShape = 'circle',
      logoBgColor = '#ffffff',
      logoBorderColor = 'transparent',
      logoBorderWidth = 0
    } = options;

    const matrix = qrData.matrix;
    const modCount = matrix.length;
    const totalModules = modCount + (margin * 2);
    
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Draw Background
    if (bgColor === 'transparent' || !bgColor) {
      ctx.clearRect(0, 0, size, size);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
    }

    const modulePx = (size / totalModules);
    const startOffset = margin * modulePx;

    function isFinderPattern(r, c) {
      if (r < 7 && c < 7) return true;
      if (r < 7 && c >= modCount - 7) return true;
      if (r >= modCount - 7 && c < 7) return true;
      return false;
    }

    // 2. Foreground Fill Style
    let fillStyle = fgColor;
    if (gradient && gradient.colorStops && gradient.colorStops.length > 0) {
      if (gradient.type === 'radial') {
        const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.7);
        gradient.colorStops.forEach(s => grad.addColorStop(s.offset, s.color));
        fillStyle = grad;
      } else {
        const grad = ctx.createLinearGradient(0, 0, size, size);
        gradient.colorStops.forEach(s => grad.addColorStop(s.offset, s.color));
        fillStyle = grad;
      }
    }
    ctx.fillStyle = fillStyle;

    // 3. Finder Patterns
    function drawFinder(rStart, cStart) {
      const x = startOffset + cStart * modulePx;
      const y = startOffset + rStart * modulePx;
      const fSize = 7 * modulePx;

      ctx.fillStyle = fillStyle;
      if (dotStyle === 'rounded' || dotStyle === 'dots') {
        roundRect(ctx, x, y, fSize, fSize, modulePx * 1.5, true);
        ctx.fillStyle = (bgColor === 'transparent' ? '#ffffff' : bgColor);
        roundRect(ctx, x + modulePx, y + modulePx, 5 * modulePx, 5 * modulePx, modulePx, true);
        ctx.fillStyle = fillStyle;
        roundRect(ctx, x + 2 * modulePx, y + 2 * modulePx, 3 * modulePx, 3 * modulePx, modulePx * 0.75, true);
      } else {
        ctx.fillRect(x, y, fSize, fSize);
        ctx.fillStyle = (bgColor === 'transparent' ? '#ffffff' : bgColor);
        ctx.fillRect(x + modulePx, y + modulePx, 5 * modulePx, 5 * modulePx);
        ctx.fillStyle = fillStyle;
        ctx.fillRect(x + 2 * modulePx, y + 2 * modulePx, 3 * modulePx, 3 * modulePx);
      }
    }

    drawFinder(0, 0);
    drawFinder(0, modCount - 7);
    drawFinder(modCount - 7, 0);

    // 4. Data Modules
    ctx.fillStyle = fillStyle;

    for (let r = 0; r < modCount; r++) {
      for (let c = 0; c < modCount; c++) {
        if (isFinderPattern(r, c)) continue;
        if (matrix[r][c] !== 1) continue;

        const x = startOffset + c * modulePx;
        const y = startOffset + r * modulePx;

        if (dotStyle === 'dots') {
          ctx.beginPath();
          ctx.arc(x + modulePx / 2, y + modulePx / 2, (modulePx * 0.92) / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (dotStyle === 'rounded') {
          roundRect(ctx, x + modulePx * 0.05, y + modulePx * 0.05, modulePx * 0.9, modulePx * 0.9, modulePx * 0.35, true);
        } else if (dotStyle === 'squircle') {
          roundRect(ctx, x + modulePx * 0.04, y + modulePx * 0.04, modulePx * 0.92, modulePx * 0.92, modulePx * 0.45, true);
        } else {
          ctx.fillRect(x, y, modulePx + 0.3, modulePx + 0.3);
        }
      }
    }

    // 5. Optional Center Logo Overlay
    if (logoImage) {
      const qrPixelArea = modCount * modulePx;
      const targetLogoBox = Math.min(qrPixelArea * Math.min(0.32, Math.max(0.12, logoSize)), size * 0.32);
      const centerX = size / 2;
      const centerY = size / 2;
      const badgeBox = targetLogoBox * 1.25;

      ctx.save();
      ctx.fillStyle = logoBgColor || '#ffffff';
      if (logoBorderWidth > 0 && logoBorderColor) {
        ctx.strokeStyle = logoBorderColor;
        ctx.lineWidth = logoBorderWidth;
      }

      if (logoShape === 'circle') {
        ctx.beginPath();
        ctx.arc(centerX, centerY, badgeBox / 2, 0, Math.PI * 2);
        ctx.fill();
        if (logoBorderWidth > 0) ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, targetLogoBox / 2, 0, Math.PI * 2);
        ctx.clip();
      } else {
        roundRect(ctx, centerX - badgeBox / 2, centerY - badgeBox / 2, badgeBox, badgeBox, badgeBox * 0.22, true);
        if (logoBorderWidth > 0) {
          ctx.stroke();
        }
        roundRect(ctx, centerX - targetLogoBox / 2, centerY - targetLogoBox / 2, targetLogoBox, targetLogoBox, targetLogoBox * 0.18, false);
        ctx.clip();
      }

      ctx.drawImage(
        logoImage,
        centerX - targetLogoBox / 2,
        centerY - targetLogoBox / 2,
        targetLogoBox,
        targetLogoBox
      );
      ctx.restore();
    }
  }

  function roundRect(ctx, x, y, width, height, radius, fill) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
  }

  // ==========================================================================
  // SECTION 3: HYBRID QR DECODER ENGINE
  // ==========================================================================

  let nativeBarcodeDetector = null;
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      nativeBarcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
    } catch (e) {
      nativeBarcodeDetector = null;
    }
  }

  const PureJSDecoder = (() => {

    function binarize(imageData) {
      const w = imageData.width;
      const h = imageData.height;
      const data = imageData.data;
      const gray = new Uint8Array(w * h);

      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        gray[p] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
      }

      // Adaptive Bradley thresholding
      const s = Math.floor(w / 8);
      const s2 = Math.floor(s / 2);
      const t = 15;
      const integral = new Int32Array(w * h);

      for (let i = 0; i < w; i++) {
        let sum = 0;
        for (let j = 0; j < h; j++) {
          sum += gray[j * w + i];
          if (i === 0) integral[j * w + i] = sum;
          else integral[j * w + i] = integral[j * w + (i - 1)] + sum;
        }
      }

      const bin = new Uint8Array(w * h);
      for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
          const x1 = Math.max(i - s2, 0);
          const x2 = Math.min(i + s2, w - 1);
          const y1 = Math.max(j - s2, 0);
          const y2 = Math.min(j + s2, h - 1);
          const count = (x2 - x1) * (y2 - y1);
          const sum = integral[y2 * w + x2] - integral[y1 * w + x2] - integral[y2 * w + x1] + integral[y1 * w + x1];

          if (gray[j * w + i] * count <= sum * (100 - t) / 100) {
            bin[j * w + i] = 1;
          } else {
            bin[j * w + i] = 0;
          }
        }
      }

      return { width: w, height: h, data: bin };
    }

    function checkRatio(stateCount) {
      let total = 0;
      for (let i = 0; i < 5; i++) {
        const count = stateCount[i];
        if (count === 0) return false;
        total += count;
      }
      if (total < 7) return false;
      const moduleSize = total / 7.0;
      const maxVariance = moduleSize / 1.75;
      return (
        Math.abs(moduleSize - stateCount[0]) < maxVariance &&
        Math.abs(moduleSize - stateCount[1]) < maxVariance &&
        Math.abs(3.0 * moduleSize - stateCount[2]) < 3 * maxVariance &&
        Math.abs(moduleSize - stateCount[3]) < maxVariance &&
        Math.abs(moduleSize - stateCount[4]) < maxVariance
      );
    }

    function findFinderCenters(binImg) {
      const w = binImg.width;
      const h = binImg.height;
      const bin = binImg.data;
      const centers = [];

      for (let y = 0; y < h; y += 2) {
        const stateCount = [0, 0, 0, 0, 0];
        let currentState = 0;

        for (let x = 0; x < w; x++) {
          if (bin[y * w + x]) {
            if ((currentState & 1) === 1) {
              currentState++;
            }
            stateCount[currentState]++;
          } else {
            if ((currentState & 1) === 0) {
              if (currentState === 4) {
                if (checkRatio(stateCount)) {
                  const cx = x - stateCount[4] - stateCount[3] - stateCount[2] / 2;
                  const cy = crossCheckVertical(binImg, Math.round(cx), y, stateCount[2]);
                  if (cy !== null) {
                    centers.push({ x: cx, y: cy, size: (stateCount[0]+stateCount[1]+stateCount[2]+stateCount[3]+stateCount[4]) / 7 });
                  }
                }
                stateCount[0] = stateCount[2];
                stateCount[1] = stateCount[3];
                stateCount[2] = stateCount[4];
                stateCount[3] = 1;
                stateCount[4] = 0;
                currentState = 3;
              } else {
                currentState++;
                stateCount[currentState]++;
              }
            } else {
              stateCount[currentState]++;
            }
          }
        }
      }

      const merged = [];
      for (const c of centers) {
        let matched = false;
        for (const m of merged) {
          if (Math.hypot(c.x - m.x, c.y - m.y) < m.size * 3) {
            m.x = (m.x * m.count + c.x) / (m.count + 1);
            m.y = (m.y * m.count + c.y) / (m.count + 1);
            m.count++;
            matched = true;
            break;
          }
        }
        if (!matched) merged.push({ x: c.x, y: c.y, size: c.size, count: 1 });
      }

      return merged;
    }

    function crossCheckVertical(binImg, startX, startY, centerCount) {
      const h = binImg.height;
      const w = binImg.width;
      const bin = binImg.data;
      const stateCount = [0, 0, 0, 0, 0];
      let y = startY;

      while (y >= 0 && bin[y * w + startX]) {
        stateCount[2]++;
        y--;
      }
      if (y < 0) return null;
      while (y >= 0 && !bin[y * w + startX] && stateCount[1] <= centerCount) {
        stateCount[1]++;
        y--;
      }
      if (y < 0 || stateCount[1] > centerCount) return null;
      while (y >= 0 && bin[y * w + startX] && stateCount[0] <= centerCount) {
        stateCount[0]++;
        y--;
      }
      if (stateCount[0] > centerCount) return null;

      y = startY + 1;
      while (y < h && bin[y * w + startX]) {
        stateCount[2]++;
        y++;
      }
      if (y >= h) return null;
      while (y < h && !bin[y * w + startX] && stateCount[3] <= centerCount) {
        stateCount[3]++;
        y++;
      }
      if (y >= h || stateCount[3] > centerCount) return null;
      while (y < h && bin[y * w + startX] && stateCount[4] <= centerCount) {
        stateCount[4]++;
        y++;
      }
      if (stateCount[4] > centerCount) return null;

      if (!checkRatio(stateCount)) return null;
      return y - stateCount[4] - stateCount[3] - stateCount[2] / 2;
    }

    function samplePerspective(binImg, tl, tr, bl, version) {
      const matrixSize = version * 4 + 17;
      const grid = [];
      const brX = tr.x + bl.x - tl.x;
      const brY = tr.y + bl.y - tl.y;

      for (let r = 0; r < matrixSize; r++) {
        grid.push(new Int8Array(matrixSize));
        const v = (r + 0.5) / matrixSize;
        for (let c = 0; c < matrixSize; c++) {
          const u = (c + 0.5) / matrixSize;
          const x = Math.round((1 - u) * (1 - v) * tl.x + u * (1 - v) * tr.x + (1 - u) * v * bl.x + u * v * brX);
          const y = Math.round((1 - u) * (1 - v) * tl.y + u * (1 - v) * tr.y + (1 - u) * v * bl.y + u * v * brY);

          if (x >= 0 && x < binImg.width && y >= 0 && y < binImg.height) {
            grid[r][c] = binImg.data[y * binImg.width + x];
          } else {
            grid[r][c] = 0;
          }
        }
      }
      return grid;
    }

    function parsePayloadFromMatrix(grid, version) {
      const size = grid.length;
      let rawFormat = 0;
      for (let i = 0; i <= 5; i++) rawFormat = (rawFormat << 1) | grid[8][i];
      rawFormat = (rawFormat << 1) | grid[8][7];
      rawFormat = (rawFormat << 1) | grid[8][8];
      rawFormat = (rawFormat << 1) | grid[7][8];
      for (let i = 5; i >= 0; i--) rawFormat = (rawFormat << 1) | grid[i][8];

      let bestEcl = 'M', bestMask = 0;
      let minH = 999;
      for (let e = 0; e < 4; e++) {
        for (let m = 0; m < 8; m++) {
          const target = FORMAT_INFO_TABLE[e][m];
          let diff = (rawFormat ^ target);
          let h = 0;
          while (diff > 0) { h += (diff & 1); diff >>>= 1; }
          if (h < minH) {
            minH = h;
            bestEcl = ['L', 'M', 'Q', 'H'][e];
            bestMask = m;
          }
        }
      }

      const bits = [];
      let goingUp = true;
      for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
        if (rightCol === 6) rightCol--;
        for (let count = 0; count < size; count++) {
          const row = goingUp ? (size - 1 - count) : count;
          for (let c = 0; c < 2; c++) {
            const col = rightCol - c;
            const inFinder = (row < 9 && col < 9) || (row < 9 && col >= size - 8) || (row >= size - 8 && col < 9);
            const inTiming = (row === 6 || col === 6);
            if (!inFinder && !inTiming) {
              const invert = getMaskBit(bestMask, row, col);
              const val = invert ? (grid[row][col] ^ 1) : grid[row][col];
              bits.push(val);
            }
          }
        }
        goingUp = !goingUp;
      }

      let bitPtr = 0;
      function readBits(len) {
        let res = 0;
        for (let i = 0; i < len; i++) {
          if (bitPtr < bits.length) {
            res = (res << 1) | bits[bitPtr++];
          }
        }
        return res;
      }

      let resultText = '';
      while (bitPtr + 4 <= bits.length) {
        const mode = readBits(4);
        if (mode === 0) break;

        if (mode === 0b0001) {
          // Numeric
          const countBits = version <= 9 ? 10 : (version <= 26 ? 12 : 14);
          const count = readBits(countBits);
          let readDigits = 0;
          while (readDigits < count) {
            const chunkLen = Math.min(3, count - readDigits);
            const bitCount = chunkLen === 3 ? 10 : (chunkLen === 2 ? 7 : 4);
            const val = readBits(bitCount);
            resultText += String(val).padStart(chunkLen, '0');
            readDigits += chunkLen;
          }
        } else if (mode === 0b0010) {
          // Alphanumeric
          const countBits = version <= 9 ? 9 : (version <= 26 ? 11 : 13);
          const count = readBits(countBits);
          let readChars = 0;
          while (readChars < count) {
            if (count - readChars >= 2) {
              const val = readBits(11);
              resultText += ALPHANUM_MAP[Math.floor(val / 45)] + ALPHANUM_MAP[val % 45];
              readChars += 2;
            } else {
              const val = readBits(6);
              resultText += ALPHANUM_MAP[val];
              readChars++;
            }
          }
        } else if (mode === 0b0100) {
          // Byte mode
          const countBits = version <= 9 ? 8 : 16;
          const count = readBits(countBits);
          const raw = [];
          for (let i = 0; i < count; i++) {
            raw.push(readBits(8));
          }
          try {
            resultText += new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(raw));
          } catch (e) {
            resultText += String.fromCharCode(...raw);
          }
        } else {
          break;
        }
      }

      return resultText;
    }

    function decode(imageData) {
      const binImg = binarize(imageData);
      const centers = findFinderCenters(binImg);
      if (centers.length < 3) return null;

      centers.sort((a, b) => b.count - a.count);
      const [p1, p2, p3] = centers.slice(0, 3);

      const d12 = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const d23 = Math.hypot(p2.x - p3.x, p2.y - p3.y);
      const d13 = Math.hypot(p1.x - p3.x, p1.y - p3.y);

      let tl, tr, bl;
      if (d12 >= d23 && d12 >= d13) {
        tl = p3; tr = p1; bl = p2;
      } else if (d23 >= d12 && d23 >= d13) {
        tl = p1; tr = p2; bl = p3;
      } else {
        tl = p2; tr = p1; bl = p3;
      }

      const cross = (tr.x - tl.x) * (bl.y - tl.y) - (tr.y - tl.y) * (bl.x - tl.x);
      if (cross < 0) {
        const temp = tr;
        tr = bl;
        bl = temp;
      }

      const avgSide = (Math.hypot(tr.x - tl.x, tr.y - tl.y) + Math.hypot(bl.x - tl.x, bl.y - tl.y)) / 2;
      const modSize = (tl.size + tr.size + bl.size) / 3;
      const estModules = Math.round(avgSide / modSize) + 7;
      let estVersion = Math.max(1, Math.min(40, Math.round((estModules - 17) / 4)));

      for (const v of [estVersion, estVersion - 1, estVersion + 1, estVersion - 2, estVersion + 2]) {
        if (v < 1 || v > 40) continue;
        try {
          const grid = samplePerspective(binImg, tl, tr, bl, v);
          const decoded = parsePayloadFromMatrix(grid, v);
          if (decoded && decoded.trim().length > 0) {
            return {
              rawValue: decoded,
              version: v,
              location: {
                topLeftCorner: tl,
                topRightCorner: tr,
                bottomLeftCorner: bl
              }
            };
          }
        } catch (e) {}
      }

      return null;
    }

    return { decode };
  })();

  /**
   * Unified Decode API: Works asynchronously on Canvas, Video, or ImageData
   */
  async function decodeImage(imageSource) {
    if (nativeBarcodeDetector) {
      try {
        const barcodes = await nativeBarcodeDetector.detect(imageSource);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          return {
            rawValue: barcodes[0].rawValue,
            format: 'qr_code',
            engine: 'native-barcode-detector',
            boundingBox: barcodes[0].boundingBox
          };
        }
      } catch (e) {
        // Fallback to pure JS
      }
    }

    let imgData = null;
    if (imageSource instanceof ImageData) {
      imgData = imageSource;
    } else {
      const tempCanvas = document.createElement('canvas');
      const w = imageSource.videoWidth || imageSource.naturalWidth || imageSource.width || 480;
      const h = imageSource.videoHeight || imageSource.naturalHeight || imageSource.height || 480;
      tempCanvas.width = Math.min(800, w);
      tempCanvas.height = Math.round(h * (tempCanvas.width / w));
      const tCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      tCtx.drawImage(imageSource, 0, 0, tempCanvas.width, tempCanvas.height);
      imgData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    }

    const result = PureJSDecoder.decode(imgData);
    if (result) {
      return {
        rawValue: result.rawValue,
        format: 'qr_code',
        engine: 'pure-js-engine',
        location: result.location
      };
    }

    return null;
  }

  return {
    generateMatrix,
    renderToCanvas,
    decodeImage
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QREngine;
}
