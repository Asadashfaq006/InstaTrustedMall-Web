// src/utils/columnMatcher.js – Auto-match CSV/Excel headers to InstaMall fields

// Keyword aliases for each data field
const FIELD_ALIASES = {
  products: {
    name:     ['name', 'product name', 'product_name', 'productname', 'title', 'item', 'item name'],
    sku:      ['sku', 'product code', 'product_code', 'code', 'item code', 'model', 'part no', 'part number'],
    barcode:  ['barcode', 'bar code', 'upc', 'ean', 'isbn', 'gtin'],
    category: ['category', 'cat', 'group', 'type', 'product type', 'product_type', 'department'],
  },
  buyers: {
    fullName:     ['name', 'full name', 'full_name', 'contact name', 'buyer name', 'customer name', 'customer'],
    businessName: ['business', 'business name', 'business_name', 'company', 'company name', 'firm', 'shop'],
    phone:        ['phone', 'telephone', 'mobile', 'cell', 'phone number', 'contact number', 'tel', 'whatsapp'],
    email:        ['email', 'e-mail', 'email address', 'mail'],
    address:      ['address', 'street', 'location', 'addr', 'street address'],
    city:         ['city', 'town', 'area', 'region', 'district'],
  },
};

/**
 * Auto-match CSV/Excel headers to InstaMall fields.
 * @param {string[]} headers - The headers from the file.
 * @param {'products'|'buyers'} entityType - Type of data to import.
 * @param {Array} customColumns - Custom columns (for products) with { id, name }.
 * @returns {Object} mapping: { fieldName: headerIndex } and reverse { headerIndex: fieldName }
 */
export function autoMatchColumns(headers, entityType, customColumns = []) {
  const aliases = FIELD_ALIASES[entityType] || {};
  const mapping = {}; // fieldName → headerName

  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

  // Match standard fields
  for (const [field, keywords] of Object.entries(aliases)) {
    let bestMatch = null;
    let bestScore = 0;

    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i];
      for (const kw of keywords) {
        // Exact match gets highest score
        if (header === kw) {
          if (3 > bestScore) {
            bestScore = 3;
            bestMatch = headers[i];
          }
        }
        // Contains match
        else if (header.includes(kw) || kw.includes(header)) {
          if (2 > bestScore) {
            bestScore = 2;
            bestMatch = headers[i];
          }
        }
        // Partial overlap (first word match)
        else if (header.split(/[\s_-]/)[0] === kw.split(/[\s_-]/)[0] && header.split(/[\s_-]/)[0].length > 2) {
          if (1 > bestScore) {
            bestScore = 1;
            bestMatch = headers[i];
          }
        }
      }
    }

    if (bestMatch) mapping[field] = bestMatch;
  }

  // For products, try to match custom columns by name similarity
  if (entityType === 'products' && customColumns.length > 0) {
    for (const col of customColumns) {
      const colNameLower = col.name.toLowerCase().trim();
      for (let i = 0; i < normalizedHeaders.length; i++) {
        const header = normalizedHeaders[i];
        // Check if already mapped
        if (Object.values(mapping).includes(headers[i])) continue;

        if (header === colNameLower || header.includes(colNameLower) || colNameLower.includes(header)) {
          mapping[`custom:${col.id}:${col.name}`] = headers[i];
          break;
        }
      }
    }
  }

  return mapping;
}

/**
 * Apply column mapping to raw row data.
 * @param {Object} rawRow - Original row from parser { headerName: value }.
 * @param {Object} mapping - The mapping { fieldName: headerName }.
 * @returns {Object} mapped row with InstaMall field names.
 */
export function applyMapping(rawRow, mapping) {
  const result = { values: {} };

  for (const [field, header] of Object.entries(mapping)) {
    if (!header) continue;
    const value = rawRow[header] ?? '';

    if (field.startsWith('custom:')) {
      const parts = field.split(':');
      const colName = parts.slice(2).join(':');
      result.values[colName] = value;
    } else {
      result[field] = value;
    }
  }

  return result;
}

export default { autoMatchColumns, applyMapping, FIELD_ALIASES };
