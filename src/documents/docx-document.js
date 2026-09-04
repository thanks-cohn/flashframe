import { unzipSync, zipSync, strFromU8, strToU8 } from "../vendor/fflate.mjs";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const local = (node) => node?.localName || node?.nodeName?.split(":").pop();
const children = (node, name) => [...(node?.children || [])].filter((item) => local(item) === name);
const descendant = (node, name) => [...(node?.getElementsByTagNameNS?.(W, name) || [])];
const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function parseRun(run) {
  const props = children(run, "rPr")[0];
  const text = [...run.childNodes].map((node) => {
    if (local(node) === "t") return node.textContent || "";
    if (local(node) === "tab") return "\t";
    if (local(node) === "br") return "\n";
    return "";
  }).join("");
  return { text, bold: descendant(props, "b").length > 0, italic: descendant(props, "i").length > 0, underline: descendant(props, "u").length > 0 };
}

function parseParagraph(paragraph) {
  const pPr = children(paragraph, "pPr")[0];
  const style = descendant(pPr, "pStyle")[0]?.getAttributeNS(W, "val") || descendant(pPr, "pStyle")[0]?.getAttribute("w:val") || "";
  const num = descendant(pPr, "numPr").length > 0;
  const alignment = descendant(pPr, "jc")[0]?.getAttributeNS(W, "val") || "left";
  const runs = [];
  for (const child of paragraph.children) {
    if (local(child) === "r") runs.push(parseRun(child));
    if (local(child) === "hyperlink") for (const run of children(child, "r")) runs.push({ ...parseRun(run), hyperlink: child.getAttributeNS(R, "id") || "" });
  }
  return { type: "paragraph", style, list: num, alignment, runs: runs.length ? runs : [{ text: "" }] };
}

export function parseDocx(bytes) {
  const parts = unzipSync(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  const source = parts["word/document.xml"];
  if (!source) throw new Error("This file is not a valid DOCX document (word/document.xml is missing).");
  const xml = strFromU8(source);
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("The DOCX document XML is malformed.");
  const body = descendant(doc, "body")[0];
  if (!body) throw new Error("The DOCX document has no body.");
  const blocks = [];
  for (const child of body.children) {
    if (local(child) === "p") blocks.push(parseParagraph(child));
    if (local(child) === "tbl") blocks.push({ type: "table", rows: children(child, "tr").map((row) => children(row, "tc").map((cell) => descendant(cell, "p").map(parseParagraph))) });
  }
  return { blocks, parts, originalXml: xml };
}

function runXml(run) {
  const props = `${run.bold ? "<w:b/>" : ""}${run.italic ? "<w:i/>" : ""}${run.underline ? '<w:u w:val="single"/>' : ""}`;
  const pieces = String(run.text ?? "").split("\n").map((part, index) => `${index ? "<w:br/>" : ""}<w:t xml:space="preserve">${esc(part)}</w:t>`).join("");
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}${pieces}</w:r>`;
}
function paragraphXml(p) {
  const props = `${p.style ? `<w:pStyle w:val="${esc(p.style)}"/>` : ""}${p.alignment && p.alignment !== "left" ? `<w:jc w:val="${esc(p.alignment)}"/>` : ""}${p.list ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : ""}`;
  return `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ""}${(p.runs || []).map(runXml).join("")}</w:p>`;
}
function blockXml(block) {
  if (block.type === "table") return `<w:tbl>${block.rows.map((row) => `<w:tr>${row.map((cell) => `<w:tc>${cell.map(paragraphXml).join("")}<w:tcPr/></w:tc>`).join("")}</w:tr>`).join("")}</w:tbl>`;
  return paragraphXml(block);
}

export function serializeDocx(model) {
  if (!model?.parts) throw new Error("The original DOCX package is unavailable.");
  const parts = { ...model.parts };
  const runs = [];
  const collect = (blocks) => { for (const block of blocks) { if (block.type === "table") for (const row of block.rows) for (const cell of row) collect(cell); else runs.push(...(block.runs || [])); } };
  collect(model.blocks);
  const originalTextCount = (model.originalXml.match(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g) || []).length;
  if (originalTextCount === runs.length) {
    // Ordinary edits take the least-destructive path: patch text/run formatting
    // in the original XML so drawings, hyperlinks, fields and unknown OOXML
    // remain byte-for-byte represented in the package.
    let index = 0;
    let xml = model.originalXml.replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g, () => `<w:t xml:space="preserve">${esc(runs[index++].text)}</w:t>`);
    index = 0;
    xml = xml.replace(/<w:r(\s[^>]*)?>([\s\S]*?)<\/w:r>/g, (whole, attrs = "", body) => {
      if (!/<w:t(?:\s|>)/.test(body) || !runs[index]) return whole;
      const run = runs[index++];
      const oldProperties = body.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/)?.[1] || "";
      const retained = oldProperties.replace(/<w:(?:b|i|u)(?:\s[^>]*)?\/?>(?:<\/w:(?:b|i|u)>)?/g, "");
      const formatting = `${retained}${run.bold ? "<w:b/>" : ""}${run.italic ? "<w:i/>" : ""}${run.underline ? '<w:u w:val="single"/>' : ""}`;
      const withoutProperties = body.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/, "");
      return `<w:r${attrs}>${formatting ? `<w:rPr>${formatting}</w:rPr>` : ""}${withoutProperties}</w:r>`;
    });
    parts["word/document.xml"] = strToU8(xml);
  } else {
    const section = model.originalXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/)?.[0] || "";
    parts["word/document.xml"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}" xmlns:r="${R}"><w:body>${model.blocks.map(blockXml).join("")}${section}</w:body></w:document>`);
  }
  return new Blob([zipSync(parts, { level: 6 })], { type: CONTENT_TYPE });
}

export const DOCX_MIME = CONTENT_TYPE;
