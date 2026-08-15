/**
 * Cryptographically Secure GUID / UUID Generator Module
 */

/**
 * Generates a single RFC 4122 v4 compliant GUID/UUID
 * @param {Object} options
 * @param {boolean} options.uppercase - Return in UPPERCASE if true
 * @param {boolean} options.hyphens - Include hyphens if true
 * @param {string} options.enclosure - 'none' | 'braces' | 'parentheses' | 'csharp' | 'quotes'
 * @returns {string}
 */
export function GenerateGUID(options = {}) {
  const {
    uppercase = true,
    hyphens = true,
    enclosure = 'none'
  } = options;

  let uuid;

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    uuid = crypto.randomUUID();
  } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Per RFC 4122 v4
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    uuid = `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
  } else {
    // Fallback pseudo-random implementation
    uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Handle hyphens toggle
  if (!hyphens) {
    uuid = uuid.replace(/-/g, '');
  }

  // Handle case toggle
  if (uppercase) {
    uuid = uuid.toUpperCase();
  } else {
    uuid = uuid.toLowerCase();
  }

  // Handle enclosure
  switch (enclosure) {
    case 'braces':
      return `{${uuid}}`;
    case 'parentheses':
      return `(${uuid})`;
    case 'csharp':
      return `Guid.Parse("${uuid}")`;
    case 'quotes':
      return `"${uuid}"`;
    case 'none':
    default:
      return uuid;
  }
}

/**
 * Generates an array of GUIDs
 * @param {number} count Number of GUIDs to generate
 * @param {Object} options Options passed to GenerateGUID
 * @returns {string[]}
 */
export function GenerateBulkGUIDs(count = 10, options = {}) {
  const safeCount = Math.min(Math.max(1, count), 1000);
  const result = [];
  for (let i = 0; i < safeCount; i++) {
    result.push(GenerateGUID(options));
  }
  return result;
}