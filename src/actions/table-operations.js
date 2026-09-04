export function previewSplitColumn(rows, column, { delimiter = " ", names = ["First", "Last"] } = {}) {
  if (!Array.isArray(rows) || !rows.length) return [];
  const at = Math.max(0, Math.min(Number(column) || 0, rows[0].length - 1));
  return rows.map((row, index) => {
    if (index === 0) return [...row.slice(0, at), ...names, ...row.slice(at + 1)];
    const parts = String(row[at] ?? "").split(delimiter);
    return [...row.slice(0, at), parts.shift() ?? "", parts.join(delimiter), ...row.slice(at + 1)];
  });
}

export function previewMergeColumns(rows, columns, { separator = " ", name = "Combined" } = {}) {
  const selected = [...new Set(columns.map(Number))].sort((a, b) => a - b);
  if (!selected.length) return rows.map((row) => [...row]);
  const first = selected[0];
  return rows.map((row, index) => row.flatMap((value, at) => {
    if (at === first) return [index === 0 ? name : selected.map((column) => String(row[column] ?? "")).join(separator)];
    return selected.includes(at) ? [] : [value];
  }));
}

export function cleanTable(rows, { trim = true, whitespace = true, blankRows = true, capitalization = "none" } = {}) {
  let output = rows.map((row) => row.map((input) => {
    let value = String(input ?? "");
    if (trim) value = value.trim();
    if (whitespace) value = value.replace(/\s+/g, " ");
    if (capitalization === "upper") value = value.toUpperCase();
    if (capitalization === "lower") value = value.toLowerCase();
    if (capitalization === "title") value = value.toLowerCase().replace(/(^|\s)\p{L}/gu, (match) => match.toUpperCase());
    return value;
  }));
  if (blankRows) output = output.filter((row, index) => index === 0 || row.some((value) => value !== ""));
  return output;
}

export function chartSeries(rows, labelColumn, valueColumn) {
  return rows.slice(1).map((row) => ({ label: String(row[labelColumn] ?? ""), value: Number(row[valueColumn]) })).filter((point) => Number.isFinite(point.value));
}
