import type { SpreadsheetCell } from "@/lib/rumo-ao-topo";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 80 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 2_000;

function assertSafeZip(data: Uint8Array) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let entries = 0;
  let uncompressedBytes = 0;

  for (let offset = 0; offset <= data.length - 46; offset += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) continue;
    entries += 1;
    uncompressedBytes += view.getUint32(offset + 24, true);

    if (entries > MAX_ZIP_ENTRIES || uncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
      throw new Error("A planilha compactada excede os limites seguros de processamento.");
    }

    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    offset += 45 + fileNameLength + extraLength + commentLength;
  }

  if (entries === 0) throw new Error("O arquivo não possui uma estrutura XLSX válida.");
}

function parseXml(content: Uint8Array, name: string) {
  const xml = new DOMParser().parseFromString(new TextDecoder().decode(content), "application/xml");
  if (xml.getElementsByTagName("parsererror").length) {
    throw new Error(`O componente ${name} da planilha está corrompido.`);
  }
  return xml;
}

function cellColumnIndex(reference: string) {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  return letters.split("").reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function nodeText(parent: Element) {
  return Array.from(parent.getElementsByTagName("t"))
    .map((node) => node.textContent ?? "")
    .join("");
}

export async function readXlsxRows(file: File): Promise<SpreadsheetCell[][]> {
  if (file.size > MAX_FILE_BYTES) throw new Error("A planilha excede o limite de 15 MB.");

  const compressed = new Uint8Array(await file.arrayBuffer());
  assertSafeZip(compressed);
  const { unzipSync } = await import("fflate");
  const archive = unzipSync(compressed);

  const workbookBytes = archive["xl/workbook.xml"];
  const relsBytes = archive["xl/_rels/workbook.xml.rels"];
  if (!workbookBytes || !relsBytes) throw new Error("A estrutura interna do XLSX está incompleta.");

  const workbookXml = parseXml(workbookBytes, "workbook.xml");
  const firstSheet = workbookXml.getElementsByTagName("sheet")[0];
  const relationshipId = firstSheet?.getAttribute("r:id");
  if (!relationshipId) throw new Error("A planilha não possui uma primeira aba legível.");

  const relsXml = parseXml(relsBytes, "workbook.xml.rels");
  const relationship = Array.from(relsXml.getElementsByTagName("Relationship")).find(
    (node) => node.getAttribute("Id") === relationshipId,
  );
  const target = relationship?.getAttribute("Target")?.replace(/^\//, "");
  if (!target) throw new Error("Não foi possível localizar a primeira aba do XLSX.");
  const sheetPath = target.startsWith("xl/") ? target : `xl/${target.replace(/^\.\//, "")}`;
  const sheetBytes = archive[sheetPath];
  if (!sheetBytes) throw new Error("A primeira aba do XLSX não foi encontrada.");

  const sharedStringsBytes = archive["xl/sharedStrings.xml"];
  const sharedStrings = sharedStringsBytes
    ? Array.from(parseXml(sharedStringsBytes, "sharedStrings.xml").getElementsByTagName("si")).map(nodeText)
    : [];
  const sheetXml = parseXml(sheetBytes, sheetPath);

  return Array.from(sheetXml.getElementsByTagName("row")).map((rowNode) => {
    const row: SpreadsheetCell[] = [];
    Array.from(rowNode.getElementsByTagName("c")).forEach((cellNode) => {
      const columnIndex = cellColumnIndex(cellNode.getAttribute("r") ?? "A1");
      const type = cellNode.getAttribute("t");
      const raw = cellNode.getElementsByTagName("v")[0]?.textContent ?? "";
      let value: SpreadsheetCell = raw;

      if (type === "s") value = sharedStrings[Number(raw)] ?? "";
      else if (type === "inlineStr") value = nodeText(cellNode);
      else if (type === "b") value = raw === "1";
      else if (type !== "str" && raw !== "" && Number.isFinite(Number(raw))) value = Number(raw);

      row[columnIndex] = value;
    });
    return row;
  });
}
