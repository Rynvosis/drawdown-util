// CSV parser — handles quoted fields (RFC 4180) and backslash-escaped commas from Lightspeed exports

export function parseCSV(text) {
  const lines = splitLines(text);
  if (!lines.length) return [];
  const headers = splitLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = splitLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = (vals[i] || '').trim());
    return obj;
  });
}

// Split text into lines, respecting quoted fields that span newlines
function splitLines(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (current.trim()) lines.push(current);
      current = '';
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);
  return lines;
}

// Split a single CSV line into fields, handling quotes and backslash-escaped commas
function splitLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      if (current.endsWith('\\')) {
        // Lightspeed backslash-escaped comma — keep as literal comma
        current = current.slice(0, -1) + ',';
      } else {
        fields.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  fields.push(current.replace(/\\$/, ''));
  return fields;
}
