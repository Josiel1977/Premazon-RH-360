export type SpreadsheetCell = string | number | boolean | Date | null | undefined;

export interface RumoAoTopoRegistro {
  linha_original: number;
  colaborador_nome_importado: string;
  matricula: string | null;
  setor: string;
  equipe: string;
  funcao: string;
  bonus_original: string;
  elegivel: boolean;
  motivo_ineligibilidade: string | null;
  valor_bonus: number;
  faltas: number;
  atrasos: number;
  atestados: number;
  ferias: boolean;
  dds: string | null;
  observacoes: string | null;
  dados_origem: Record<string, string>;
}

export interface RumoAoTopoImportResult {
  registros: RumoAoTopoRegistro[];
  avisos: string[];
  cabecalhosReconhecidos: string[];
  linhaCabecalho: number;
  linhasLidas: number;
  linhasRejeitadas: number;
}

type CanonicalField =
  | "colaborador"
  | "matricula"
  | "setor"
  | "equipe"
  | "funcao"
  | "bonus"
  | "falta"
  | "atraso"
  | "atestado"
  | "ferias"
  | "dds"
  | "observacoes";

const headerAliases: Record<string, CanonicalField> = {
  colaborador: "colaborador",
  nome: "colaborador",
  nomecolaborador: "colaborador",
  funcionario: "colaborador",
  empregado: "colaborador",
  matricula: "matricula",
  registro: "matricula",
  setor: "setor",
  area: "setor",
  equipe: "equipe",
  turma: "equipe",
  funcao: "funcao",
  cargo: "funcao",
  bonus: "bonus",
  elegivelbonus: "bonus",
  falta: "falta",
  faltas: "falta",
  atraso: "atraso",
  atrasos: "atraso",
  atestado: "atestado",
  atestados: "atestado",
  ferias: "ferias",
  dds: "dds",
  obs: "observacoes",
  observacao: "observacoes",
  observacoes: "observacoes",
};

function cellText(value: SpreadsheetCell): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

export function normalizeHeader(value: SpreadsheetCell): string {
  return cellText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeStatus(value: SpreadsheetCell): string {
  return cellText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function parseInteger(value: SpreadsheetCell): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.trunc(value));
  const text = cellText(value).replace(",", ".");
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function parseOccurrence(value: SpreadsheetCell): number {
  const normalized = normalizeStatus(value);
  if (!normalized || ["0", "NAO", "N/A", "-"].includes(normalized)) return 0;
  const parsed = parseInteger(value);
  return parsed > 0 ? parsed : 1;
}

function detectDelimiter(text: string): string {
  const sampleLines = text.split(/\r?\n/).filter((line) => line.trim()).slice(0, 20);
  const candidates = [";", ",", "\t"];

  function delimiterCount(line: string, delimiter: string) {
    let count = 0;
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      if (line[index] === '"' && line[index + 1] === '"' && quoted) index += 1;
      else if (line[index] === '"') quoted = !quoted;
      else if (line[index] === delimiter && !quoted) count += 1;
    }
    return count;
  }

  return candidates.sort((a, b) => {
    const scoreA = Math.max(0, ...sampleLines.map((line) => delimiterCount(line, a)));
    const scoreB = Math.max(0, ...sampleLines.map((line) => delimiterCount(line, b)));
    return scoreB - scoreA;
  })[0];
}

export function parseDelimitedText(text: string): SpreadsheetCell[][] {
  const delimiter = detectDelimiter(text.replace(/^\uFEFF/, ""));
  const rows: SpreadsheetCell[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value.trim());
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);
  return rows;
}

