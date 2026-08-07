/**
 * ==========================================================================
 * Custom QR Code Decoder Engine (ISO/IEC 18004 Specification)
 * 100% Native Vanilla JavaScript - Zero Third-Party Libraries
 * Features: Image Binarizer, Finder Scanner (1:1:3:1:1), Affine Grid Sampler,
 * Format BCH Unmasking, GF(256) Berlekamp-Massey RS Error Correction,
 * Block De-Interleaver, Zigzag Bit Extraction & Payload Decoder
 * ==========================================================================
 */

const QRDecoder = (() => {

  // Alignment Pattern Position Table (Versions 1 to 40)
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

  // Official ISO/IEC 18004 Table 9 RS Block Specs (Identical to qr-encoder.js)
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
  // GALOIS FIELD GF(256) ARITHMETIC & REED-SOLOMON ERROR CORRECTION
  // ==========================================================================
  const EXP_TABLE = new Uint8Array(512);
  const LOG_TABLE = new Uint8Array(256);

  (function initGF() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP_TABLE[i] = x;
      LOG_TABLE[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    for (let i = 255; i < 512; i++) {
      EXP_TABLE[i] = EXP_TABLE[i - 255];
    }
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
  }

  function gfInv(a) {
    if (a === 0) throw new Error('Division by zero in GF(256)');
    return EXP_TABLE[255 - LOG_TABLE[a]];
  }

  function rsCorrectBlock(block, ecCount) {
    const numCodewords = block.length;
    const syndromes = new Uint8Array(ecCount);
    let hasError = false;

    for (let i = 0; i < ecCount; i++) {
      let evalResult = 0;
      for (let j = 0; j < numCodewords; j++) {
        evalResult = gfMul(evalResult, EXP_TABLE[i]) ^ block[j];
      }
      syndromes[i] = evalResult;
      if (evalResult !== 0) hasError = true;
    }

    if (!hasError) return block; // 0 errors!

    // Berlekamp-Massey Algorithm to compute Error Locator Polynomial C(x)
    let C = [1];
    let B = [1];
    let L = 0;
    let m = 1;
    let b = 1;

    for (let n = 0; n < ecCount; n++) {
      let d = syndromes[n];
      for (let i = 1; i <= L; i++) {
        d ^= gfMul(C[i], syndromes[n - i]);
      }

      if (d === 0) {
        m++;
      } else {
        const T = C.slice();
        const scale = gfMul(d, gfInv(b));
        
        while (C.length < B.length + m) C.push(0);
        for (let i = 0; i < B.length; i++) {
          C[i + m] ^= gfMul(scale, B[i]);
        }

        if (2 * L <= n) {
          L = n + 1 - L;
          B = T;
          b = d;
          m = 1;
        } else {
          m++;
        }
      }
    }

    if (L * 2 > ecCount) {
      throw new Error('Too many errors to correct in RS block');
    }

    // Chien Search to find error locations
    const errorPos = [];
    for (let i = 0; i < numCodewords; i++) {
      const Xinv = EXP_TABLE[(255 - (numCodewords - 1 - i) % 255) % 255];
      let val = 1;
      let Xpow = 1;
      for (let j = 1; j <= L; j++) {
        Xpow = gfMul(Xpow, Xinv);
        val ^= gfMul(C[j], Xpow);
      }
      if (val === 0) {
        errorPos.push(i);
      }
    }

    if (errorPos.length !== L) {
      throw new Error('RS Chien search mismatch');
    }

    // Forney Algorithm to compute error magnitudes
    const Omega = new Uint8Array(L);
    for (let i = 0; i < L; i++) {
      let term = 0;
      for (let j = 0; j <= i; j++) {
        term ^= gfMul(syndromes[i - j], C[j]);
      }
      Omega[i] = term;
    }

    for (const pos of errorPos) {
      const X = EXP_TABLE[(numCodewords - 1 - pos) % 255];
      const Xinv = gfInv(X);

      let num = 0;
      let Xpow = 1;
      for (let j = 0; j < L; j++) {
        num ^= gfMul(Omega[j], Xpow);
        Xpow = gfMul(Xpow, Xinv);
      }

      let den = 0;
      Xpow = 1;
      for (let j = 1; j <= L; j += 2) {
        den ^= gfMul(C[j], Xpow);
        Xpow = gfMul(Xpow, gfMul(Xinv, Xinv));
      }

      if (den === 0) throw new Error('Forney denominator zero');
      const errVal = gfMul(num, gfInv(den));
      block[pos] ^= errVal;
    }

    return block;
  }

  // BUG 1 FIX: Let rsCorrectBlock failures propagate as real errors (NO try/catch swallowing)
  function deinterleaveDataBytes(rawInterleavedBytes, version, ecl) {
    const spec = getRSBlockSpec(version, ecl);
    const [totalDataBytes, ecPerBlock, g1Blocks, g1DataBytes, g2Blocks, g2DataBytes] = spec;

    const totalBlocks = g1Blocks + (g2Blocks || 0);

    if (totalBlocks <= 1) {
      const fullBlock = rawInterleavedBytes.slice(0, totalDataBytes + ecPerBlock);
      rsCorrectBlock(fullBlock, ecPerBlock);
      return fullBlock.slice(0, Math.min(fullBlock.length, totalDataBytes));
    }

    const blocksData = [];
    for (let i = 0; i < g1Blocks; i++) {
      blocksData.push(new Uint8Array(g1DataBytes + ecPerBlock));
    }
    for (let i = 0; i < (g2Blocks || 0); i++) {
      blocksData.push(new Uint8Array(g2DataBytes + ecPerBlock));
    }

    const maxDataLen = Math.max(g1DataBytes, g2DataBytes || 0);
    let offset = 0;

    // Fill data bytes across interleaved blocks
    for (let i = 0; i < maxDataLen; i++) {
      for (let b = 0; b < blocksData.length; b++) {
        const dataLen = b < g1Blocks ? g1DataBytes : g2DataBytes;
        if (i < dataLen && offset < rawInterleavedBytes.length) {
          blocksData[b][i] = rawInterleavedBytes[offset++];
        }
      }
    }

    // Fill EC bytes across interleaved blocks
    for (let i = 0; i < ecPerBlock; i++) {
      for (let b = 0; b < blocksData.length; b++) {
        const dataLen = b < g1Blocks ? g1DataBytes : g2DataBytes;
        if (offset < rawInterleavedBytes.length) {
          blocksData[b][dataLen + i] = rawInterleavedBytes[offset++];
        }
      }
    }

    // Apply Reed-Solomon Error Correction on each block (Propagate failures as thrown errors)
    for (let b = 0; b < blocksData.length; b++) {
      rsCorrectBlock(blocksData[b], ecPerBlock);
    }

    // Reconstruct sequential data bytes
    const result = new Uint8Array(totalDataBytes);
    let resIdx = 0;
    for (let b = 0; b < blocksData.length; b++) {
      const dataLen = b < g1Blocks ? g1DataBytes : g2DataBytes;
      for (let i = 0; i < dataLen; i++) {
        if (resIdx < totalDataBytes) {
          result[resIdx++] = blocksData[b][i];
        }
      }
    }

    return result;
  }

  // ==========================================================================
  // 1. IMAGE BINARIZER & THRESHOLDING
  // Converts ImageData to a 2D binary grid (0 = light/white, 1 = dark/black)
  // ==========================================================================
  function binarizeImageData(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    const gray = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    }

    let sum = 0;
    for (let i = 0; i < gray.length; i++) {
      sum += gray[i];
    }
    const threshold = sum / gray.length;

    const binary = new Uint8Array(width * height);
    for (let i = 0; i < gray.length; i++) {
      binary[i] = gray[i] < threshold ? 1 : 0;
    }

    return {
      width,
      height,
      binary,
      getPixel: (x, y) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return 0;
        return binary[y * width + x];
      }
    };
  }


  // ==========================================================================
  // 2. FINDER PATTERN SCANNER ALGORITHM (1:1:3:1:1 Ratio Detection)
  // ==========================================================================
  function checkRatio(stateCount) {
    const total = stateCount[0] + stateCount[1] + stateCount[2] + stateCount[3] + stateCount[4];
    if (total < 7) return false;

    const moduleSize = total / 7;
    const maxVariance = moduleSize / 2;

    return Math.abs(moduleSize - stateCount[0]) < maxVariance &&
           Math.abs(moduleSize - stateCount[1]) < maxVariance &&
           Math.abs(3 * moduleSize - stateCount[2]) < (3 * maxVariance) &&
           Math.abs(moduleSize - stateCount[3]) < maxVariance &&
           Math.abs(moduleSize - stateCount[4]) < maxVariance;
  }

  function crossCheckVertical(binImg, startY, centerCol, stateCountTotal) {
    let r = startY;
    const stateCount = [0, 0, 0, 0, 0];

    while (r >= 0 && binImg.getPixel(centerCol, r) === 1) { stateCount[2]++; r--; }
    if (r < 0) return NaN;

    while (r >= 0 && binImg.getPixel(centerCol, r) === 0 && stateCount[1] < stateCountTotal) { stateCount[1]++; r--; }
    if (r < 0 || stateCount[1] >= stateCountTotal) return NaN;

    while (r >= 0 && binImg.getPixel(centerCol, r) === 1 && stateCount[0] < stateCountTotal) { stateCount[0]++; r--; }
    if (r < 0 || stateCount[0] >= stateCountTotal) return NaN;

    r = startY + 1;
    while (r < binImg.height && binImg.getPixel(centerCol, r) === 1) { stateCount[2]++; r++; }
    if (r >= binImg.height) return NaN;

    while (r < binImg.height && binImg.getPixel(centerCol, r) === 0 && stateCount[3] < stateCountTotal) { stateCount[3]++; r++; }
    if (r >= binImg.height || stateCount[3] >= stateCountTotal) return NaN;

    while (r < binImg.height && binImg.getPixel(centerCol, r) === 1 && stateCount[4] < stateCountTotal) { stateCount[4]++; r++; }
    if (r >= binImg.height || stateCount[4] >= stateCountTotal) return NaN;

    const total = stateCount[0] + stateCount[1] + stateCount[2] + stateCount[3] + stateCount[4];
    if (Math.abs(total - stateCountTotal) * 5 >= 2 * stateCountTotal) return NaN;

    return checkRatio(stateCount) ? (r - stateCount[4] - stateCount[3] - stateCount[2] / 2) : NaN;
  }

  function findFinderCenters(binImg) {
    const centers = [];
    const stateCount = [0, 0, 0, 0, 0];

    for (let y = 0; y < binImg.height; y += 2) {
      stateCount[0] = 0; stateCount[1] = 0; stateCount[2] = 0; stateCount[3] = 0; stateCount[4] = 0;
      let currentState = 0;

      for (let x = 0; x < binImg.width; x++) {
        const val = binImg.getPixel(x, y);

        if (val === 1) {
          if ((currentState & 1) === 1) {
            currentState++;
          }
          stateCount[currentState]++;
        } else {
          if ((currentState & 1) === 0) {
            if (currentState === 4) {
              if (checkRatio(stateCount)) {
                const total = stateCount[0] + stateCount[1] + stateCount[2] + stateCount[3] + stateCount[4];
                const centerCol = x - stateCount[4] - stateCount[3] - stateCount[2] / 2;
                const centerRow = crossCheckVertical(binImg, y, Math.round(centerCol), total);

                if (!isNaN(centerRow)) {
                  let duplicate = false;
                  for (const c of centers) {
                    const dist = Math.hypot(c.x - centerCol, c.y - centerRow);
                    if (dist < 10) {
                      duplicate = true;
                      break;
                    }
                  }
                  if (!duplicate) {
                    centers.push({ x: centerCol, y: centerRow });
                  }
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
    return centers;
  }


  // ==========================================================================
  // 3. CORNER IDENTIFICATION & GRID SAMPLER
  // Identifies Top-Left, Top-Right, and Bottom-Left Finder Pattern Centers
  // ==========================================================================
  function identifyFinderCorners(centers) {
    if (centers.length < 3) return null;

    let maxDist = 0;
    let p1 = 0, p2 = 1;

    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        const d = Math.hypot(centers[i].x - centers[j].x, centers[i].y - centers[j].y);
        if (d > maxDist) {
          maxDist = d;
          p1 = i;
          p2 = j;
        }
      }
    }

    let tlIdx = -1;
    for (let i = 0; i < centers.length; i++) {
      if (i !== p1 && i !== p2) {
        tlIdx = i;
        break;
      }
    }

    if (tlIdx === -1) return null;

    const TL = centers[tlIdx];
    const ptA = centers[p1];
    const ptB = centers[p2];

    const cross = (ptA.x - TL.x) * (ptB.y - TL.y) - (ptA.y - TL.y) * (ptB.x - TL.x);
    let TR = ptA, BL = ptB;
    if (cross < 0) {
      TR = ptB;
      BL = ptA;
    }

    return { TL, TR, BL };
  }

  function estimateVersionFromCorners(binImg, corners) {
    const { TL, TR, BL } = corners;
    const distTR = Math.hypot(TR.x - TL.x, TR.y - TL.y);

    let leftX = Math.round(TL.x);
    while (leftX > 0 && binImg.getPixel(leftX, Math.round(TL.y)) === 1) leftX--;
    while (leftX > 0 && binImg.getPixel(leftX, Math.round(TL.y)) === 0) leftX--;
    while (leftX > 0 && binImg.getPixel(leftX, Math.round(TL.y)) === 1) leftX--;

    let rightX = Math.round(TL.x);
    while (rightX < binImg.width && binImg.getPixel(rightX, Math.round(TL.y)) === 1) rightX++;
    while (rightX < binImg.width && binImg.getPixel(rightX, Math.round(TL.y)) === 0) rightX++;
    while (rightX < binImg.width && binImg.getPixel(rightX, Math.round(TL.y)) === 1) rightX++;

    const finderWidth = Math.max(7, rightX - leftX);
    const modSize = finderWidth / 7.0;

    const modulesBetweenCenters = Math.round(distTR / modSize);
    let version = Math.round((modulesBetweenCenters - 10) / 4);
    return Math.max(1, Math.min(40, version));
  }

  function sampleGridForVersion(binImg, corners, version) {
    const { TL, TR, BL } = corners;
    const moduleCount = version * 4 + 17;

    const uX = (TR.x - TL.x) / (moduleCount - 7);
    const uY = (TR.y - TL.y) / (moduleCount - 7);
    const vX = (BL.x - TL.x) / (moduleCount - 7);
    const vY = (BL.y - TL.y) / (moduleCount - 7);

    const matrix = Array.from({ length: moduleCount }, () => new Array(moduleCount).fill(0));

    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        const px = Math.round(TL.x + (c - 3) * uX + (r - 3) * vX);
        const py = Math.round(TL.y + (c - 3) * uY + (r - 3) * vY);
        matrix[r][c] = binImg.getPixel(px, py);
      }
    }

    return {
      version,
      moduleCount,
      matrix
    };
  }


  // ==========================================================================
  // 4. FORMAT INFO EXTRACTION & UNMASKING
  // ==========================================================================
  function extractFormatInfo(gridData) {
    const { matrix, moduleCount } = gridData;

    const seqTL = [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
      [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
    ];

    let rawBits = 0;
    for (let i = 0; i < 15; i++) {
      const [r, c] = seqTL[i];
      if (matrix[r] && matrix[r][c] === 1) {
        rawBits |= (1 << i);
      }
    }

    const formatBits = rawBits ^ 0x5412;
    const data5 = formatBits >>> 10;

    const eclBits = (data5 >>> 3) & 0b11;
    const maskId = data5 & 0b111;

    const eclMap = { 0b01: 'L', 0b00: 'M', 0b11: 'Q', 0b10: 'H' };
    const ecl = eclMap[eclBits] || 'L';

    return { ecl, maskId };
  }


  // ==========================================================================
  // 5. UNMASKING & ZIGZAG BIT EXTRACTION
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

  function extractDataBits(gridData, formatInfo) {
    const { matrix, moduleCount, version } = gridData;
    const maskFunc = MASK_FUNCTIONS[formatInfo.maskId] || MASK_FUNCTIONS[0];
    const alignPos = ALIGNMENT_PATTERN_POS[version] || [];

    function isFunctionModule(r, c) {
      if (r <= 8 && c <= 8) return true;
      if (r <= 8 && c >= moduleCount - 8) return true;
      if (r >= moduleCount - 8 && c <= 8) return true;

      if (r === 6 || c === 6) return true;

      if (version >= 7) {
        if (r < 6 && c >= moduleCount - 11 && c < moduleCount - 8) return true;
        if (c < 6 && r >= moduleCount - 11 && r < moduleCount - 8) return true;
      }

      for (let i = 0; i < alignPos.length; i++) {
        for (let j = 0; j < alignPos.length; j++) {
          const ar = alignPos[i];
          const ac = alignPos[j];
          if ((ar <= 8 && ac <= 8) || (ar <= 8 && ac >= moduleCount - 8) || (ar >= moduleCount - 8 && ac <= 8)) {
            continue;
          }
          if (Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2) {
            return true;
          }
        }
      }

      return false;
    }

    const dataBits = [];
    let upward = true;

    for (let right = moduleCount - 1; right > 0; right -= 2) {
      if (right === 6) right = 5;

      const rows = [];
      if (upward) {
        for (let r = moduleCount - 1; r >= 0; r--) rows.push(r);
      } else {
        for (let r = 0; r < moduleCount; r++) rows.push(r);
      }

      for (const r of rows) {
        for (let col = right; col > right - 2; col--) {
          if (!isFunctionModule(r, col)) {
            let val = matrix[r][col];
            if (maskFunc(r, col)) {
              val ^= 1;
            }
            dataBits.push(val);
          }
        }
      }
      upward = !upward;
    }

    const bytes = new Uint8Array(Math.floor(dataBits.length / 8));
    for (let i = 0; i < bytes.length; i++) {
      let b = 0;
      for (let bit = 0; bit < 8; bit++) {
        b = (b << 1) | dataBits[i * 8 + bit];
      }
      bytes[i] = b;
    }

    return deinterleaveDataBytes(bytes, version, formatInfo.ecl);
  }


  // ==========================================================================
  // 6. PAYLOAD DECODER
  // Parses Mode Indicator, Length, and Payload Bytes
  // ==========================================================================
  function parsePayload(bytes, version) {
    let bitOffset = 0;

    function readBits(count) {
      let val = 0;
      for (let i = 0; i < count; i++) {
        const byteIdx = Math.floor(bitOffset / 8);
        const bitShift = 7 - (bitOffset % 8);
        if (byteIdx < bytes.length) {
          const bit = (bytes[byteIdx] >>> bitShift) & 1;
          val = (val << 1) | bit;
        }
        bitOffset++;
      }
      return val;
    }

    const modeBits = readBits(4);

    let countBits = 8;
    if (version >= 1 && version <= 9) {
      countBits = modeBits === 1 ? 10 : modeBits === 2 ? 9 : 8;
    } else if (version <= 26) {
      countBits = modeBits === 1 ? 12 : modeBits === 2 ? 11 : 16;
    } else {
      countBits = modeBits === 1 ? 14 : modeBits === 2 ? 13 : 16;
    }

    const charCount = readBits(countBits);
    if (charCount === 0 || charCount > 3500) {
      throw new Error('Invalid QR payload length');
    }

    let payloadText = '';

    if (modeBits === 4) {
      // Byte Mode (UTF-8)
      const rawBytes = new Uint8Array(charCount);
      for (let i = 0; i < charCount; i++) {
        rawBytes[i] = readBits(8);
      }
      const decoder = new TextDecoder('utf-8');
      payloadText = decoder.decode(rawBytes);
    } else if (modeBits === 2) {
      // Alphanumeric Mode
      const ALPHANUM_MAP = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
      let read = 0;
      while (read < charCount) {
        if (charCount - read >= 2) {
          const val = readBits(11);
          const idx1 = Math.floor(val / 45);
          const idx2 = val % 45;
          if (idx1 >= 45 || idx2 >= 45) {
            throw new Error('Invalid alphanumeric index');
          }
          payloadText += ALPHANUM_MAP[idx1] + ALPHANUM_MAP[idx2];
          read += 2;
        } else {
          const val = readBits(6);
          if (val >= 45) {
            throw new Error('Invalid alphanumeric index');
          }
          payloadText += ALPHANUM_MAP[val];
          read += 1;
        }
      }
    } else if (modeBits === 1) {
      // Numeric Mode
      let read = 0;
      while (read < charCount) {
        if (charCount - read >= 3) {
          const val = readBits(10);
          payloadText += val.toString().padStart(3, '0');
          read += 3;
        } else if (charCount - read === 2) {
          const val = readBits(7);
          payloadText += val.toString().padStart(2, '0');
          read += 2;
        } else {
          const val = readBits(4);
          payloadText += val.toString();
          read += 1;
        }
      }
    } else {
      // Fallback UTF-8 decode
      const rawBytes = bytes.slice(Math.floor(bitOffset / 8));
      payloadText = new TextDecoder('utf-8').decode(rawBytes).replace(/\0/g, '');
    }

    return payloadText;
  }


  // BUG 2 FIX: Strict isImagePayload checking (data:image/, base64,, signatures /9j/, iVBOR, R0lGOD, UklGR, or Base64 + Magic Bytes)
  function isImagePayload(text) {
    if (!text || text.length < 15) return false;
    if (text.includes('data:image/') || text.includes('base64,')) return true;
    if (/^(\/9j\/|iVBORw0KGgo|R0lGOD|UklGR)/.test(text)) return true;

    // Check strict Base64 structure + real image file magic bytes
    if (text.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(text)) {
      try {
        const binStr = atob(text.substring(0, 32));
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
          bytes[i] = binStr.charCodeAt(i);
        }
        // JPEG magic: FF D8
        if (bytes[0] === 0xFF && bytes[1] === 0xD8) return true;
        // PNG magic: 89 50 4E 47
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
        // GIF magic: 47 49 46
        if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return true;
        // WEBP magic: RIFF at 0..3 and WEBP at 8..11
        if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
            bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true;
      } catch (e) {}
    }

    return false;
  }

  // ==========================================================================
  // 7. MAIN DECODER ENTRYPOINT WITH TWO-PASS CANDIDATE EVALUATION
  // ==========================================================================
  function decodeImageData(imageData) {
    const binImg = binarizeImageData(imageData);

    const centers = findFinderCenters(binImg);
    if (centers.length < 3) {
      throw new Error('Could not locate QR finder patterns in image');
    }

    const corners = identifyFinderCorners(centers);
    if (!corners) {
      throw new Error('Unable to resolve QR coordinate geometry');
    }

    const estV = estimateVersionFromCorners(binImg, corners);

    const candidateVersions = [estV];
    for (const delta of [-1, 1, -2, 2, -3, 3, -4, 4, -5, 5]) {
      const v = estV + delta;
      if (v >= 1 && v <= 40 && !candidateVersions.includes(v)) {
        candidateVersions.push(v);
      }
    }

    let lastErr = null;

    // PASS 1: Specifically search for Image Base64 Payloads (data:image/, base64, /9j/, iVBOR, or raw Base64 + magic bytes)
    for (const version of candidateVersions) {
      try {
        const gridData = sampleGridForVersion(binImg, corners, version);
        const formatInfo = extractFormatInfo(gridData);

        const candidateMasks = [formatInfo.maskId];
        for (let m = 0; m < 8; m++) {
          if (m !== formatInfo.maskId) candidateMasks.push(m);
        }

        for (const maskId of candidateMasks) {
          try {
            const testFormat = { ecl: formatInfo.ecl, maskId };
            const dataBytes = extractDataBits(gridData, testFormat);
            const text = parsePayload(dataBytes, version);

            if (text && isImagePayload(text)) {
              return {
                text,
                version,
                ecl: formatInfo.ecl,
                maskId
              };
            }
          } catch (e) {
            lastErr = e;
          }
        }
      } catch (e) {
        lastErr = e;
      }
    }

    // PASS 2: Standard Text / URL payload decoding
    for (const version of candidateVersions) {
      try {
        const gridData = sampleGridForVersion(binImg, corners, version);
        const formatInfo = extractFormatInfo(gridData);

        const candidateMasks = [formatInfo.maskId];
        for (let m = 0; m < 8; m++) {
          if (m !== formatInfo.maskId) candidateMasks.push(m);
        }

        for (const maskId of candidateMasks) {
          try {
            const testFormat = { ecl: formatInfo.ecl, maskId };
            const dataBytes = extractDataBits(gridData, testFormat);
            const text = parsePayload(dataBytes, version);

            if (text && text.length > 0 && !text.includes('undefined') && !/[\uFFFD]/.test(text)) {
              return {
                text,
                version,
                ecl: formatInfo.ecl,
                maskId
              };
            }
          } catch (e) {
            lastErr = e;
          }
        }
      } catch (e) {
        lastErr = e;
      }
    }

    throw new Error('Unable to decode QR payload from this image');
  }

  return {
    decodeImageData
  };

})();
