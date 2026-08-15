/**
 * File Converter Engine - Client-Side Parser, Serializer & Utilities
 * 100% In-Browser & Privacy-Focused
 */

const Converter = (() => {
  'use strict';

  // --- 1. CSV Parser (RFC 4180 Compliant with Nested & Delimiter Support) ---

  function detectDelimiter(text) {
    const sample = text.split(/\r?\n/).slice(0, 5).join('\n');
    const delimiters = [',', ';', '\t', '|'];
    let bestDelim = ',';
    let maxCount = 0;

    delimiters.forEach(delim => {
      // Count occurrences outside quotes
      let inQuote = false;
      let count = 0;
      for (let i = 0; i < sample.length; i++) {
        const char = sample[i];
        if (char === '"') inQuote = !inQuote;
        else if (!inQuote && char === delim) count++;
      }
      if (count > maxCount) {
        maxCount = count;
        bestDelim = delim;
      }
    });

    return bestDelim;
  }

  function parseCSVToRows(csvText, delimiter = ',') {
    if (!csvText || !csvText.trim()) return [];
    
    if (delimiter === 'auto') {
      delimiter = detectDelimiter(csvText);
    }

    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    let fieldStartedWithQuote = false;
    let i = 0;
    const len = csvText.length;
    let lineNum = 1;

    while (i < len) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '\n') lineNum++;

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            // Escaped quote: "" -> "
            currentField += '"';
            i += 2;
            continue;
          } else {
            // End of quoted field
            inQuotes = false;
            i++;
            continue;
          }
        } else {
          currentField += char;
          i++;
          continue;
        }
      } else {
        if (char === '"') {
          if (currentField.length === 0) {
            // Starting a quoted field
            inQuotes = true;
            fieldStartedWithQuote = true;
            i++;
            continue;
          } else {
            // Quote inside an unquoted field (e.g. 34" or unescaped quote) - treat as literal
            currentField += '"';
            i++;
            continue;
          }
        }

        // Check for delimiter
        if (csvText.startsWith(delimiter, i)) {
          currentRow.push(currentField);
          currentField = '';
          fieldStartedWithQuote = false;
          i += delimiter.length;
          continue;
        }

        if (char === '\r') {
          if (nextChar === '\n') {
            i += 2;
          } else {
            i++;
          }
          currentRow.push(currentField);
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
          fieldStartedWithQuote = false;
          continue;
        }

        if (char === '\n') {
          currentRow.push(currentField);
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
          fieldStartedWithQuote = false;
          i++;
          continue;
        }

        currentField += char;
        i++;
      }
    }

    if (inQuotes && fieldStartedWithQuote && currentField.trim()) {
      // If unclosed quotes at EOF, we gracefully complete the field rather than hard failing
      // while still recording the parsed content
    }

    if (currentField !== '' || currentRow.length > 0) {
      currentRow.push(currentField);
      rows.push(currentRow);
    }

    // Filter out trailing empty rows
    while (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0].trim() === '') {
      rows.pop();
    }

    return rows;
  }

  function coerceValue(val, parseTypes = true) {
    if (!parseTypes) return val;
    if (val === null || val === undefined) return val;
    const trimmed = val.trim();
    if (trimmed === '') return '';
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    if (trimmed.toLowerCase() === 'null') return null;
    if (!isNaN(trimmed) && trimmed !== '' && !/^\s*0[0-9]+/.test(trimmed)) {
      const num = Number(trimmed);
      if (Number.isSafeInteger(num) || (!Number.isNaN(num) && trimmed.includes('.'))) {
        return num;
      }
    }
    return val;
  }

  // Assign value to a deep path, supporting dot notation and array indices (e.g. "address.city", "tags[0]")
  function setDeepValue(obj, path, value) {
    // Break path into parts like ['user', 'address', 'city'] or ['tags', '0']
    const parts = path.replace(/\[(\w+)\]/g, '.$1').split('.');
    let current = obj;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        if (Array.isArray(current) && !isNaN(part)) {
          current[parseInt(part, 10)] = value;
        } else {
          current[part] = value;
        }
      } else {
        const nextPart = parts[i + 1];
        const nextIsArray = /^\d+$/.test(nextPart);

        if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
          current[part] = nextIsArray ? [] : {};
        }
        current = current[part];
      }
    }
  }

  function csvToJson(csvText, options = {}) {
    const {
      delimiter = 'auto',
      hasHeaders = true,
      parseTypes = true,
      unflattenNested = true,
      outputFormat = 'array' // 'array' | 'keyed' | 'array_of_arrays'
    } = options;

    if (!csvText || !csvText.trim()) {
      return '[]';
    }

    const actualDelim = delimiter === 'auto' ? detectDelimiter(csvText) : delimiter;
    const rows = parseCSVToRows(csvText, actualDelim);

    if (rows.length === 0) return '[]';

    if (!hasHeaders) {
      const processed = rows.map(r => r.map(v => coerceValue(v, parseTypes)));
      return JSON.stringify(processed, null, 2);
    }

    const headerRow = rows[0].map(h => h.trim());
    const dataRows = rows.slice(1);

    // Validate headers
    if (headerRow.length === 0 || headerRow.every(h => h === '')) {
      throw new Error('CSV Error: First row is empty and cannot be used as headers. Toggle "Has Header Row" off if no headers exist.');
    }

    const warnings = [];
    const result = [];

    dataRows.forEach((row, rowIndex) => {
      if (row.length !== headerRow.length) {
        if (warnings.length < 5) {
          warnings.push(`Row ${rowIndex + 2} has ${row.length} columns, but header has ${headerRow.length}.`);
        }
      }

      if (unflattenNested) {
        const rowObj = {};
        headerRow.forEach((header, colIndex) => {
          const key = header || `col_${colIndex + 1}`;
          const val = colIndex < row.length ? coerceValue(row[colIndex], parseTypes) : null;
          setDeepValue(rowObj, key, val);
        });
        result.push(rowObj);
      } else {
        const rowObj = {};
        headerRow.forEach((header, colIndex) => {
          const key = header || `col_${colIndex + 1}`;
          rowObj[key] = colIndex < row.length ? coerceValue(row[colIndex], parseTypes) : null;
        });
        result.push(rowObj);
      }
    });

    return {
      json: JSON.stringify(result, null, 2),
      data: result,
      detectedDelimiter: actualDelim,
      rowCount: result.length,
      columnCount: headerRow.length,
      warnings
    };
  }

  // --- 2. JSON to CSV Serializer (with Deep Flattening & Key Union) ---

  function flattenObject(obj, prefix = '', delimiter = '.') {
    const flattened = {};

    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const value = obj[key];
      const newKey = prefix ? `${prefix}${delimiter}${key}` : key;

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, flattenObject(value, newKey, delimiter));
      } else if (Array.isArray(value)) {
        // If it's a primitive array, stringify or index
        const allPrimitives = value.every(item => item === null || typeof item !== 'object');
        if (allPrimitives) {
          flattened[newKey] = JSON.stringify(value);
        } else {
          // Flatten array items by index
          value.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              Object.assign(flattened, flattenObject(item, `${newKey}[${index}]`, delimiter));
            } else {
              flattened[`${newKey}[${index}]`] = item;
            }
          });
        }
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  }

  function escapeCSVCell(value, delimiter = ',', quoting = 'auto') {
    if (value === null || value === undefined) {
      return '';
    }

    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);

    const mustQuote = quoting === 'always' ||
      str.includes(delimiter) ||
      str.includes('"') ||
      str.includes('\n') ||
      str.includes('\r');

    if (mustQuote) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function jsonToCsv(jsonText, options = {}) {
    const {
      delimiter = ',',
      flatten = true,
      flattenDelimiter = '.',
      quoteRule = 'auto', // 'auto' | 'always' | 'minimal'
      includeHeaders = true
    } = options;

    if (!jsonText || !jsonText.trim()) {
      return '';
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      // Find line and column of JSON error
      const match = e.message.match(/position (\d+)/i);
      let errorDetail = e.message;
      if (match) {
        const pos = parseInt(match[1], 10);
        const upToPos = jsonText.substring(0, pos);
        const lines = upToPos.split('\n');
        const line = lines.length;
        const col = lines[lines.length - 1].length + 1;
        errorDetail = `Invalid JSON at line ${line}, column ${col}: ${e.message}`;
      }
      throw new Error(errorDetail);
    }

    // Standardize input into array of items
    let items = [];
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return '';
      // If array of arrays
      if (Array.isArray(parsed[0])) {
        return parsed.map(row => row.map(cell => escapeCSVCell(cell, delimiter, quoteRule)).join(delimiter)).join('\n');
      }
      items = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
      // Check if it's a wrapper object containing an array property (e.g. { data: [...], users: [...] })
      const arrayKeys = Object.keys(parsed).filter(k => Array.isArray(parsed[k]));
      if (arrayKeys.length === 1 && parsed[arrayKeys[0]].length > 0 && typeof parsed[arrayKeys[0]][0] === 'object') {
        items = parsed[arrayKeys[0]];
      } else {
        items = [parsed];
      }
    } else {
      throw new Error('Invalid JSON structure: Expected a JSON Array of objects or a single Object.');
    }

    // Flatten if requested
    const processedItems = items.map(item => {
      if (typeof item !== 'object' || item === null) {
        return { value: item };
      }
      return flatten ? flattenObject(item, '', flattenDelimiter) : item;
    });

    // Collect all unique column headers across all objects (Union)
    const headerSet = new Set();
    processedItems.forEach(item => {
      Object.keys(item).forEach(key => headerSet.add(key));
    });

    const headers = Array.from(headerSet);

    if (headers.length === 0) {
      return '';
    }

    const csvLines = [];

    if (includeHeaders) {
      csvLines.push(headers.map(h => escapeCSVCell(h, delimiter, quoteRule)).join(delimiter));
    }

    processedItems.forEach(item => {
      const row = headers.map(header => {
        const val = Object.prototype.hasOwnProperty.call(item, header) ? item[header] : '';
        return escapeCSVCell(val, delimiter, quoteRule);
      });
      csvLines.push(row.join(delimiter));
    });

    return {
      csv: csvLines.join('\n'),
      headers,
      rowCount: processedItems.length,
      columnCount: headers.length,
      data: processedItems
    };
  }

  // --- 3. Text & Code Format Utilities ---

  const TextUtils = {
    // Case converters
    toUpper: (text) => text.toUpperCase(),
    toLower: (text) => text.toLowerCase(),
    toTitleCase: (text) => {
      return text.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      });
    },
    toSentenceCase: (text) => {
      return text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase());
    },
    toCamelCase: (text) => {
      return text
        .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
        .replace(/^[A-Z]/, (c) => c.toLowerCase());
    },
    toPascalCase: (text) => {
      const camel = TextUtils.toCamelCase(text);
      return camel.charAt(0).toUpperCase() + camel.slice(1);
    },
    toSnakeCase: (text) => {
      return text
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s\W-]+/g, '_')
        .toLowerCase()
        .replace(/^_+|_+$/g, '');
    },
    toKebabCase: (text) => {
      return text
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s\W_]+/g, '-')
        .toLowerCase()
        .replace(/^-+|-+$/g, '');
    },
    toConstantCase: (text) => {
      return TextUtils.toSnakeCase(text).toUpperCase();
    },

    // Cleaners & Manipulators
    trimLines: (text) => {
      return text.split(/\r?\n/).map(line => line.trim()).join('\n');
    },
    removeEmptyLines: (text) => {
      return text.split(/\r?\n/).filter(line => line.trim() !== '').join('\n');
    },
    removeDuplicateLines: (text, caseSensitive = true) => {
      const lines = text.split(/\r?\n/);
      const seen = new Set();
      const result = [];
      lines.forEach(line => {
        const key = caseSensitive ? line : line.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          result.push(line);
        }
      });
      return result.join('\n');
    },
    sortLinesAZ: (text, caseSensitive = false) => {
      const lines = text.split(/\r?\n/);
      return lines.sort((a, b) => {
        return caseSensitive ? a.localeCompare(b) : a.toLowerCase().localeCompare(b.toLowerCase());
      }).join('\n');
    },
    sortLinesZA: (text, caseSensitive = false) => {
      const lines = text.split(/\r?\n/);
      return lines.sort((a, b) => {
        return caseSensitive ? b.localeCompare(a) : b.toLowerCase().localeCompare(a.toLowerCase());
      }).join('\n');
    },
    sortLinesLength: (text, ascending = true) => {
      const lines = text.split(/\r?\n/);
      return lines.sort((a, b) => ascending ? a.length - b.length : b.length - a.length).join('\n');
    },
    reverseLines: (text) => {
      return text.split(/\r?\n/).reverse().join('\n');
    },
    reverseCharacters: (text) => {
      return text.split('').reverse().join('');
    },
    addLineNumbers: (text, padding = true) => {
      const lines = text.split(/\r?\n/);
      const maxLen = String(lines.length).length;
      return lines.map((line, idx) => {
        const num = padding ? String(idx + 1).padStart(maxLen, ' ') : String(idx + 1);
        return `${num}. ${line}`;
      }).join('\n');
    },
    stripHtml: (text) => {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      return doc.body.textContent || "";
    },

    // Encoders & Decoders
    urlEncode: (text) => encodeURIComponent(text),
    urlDecode: (text) => {
      try {
        return decodeURIComponent(text);
      } catch (e) {
        throw new Error('Malformed URL encoded string.');
      }
    },
    base64Encode: (text) => {
      try {
        const bytes = new TextEncoder().encode(text);
        let binString = '';
        bytes.forEach(byte => binString += String.fromCharCode(byte));
        return btoa(binString);
      } catch (e) {
        throw new Error(`Base64 Encoding Failed: ${e.message}`);
      }
    },
    base64Decode: (text) => {
      try {
        const binString = atob(text.trim());
        const bytes = Uint8Array.from(binString, (m) => m.charCodeAt(0));
        return new TextDecoder().decode(bytes);
      } catch (e) {
        throw new Error('Invalid Base64 string. Please verify input characters.');
      }
    },

    // JSON Pretty / Minify / Key Sort
    formatJson: (jsonText, indent = 2) => {
      const parsed = JSON.parse(jsonText);
      return JSON.stringify(parsed, null, indent);
    },
    minifyJson: (jsonText) => {
      const parsed = JSON.parse(jsonText);
      return JSON.stringify(parsed);
    },
    sortJsonKeys: (jsonText) => {
      function sortObj(obj) {
        if (Array.isArray(obj)) {
          return obj.map(sortObj);
        } else if (obj !== null && typeof obj === 'object') {
          return Object.keys(obj)
            .sort()
            .reduce((acc, key) => {
              acc[key] = sortObj(obj[key]);
              return acc;
            }, {});
        }
        return obj;
      }
      const parsed = JSON.parse(jsonText);
      return JSON.stringify(sortObj(parsed), null, 2);
    },

    // Statistics Counter
    getStats: (text) => {
      if (!text) {
        return {
          characters: 0,
          charactersNoSpaces: 0,
          words: 0,
          lines: 0,
          nonEmptyLines: 0,
          sentences: 0,
          paragraphs: 0,
          bytes: 0,
          readingTime: '0 sec'
        };
      }

      const characters = text.length;
      const charactersNoSpaces = text.replace(/\s/g, '').length;
      const words = (text.trim().match(/\b\S+\b/g) || []).length;
      const lines = text.split(/\r?\n/).length;
      const nonEmptyLines = text.split(/\r?\n/).filter(l => l.trim().length > 0).length;
      const sentences = (text.match(/[^.!?]+[.!?]+/g) || []).length || (text.trim().length > 0 ? 1 : 0);
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length || (text.trim().length > 0 ? 1 : 0);
      const bytes = new TextEncoder().encode(text).length;
      
      // Reading time based on 200 WPM
      const minutes = words / 200;
      let readingTime;
      if (minutes < 1) {
        readingTime = `${Math.ceil(minutes * 60)} sec`;
      } else {
        readingTime = `${Math.ceil(minutes)} min`;
      }

      return {
        characters,
        charactersNoSpaces,
        words,
        lines,
        nonEmptyLines,
        sentences,
        paragraphs,
        bytes,
        readingTime
      };
    }
  };

  // Syntax Highlighter for JSON
  function highlightJson(json) {
    if (typeof json !== 'string') {
      json = JSON.stringify(json, null, 2);
    }
    const escaped = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, function (match) {
      let cls = 'hl-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'hl-key';
        } else {
          cls = 'hl-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'hl-boolean';
      } else if (/null/.test(match)) {
        cls = 'hl-null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    });
  }

  return {
    detectDelimiter,
    parseCSVToRows,
    csvToJson,
    jsonToCsv,
    TextUtils,
    highlightJson
  };
})();

// Export for module or browser window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Converter;
}