export function parseRumoAoTopoRows(
  rows: SpreadsheetCell[][],
  valorPremiacao = 100,
): RumoAoTopoImportResult {
  const avisos: string[] = [];
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => headerAliases[normalizeHeader(cell)] === "colaborador"),
  );

  if (headerIndex < 0) {
    throw new Error("Não foi encontrada uma coluna de colaborador na planilha.");
  }

  const rawHeaders = rows[headerIndex].map(cellText);
  const canonicalByIndex = rawHeaders.map((header) => headerAliases[normalizeHeader(header)]);
  const cabecalhosReconhecidos = canonicalByIndex.filter(Boolean) as CanonicalField[];

  if (!cabecalhosReconhecidos.includes("bonus")) {
    throw new Error("A coluna Bonus não foi encontrada na planilha.");
  }

  if (!cabecalhosReconhecidos.includes("setor")) {
    avisos.push("A coluna Setor não foi encontrada; os registros serão classificados como 'Não informado'.");
  }

  const registros: RumoAoTopoRegistro[] = [];
  let linhasRejeitadas = 0;
  const ignoredMarkers = new Set(["INSS", "PACATUBA"]);

  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    if (!row.some((cell) => cellText(cell))) continue;

    const source: Record<string, string> = {};
    const values: Partial<Record<CanonicalField, SpreadsheetCell>> = {};

    rawHeaders.forEach((header, columnIndex) => {
      if (header) source[header] = cellText(row[columnIndex]);
      const canonical = canonicalByIndex[columnIndex];
      if (canonical && values[canonical] === undefined) values[canonical] = row[columnIndex];
    });

    const colaborador = cellText(values.colaborador);
    if (!colaborador) {
      linhasRejeitadas += 1;
      avisos.push(`Linha ${rowIndex + 1}: ignorada porque o colaborador está vazio.`);
      continue;
    }

    if (ignoredMarkers.has(normalizeStatus(colaborador))) {
      avisos.push(`Linha ${rowIndex + 1}: marcador '${colaborador}' ignorado.`);
      continue;
    }

    const bonusOriginal = normalizeStatus(values.bonus);
    const feriasStatus = normalizeStatus(values.ferias);
    const ferias = feriasStatus.includes("FERIAS") || bonusOriginal === "FERIAS";
    const elegivel = bonusOriginal === "SIM" && !ferias;
    const motivo = ferias
      ? "Férias no período"
      : elegivel
        ? null
        : bonusOriginal
          ? `Situação informada: ${cellText(values.bonus)}`
          : "Elegibilidade não informada";

    registros.push({
      linha_original: rowIndex + 1,
      colaborador_nome_importado: colaborador,
      matricula: cellText(values.matricula) || null,
      setor: cellText(values.setor) || "Não informado",
      equipe: cellText(values.equipe) || "Não informada",
      funcao: cellText(values.funcao) || "Não informada",
      bonus_original: cellText(values.bonus),
      elegivel,
      motivo_ineligibilidade: motivo,
      valor_bonus: elegivel ? valorPremiacao : 0,
      faltas: parseInteger(values.falta),
      atrasos: parseOccurrence(values.atraso),
      atestados: parseOccurrence(values.atestado),
      ferias,
      dds: cellText(values.dds) || null,
      observacoes: cellText(values.observacoes) || null,
      dados_origem: source,
    });
  }

  return {
    registros,
    avisos,
    cabecalhosReconhecidos: [...new Set(cabecalhosReconhecidos)],
    linhaCabecalho: headerIndex + 1,
    linhasLidas: Math.max(0, rows.length - headerIndex - 1),
    linhasRejeitadas,
  };
}

export function summarizeRumoAoTopo(registros: RumoAoTopoRegistro[]) {
  return registros.reduce(
    (summary, registro) => ({
      total: summary.total + 1,
      elegiveis: summary.elegiveis + (registro.elegivel ? 1 : 0),
      ferias: summary.ferias + (registro.ferias ? 1 : 0),
      faltas: summary.faltas + registro.faltas,
      atrasos: summary.atrasos + registro.atrasos,
      atestados: summary.atestados + registro.atestados,
      valorTotal: summary.valorTotal + registro.valor_bonus,
    }),
    { total: 0, elegiveis: 0, ferias: 0, faltas: 0, atrasos: 0, atestados: 0, valorTotal: 0 },
  );
}
