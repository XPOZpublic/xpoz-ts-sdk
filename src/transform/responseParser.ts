type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type ParsedDict = { [key: string]: JsonValue };

export function parseResponseText(text: string): ParsedDict {
  if (!text.trim()) return {};

  if (text.trimStart().startsWith("{")) {
    try {
      return JSON.parse(text) as ParsedDict;
    } catch {
      // fall through
    }
  }

  const lines = text.split("\n");

  if (lines[0].startsWith("operationId:")) {
    return parseFlatKv(lines);
  }

  const result: ParsedDict = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const arrayMatch = line.match(/^data\[(\d+)\]\{(.+)\}:/);
    if (arrayMatch) {
      const fields = arrayMatch[2].split(",").map((f) => f.trim());
      i++;
      result["results"] = parseCsvRows(lines, i, 2, fields);
      i += countIndented(lines, i, 2);
      continue;
    }

    const yamlListMatch = line.match(/^data\[(\d+)\]:/);
    if (yamlListMatch) {
      i++;
      result["results"] = parseYamlList(lines, i, 2);
      i += countIndented(lines, i, 2);
      continue;
    }

    if (line === "data:") {
      i++;
      const [data, consumed] = parseDataBlock(lines, i);
      Object.assign(result, data);
      i += consumed;
      continue;
    }

    if (line.startsWith("success:")) {
      i++;
      continue;
    }

    const kvMatch = line.match(/^(\S+?):\s*(.*)/);
    if (kvMatch) {
      result[kvMatch[1]] = coerce(kvMatch[2]);
    }

    i++;
  }

  return result;
}

function parseFlatKv(lines: string[]): ParsedDict {
  const result: ParsedDict = {};
  for (const line of lines) {
    const m = line.match(/^(\S+?):\s*(.*)/);
    if (m) {
      result[m[1]] = coerce(m[2]);
    }
  }
  return result;
}

function parseDataBlock(lines: string[], start: number): [ParsedDict, number] {
  return parseBlock(lines, start, 2);
}

function parseBlock(lines: string[], start: number, indent: number): [ParsedDict, number] {
  const result: ParsedDict = {};
  const prefix = " ".repeat(indent);
  let i = start;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.startsWith(prefix)) break;
    if (line.length > prefix.length && line[prefix.length] === " ") break;

    const stripped = line.slice(indent);

    const arrayMatch = stripped.match(/^(\w+)\[(\d+)\]\{(.+)\}:/);
    if (arrayMatch) {
      const key = arrayMatch[1];
      const fields = arrayMatch[3].split(",").map((f) => f.trim());
      i++;
      result[key] = parseCsvRows(lines, i, indent + 2, fields);
      i += countIndented(lines, i, indent + 2);
      continue;
    }

    const yamlListMatch = stripped.match(/^(\w+)\[(\d+)\]:/);
    if (yamlListMatch) {
      const key = yamlListMatch[1];
      i++;
      result[key] = parseYamlList(lines, i, indent + 2);
      i += countIndented(lines, i, indent + 2);
      continue;
    }

    const kvMatch = stripped.match(/^(\S+?):\s*(.*)/);
    if (kvMatch) {
      const key = kvMatch[1];
      const val = kvMatch[2];
      if (val) {
        result[key] = coerce(val);
        i++;
      } else {
        const childPrefix = " ".repeat(indent + 2);
        if (i + 1 < lines.length && lines[i + 1].startsWith(childPrefix)) {
          i++;
          const [nested, consumed] = parseBlock(lines, i, indent + 2);
          result[key] = nested as JsonValue;
          i += consumed;
        } else {
          result[key] = null;
          i++;
        }
      }
      continue;
    }

    i++;
  }

  return [result, i - start];
}

function parseYamlList(lines: string[], start: number, indent: number): ParsedDict[] {
  const rows: ParsedDict[] = [];
  const prefix = " ".repeat(indent);
  const itemPrefix = prefix + "- ";
  const continuationPrefix = prefix + "  ";
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.startsWith(prefix)) break;
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith(itemPrefix)) {
      const row: ParsedDict = {};
      const firstKv = line.slice(itemPrefix.length);
      const m = firstKv.match(/^(\S+?):\s*(.*)/);
      if (m) {
        row[m[1]] = coerce(m[2]);
      }
      i++;
      while (i < lines.length) {
        const cline = lines[i];
        if (!cline.startsWith(continuationPrefix)) break;
        if (cline.startsWith(itemPrefix)) break;
        const stripped = cline.slice(continuationPrefix.length);
        const cm = stripped.match(/^(\S+?):\s*(.*)/);
        if (cm) {
          row[cm[1]] = coerce(cm[2]);
        }
        i++;
      }
      rows.push(row);
    } else {
      i++;
    }
  }
  return rows;
}

function parseCsvRows(
  lines: string[],
  start: number,
  indent: number,
  fields: string[]
): ParsedDict[] {
  const rows: ParsedDict[] = [];
  const prefix = " ".repeat(indent);
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.startsWith(prefix)) break;
    const rawRow = line.slice(indent);
    if (!rawRow.trim()) {
      i++;
      continue;
    }
    const values = splitToonRow(rawRow);
    const row: ParsedDict = {};
    for (let j = 0; j < fields.length; j++) {
      row[fields[j]] = j < values.length ? coerce(values[j]) : null;
    }
    rows.push(row);
    i++;
  }
  return rows;
}

function splitToonRow(line: string): string[] {
  const values: string[] = [];
  let buf = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];
    if (ch === "\\" && inQuotes && i + 1 < line.length) {
      buf += ch + line[i + 1];
      i += 2;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      buf += ch;
      i++;
      continue;
    }
    if (ch === "," && !inQuotes) {
      values.push(buf.trim());
      buf = "";
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  if (buf || values.length) {
    values.push(buf.trim());
  }
  return values;
}

function countIndented(lines: string[], start: number, indent: number): number {
  const prefix = " ".repeat(indent);
  let count = 0;
  let i = start;
  while (i < lines.length) {
    if (!lines[i].startsWith(prefix) && lines[i].trim()) break;
    count++;
    i++;
  }
  return count;
}

function coerce(value: string): JsonValue {
  if (!value) return null;

  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null" || value === "None") return null;

  const intVal = parseInt(value, 10);
  if (!isNaN(intVal) && String(intVal) === value) {
    if (intVal >= -9007199254740991 && intVal <= 9007199254740991) {
      return intVal;
    }
    return value;
  }

  const floatVal = parseFloat(value);
  if (!isNaN(floatVal) && String(floatVal) === value) {
    return floatVal;
  }

  return value;
}
