/**
 * ==========================================================================
 * Image Compressor Engine
 * Progressive off-screen canvas resize & JPEG quality reduction loop
 * Optimizes image uploads to fit within physical QR Code Version 40 storage limits
 * ==========================================================================
 */

const ImageCompressor = (() => {

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Invalid image file format'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }

  async function compressImageForQR(file, ecl, onProgress) {
    const origImg = await loadImageFromFile(file);
    const origWidth = origImg.naturalWidth;
    const origHeight = origImg.naturalHeight;
    const origSizeBytes = file.size;

    // Candidate target dimensions & JPEG quality levels
    const targetDimensions = [160, 130, 100, 85, 70, 56, 44, 36, 28, 22, 18, 14];
    const qualitySteps = [0.85, 0.70, 0.55, 0.40, 0.28, 0.18, 0.10, 0.05];

    const totalCombinations = targetDimensions.length * qualitySteps.length;
    let testedCount = 0;
    let successResult = null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Outer Loop: Dimension scaling
    outerLoop:
    for (const dim of targetDimensions) {
      let w = dim;
      let h = dim;
      if (origWidth > origHeight) {
        h = Math.max(12, Math.round(dim * (origHeight / origWidth)));
      } else {
        w = Math.max(12, Math.round(dim * (origWidth / origHeight)));
      }

      canvas.width = w;
      canvas.height = h;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(origImg, 0, 0, w, h);

      // Inner Loop: Quality scaling
      for (const q of qualitySteps) {
        testedCount++;
        const percent = Math.min(95, Math.round((testedCount / totalCombinations) * 100));

        if (typeof onProgress === 'function') {
          onProgress(`Compressing... testing ${w}x${h} @ ${Math.round(q * 100)}% quality`, percent);
        }

        // Yield to UI thread to allow status updates
        await new Promise(r => setTimeout(r, 6));

        const rawDataUrl = canvas.toDataURL('image/jpeg', q);
        // Strip data:image/jpeg;base64, prefix to save ~23 bytes of critical payload space
        const candidateDataUrl = rawDataUrl.replace(/^data:image\/jpeg;base64,/, '');

        try {
          // Attempt custom QR Encoding using QREncoder
          const qrResult = QREncoder.encode(candidateDataUrl, { ecl, mode: 'Byte' });

          // SUCCESS! Raw Base64 string fits in QR code capacity
          successResult = {
            qrResult,
            candidateDataUrl: rawDataUrl,
            width: w,
            height: h,
            quality: q,
            origWidth,
            origHeight,
            origSizeBytes,
            compressedSizeBytes: new TextEncoder().encode(candidateDataUrl).length
          };
          break outerLoop;
        } catch (e) {
          // Exceeds QR capacity, try smaller image candidate
        }
      }
    }

    if (typeof onProgress === 'function') {
      onProgress('Compression complete!', 100);
    }

    if (!successResult) {
      throw new Error('Image contains too much detail to fit in QR Code storage limits (~2.9 KB)');
    }

    return successResult;
  }

  return {
    compressImageForQR,
    loadImageFromFile
  };

})();
