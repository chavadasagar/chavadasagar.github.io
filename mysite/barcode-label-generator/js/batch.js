/**
 * Batch Label Generator and Data Parsing Engine
 */

const BatchManager = (function () {
  'use strict';

  /**
   * Parse multi-line raw input or CSV text into label items array
   * @param {string} text Raw text
   * @param {Object} defaultItem Fallback fields (name, price, currency)
   * @returns {Array<Object>} List of label items
   */
  function parseBatchInput(text, defaultItem = {}) {
    if (!text || typeof text !== 'string') return [];

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];

    // Check if first line contains explicit column headers rather than actual data
    const firstLineLower = lines[0].toLowerCase().trim();
    const firstTokens = firstLineLower.split(/[,;\t|]/).map(t => t.trim().replace(/['"]/g, ''));
    const isCsvHeader = firstTokens.some(t => /^(sku|code|barcode|product|product[_\s]?name|title|price|qty|quantity)$/i.test(t));

    const startIndex = isCsvHeader ? 1 : 0;
    const items = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const parsed = parseLine(line, defaultItem);
      if (parsed) {
        items.push(parsed);
      }
    }

    return items;
  }

  /**
   * Parse single line into item object
   * Supports:
   * 1. CSV/TSV: SKU, Name, Price, Qty, Extra
   * 2. Pipe separated: SKU | Name | Price
   * 3. Plain SKU: ITEM1234
   */
  function parseLine(line, defaults = {}) {
    let parts = [];
    if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes('|')) {
      parts = line.split('|');
    } else if (line.includes(',')) {
      // Split with quotes handling
      parts = parseCsvTokens(line);
    } else {
      parts = [line];
    }

    parts = parts.map(p => p.trim());
    const sku = parts[0] || defaults.sku || 'ITEM-001';
    const name = parts[1] !== undefined && parts[1] !== '' ? parts[1] : (defaults.name || 'Sample Product');
    const price = parts[2] !== undefined && parts[2] !== '' ? parts[2] : (defaults.price || '0.00');
    const qty = parts[3] ? parseInt(parts[3], 10) || 1 : (defaults.quantity || 1);
    const extra = parts[4] !== undefined ? parts[4] : (defaults.extra || '');
    const mrp = parts[5] !== undefined ? parts[5] : (defaults.mrp || '');

    return {
      id: 'item_' + Math.random().toString(36).substr(2, 9),
      sku: sku,
      name: name,
      price: price,
      quantity: Math.max(1, qty),
      extra: extra,
      mrp: mrp
    };
  }

  function parseCsvTokens(text) {
    const p = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        p.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    p.push(cur);
    return p;
  }

  /**
   * Generate sequential numbers
   */
  function generateSequence(options) {
    const {
      prefix = 'SKU-',
      start = 1001,
      count = 10,
      suffix = '',
      padDigits = 4,
      name = 'Batch Product',
      price = '19.99',
      quantity = 1
    } = options;

    const items = [];
    const startNum = parseInt(start, 10) || 1;
    const total = Math.min(Math.max(1, parseInt(count, 10) || 10), 500);

    for (let i = 0; i < total; i++) {
      const currentNum = startNum + i;
      const padded = padDigits > 0 ? String(currentNum).padStart(padDigits, '0') : String(currentNum);
      const sku = `${prefix}${padded}${suffix}`;

      items.push({
        id: 'item_seq_' + i + '_' + Date.now(),
        sku: sku,
        name: `${name} #${currentNum}`,
        price: price,
        quantity: quantity,
        extra: '',
        mrp: ''
      });
    }

    return items;
  }

  /**
   * Expand items array by their quantity multiplier for printing
   */
  function flattenForPrint(items) {
    const flattened = [];
    for (const item of items) {
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      for (let q = 0; q < qty; q++) {
        flattened.push({
          ...item,
          printIndex: flattened.length + 1,
          copyIndex: q + 1,
          totalCopies: qty
        });
      }
    }
    return flattened;
  }

  return {
    parseBatchInput,
    parseLine,
    generateSequence,
    flattenForPrint
  };
})();

if (typeof window !== 'undefined') {
  window.BatchManager = BatchManager;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BatchManager;
}
