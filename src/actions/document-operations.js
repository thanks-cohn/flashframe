import { PDFDocument, StandardFonts, rgb, degrees } from "../vendor/pdf-lib.mjs";
import { zipSync, unzipSync } from "../vendor/fflate.mjs";

const xmlEscape = (value) => String(value).replace(/[<>&'\"]/g, (character) => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", "'":"&apos;", '"':"&quot;" })[character]);

export function readableText(html) {
  if (typeof DOMParser !== "undefined") return new DOMParser().parseFromString(html, "text/html").body.textContent || "";
  return String(html).replace(/<br\s*\/?\s*>/gi, "\n").replace(/<\/p\s*>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

export function compareText(before, after) {
  const left=String(before).split(/\s+/),right=String(after).split(/\s+/),rows=left.length+1,columns=right.length+1,table=Array.from({length:rows},()=>new Uint32Array(columns));
  for(let i=1;i<rows;i++)for(let j=1;j<columns;j++)table[i][j]=left[i-1]===right[j-1]?table[i-1][j-1]+1:Math.max(table[i-1][j],table[i][j-1]);
  const changes=[];let i=left.length,j=right.length;while(i||j){if(i&&j&&left[i-1]===right[j-1]){changes.push({type:"same",text:left[--i]});j--;}else if(j&&(!i||table[i][j-1]>=table[i-1][j]))changes.push({type:"insert",text:right[--j]});else changes.push({type:"delete",text:left[--i]});}return changes.reverse();
}

export function replaceAllText(text, search, replacement, { matchCase = false } = {}) {
  if (!search) return { text:String(text), count:0 };
  const escaped=String(search).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),expression=new RegExp(escaped,matchCase?"g":"gi");let count=0;
  return {text:String(text).replace(expression,()=>{count++;return replacement;}),count};
}

export async function extractDocxText(input) {
  const entries=unzipSync(input instanceof Uint8Array?input:new Uint8Array(await input.arrayBuffer()));const document=entries["word/document.xml"];
  if(!document)throw new Error("This DOCX has no document body.");return new TextDecoder().decode(document).replace(/<w:tab\/?\s*>/g,"\t").replace(/<w:br\/?\s*>/g,"\n").replace(/<\/w:p>/g,"\n").replace(/<[^>]+>/g,"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").trim();
}

export function createSimpleDocx(text) {
  const paragraphs=String(text).split(/\n/).map(line=>`<w:p><w:r><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r></w:p>`).join("");
  const files={"[Content_Types].xml":new TextEncoder().encode('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),"_rels/.rels":new TextEncoder().encode('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),"word/document.xml":new TextEncoder().encode(`<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr/></w:body></w:document>`)};
  return new Blob([zipSync(files)],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}

export async function textToPdf(text,{title="Document",pageNumbers=false,watermark=""}={}) {
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),size=11,lineHeight=15,width=612,height=792,margin=54,maxChars=88;let lines=[];
  for(const raw of String(text).split("\n")){if(!raw){lines.push("");continue;}for(let at=0;at<raw.length;at+=maxChars)lines.push(raw.slice(at,at+maxChars));}
  const perPage=Math.floor((height-margin*2)/lineHeight);for(let at=0;at<Math.max(1,lines.length);at+=perPage){const page=pdf.addPage([width,height]);lines.slice(at,at+perPage).forEach((line,index)=>page.drawText(line,{x:margin,y:height-margin-index*lineHeight,font,size,color:rgb(0,0,0)}));if(watermark)page.drawText(watermark,{x:margin+60,y:height/2,font,size:42,color:rgb(.7,.7,.7),opacity:.3,rotate:degrees(35)});if(pageNumbers)page.drawText(String(pdf.getPageCount()),{x:width/2,y:25,font,size:10});}
  pdf.setTitle(title);return new Blob([await pdf.save()],{type:"application/pdf"});
}
