export function parseCsv(text) {
  const rows = []; let row = []; let cell = ""; let quoted = false;
  const input = String(text).replace(/\r\n?/g, "\n");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted && char === '"' && input[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ",") { row.push(cell); cell = ""; }
    else if (!quoted && char === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
export function serializeCsv(rows) {
  const quote = (value) => { const text = String(value ?? ""); return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; };
  return rows.map((row) => row.map(quote).join(",")).join("\r\n") + "\r\n";
}
export function removeDuplicateRows(rows, header = true) {
  const output = header && rows.length ? [rows[0]] : []; const seen = new Set();
  for (const row of rows.slice(header ? 1 : 0)) { const key = JSON.stringify(row); if (!seen.has(key)) { seen.add(key); output.push(row); } }
  return { rows: output, removed: rows.length - output.length };
}
