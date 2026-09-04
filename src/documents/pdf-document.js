import * as pdfjs from "../vendor/pdf.mjs";
import { PDFDocument, StandardFonts, rgb, degrees } from "../vendor/pdf-lib.mjs";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("../vendor/pdf.worker.mjs", import.meta.url).href;

export async function openPdfDocument(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const task = pdfjs.getDocument({ data: data.slice() });
  const pdf = await task.promise;
  return { bytes: data, pdf, pageCount: pdf.numPages };
}

export async function renderPdfPage(model, pageNumber, canvas, textLayer, edits = []) {
  const page = await model.pdf.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.max(.5, Math.min(2.5, (textLayer.parentElement.clientWidth - 20) / base.width || 1));
  const viewport = page.getViewport({ scale });
  canvas.width = Math.ceil(viewport.width * devicePixelRatio);
  canvas.height = Math.ceil(viewport.height * devicePixelRatio);
  canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
  textLayer.style.width = `${viewport.width}px`; textLayer.style.height = `${viewport.height}px`;
  await page.render({ canvasContext: canvas.getContext("2d"), viewport, transform: devicePixelRatio === 1 ? null : [devicePixelRatio, 0, 0, devicePixelRatio, 0, 0] }).promise;
  const content = await page.getTextContent();
  textLayer.replaceChildren();
  content.items.forEach((item, index) => {
    if (!item.str?.trim()) return;
    const [, , , d, x, y] = pdfjs.Util.transform(viewport.transform, item.transform);
    const height = Math.max(8, Math.hypot(item.transform[2], item.transform[3]) * scale);
    const saved = edits.find((edit) => edit.page === pageNumber && edit.index === index);
    const span = document.createElement("span");
    span.className = "pdf-text-item"; span.dataset.index = String(index);
    span.textContent = saved?.replacement ?? item.str;
    Object.assign(span.style, { left: `${x}px`, top: `${y - height}px`, width: `${Math.max(item.width * scale, 8)}px`, height: `${height * 1.25}px`, fontSize: `${height}px` });
    textLayer.append(span);
  });
  return { viewport, content };
}

export async function serializeEditedPdf(model, edits) {
  const output = await PDFDocument.load(model.bytes.slice(), { ignoreEncryption: false });
  const font = await output.embedFont(StandardFonts.Helvetica);
  for (const edit of edits) {
    const page = output.getPage(edit.page - 1);
    const size = Math.max(4, Number(edit.fontSize) || 12);
    // V1 visual replacement: cover the source glyph area and draw the edit.
    // This preserves every unedited page and keeps the replacement searchable.
    page.drawRectangle({ x: edit.x, y: edit.y, width: Math.max(edit.width, 2), height: Math.max(edit.height, size), color: rgb(1, 1, 1) });
    page.drawText(edit.replacement || " ", { x: edit.x, y: edit.y, size, font, color: rgb(0, 0, 0), rotate: degrees(edit.rotation || 0), maxWidth: Math.max(edit.width * 2, 20) });
  }
  return new Blob([await output.save()], { type: "application/pdf" });
}

export async function transformPdfPages(bytes, operation) {
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const pdf = await PDFDocument.load(source.slice(), { ignoreEncryption: false });
  const count = pdf.getPageCount();
  const pageIndex = Math.max(0, Math.min(count - 1, Number(operation.page) - 1));
  if (operation.type === "rotate") {
    const page = pdf.getPage(pageIndex);
    page.setRotation(degrees((page.getRotation().angle + Number(operation.degrees || 90) + 360) % 360));
  } else if (operation.type === "delete") {
    if (count <= 1) throw new Error("A PDF must keep at least one page");
    pdf.removePage(pageIndex);
  } else if (operation.type === "duplicate") {
    const [copy] = await pdf.copyPages(pdf, [pageIndex]); pdf.insertPage(pageIndex + 1, copy);
  } else if (operation.type === "move") {
    const target = Math.max(0, Math.min(count - 1, Number(operation.to) - 1));
    if (target !== pageIndex) { const [copy] = await pdf.copyPages(pdf, [pageIndex]); pdf.removePage(pageIndex); pdf.insertPage(target, copy); }
  } else throw new Error(`Unsupported PDF page operation: ${operation.type}`);
  return new Uint8Array(await pdf.save());
}
