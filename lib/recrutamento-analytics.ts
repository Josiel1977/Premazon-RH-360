export type RecruitmentHistoryRecord = {
  linha_original: number;
  cargo: string;
  departamento: string;
  gestor: string;
  data_abertura: string | null;
  tipo_contratacao: string;
  colaborador_substituido: string | null;
  colaborador_contratado: string | null;
  data_admissao: string | null;
  data_demissao: string | null;
  tipo_desligamento: string | null;
  motivo_desligamento: string | null;
  data_fechamento: string | null;
  sla_dias: number | null;
  custo_colaborador: number | null;
  custo_epi: number | null;
  custo_uniforme: number | null;
  tamanho_calca: string | null;
  tamanho_camisa: string | null;
  tamanho_bota: string | null;
};

export type RecruitmentParseResult = {
  registros: RecruitmentHistoryRecord[];
  avisos: string[];
  linhasLidas: number;
  linhasRejeitadas: number;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else current += character;
  }
  cells.push(current.trim());
  return cells;
}

function parseRows(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  const first = lines[0] ?? "";
  const delimiter = (first.match(/;/g)?.length ?? 0) >= (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  return lines.map((line) => parseDelimitedLine(line, delimiter));
}

function isoDate(value: string) {
  const text = value.trim();
  if (!text) return null;
  const brazilian = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brazilian) {
    const [, day, month, year] = brazilian;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day)) {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return null;
}

function numeric(value: string) {
  const text = value.trim().replace(/R\$/gi, "").replace(/\s/g, "");
  if (!text) return null;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}

function optional(value: string | undefined) {
  return value?.trim() || null;
}

function indexFor(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.some((alias) => header.includes(alias)));
}

export function decodeRecruitmentCsv(buffer: ArrayBuffer) {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("windows-1252").decode(buffer);
}

export function parseRecruitmentHistory(text: string): RecruitmentParseResult {
  const rows = parseRows(text);
  if (!rows.length) throw new Error("O arquivo CSV está vazio.");
  const headers = rows[0].map(normalize);
  const columns = {
    cargo: indexFor(headers, ["cargo a ser preenchido", "cargo", "funcao"]),
    departamento: indexFor(headers, ["departamento", "setor"]),
    gestor: indexFor(headers, ["solicitante da vaga", "solicitante", "gestor"]),
    abertura: indexFor(headers, ["abertura da vaga", "data abertura"]),
    contratacao: indexFor(headers, ["tipos de contratacao", "tipo de contratacao"]),
    substituido: indexFor(headers, ["substituicao", "colaborador substituido"]),
    contratado: indexFor(headers, ["colaborador contratado", "colaborador"]),
    admissao: indexFor(headers, ["data admissao"]),
    demissao: indexFor(headers, ["data demissao"]),
    tipoDesligamento: indexFor(headers, ["tipo de desligamento", "tipo desligamento"]),
    motivoDesligamento: indexFor(headers, ["motivo desligamento", "motivo da demissao"]),
    fechamento: indexFor(headers, ["data de fechamento da vaga", "data fechamento"]),
    sla: indexFor(headers, ["sla"]),
    custoColaborador: indexFor(headers, ["custo colaborador", "custo mensal"]),
    custoEpi: indexFor(headers, ["custo epi", "valor epi"]),
    custoUniforme: indexFor(headers, ["custo uniforme", "valor uniforme"]),
    calca: indexFor(headers, ["tam calca", "tamanho calca"]),
    camisa: indexFor(headers, ["tam camisa", "tamanho camisa"]),
    bota: indexFor(headers, ["bota", "tamanho calcado"]),
  };
  if ([columns.cargo, columns.departamento, columns.gestor].some((index) => index < 0)) {
    throw new Error("O CSV não possui as colunas mínimas de cargo, departamento e solicitante/gestor.");
  }

  const registros: RecruitmentHistoryRecord[] = [];
  const avisos: string[] = [];
  let linhasRejeitadas = 0;
  const value = (row: string[], index: number) => index >= 0 ? row[index] ?? "" : "";

  rows.slice(1).forEach((row, offset) => {
    const line = offset + 2;
    const cargo = value(row, columns.cargo).trim();
    if (!cargo) {
      linhasRejeitadas += 1;
      avisos.push(`Linha ${line}: rejeitada porque o cargo está vazio.`);
      return;
    }
    const openingText = value(row, columns.abertura);
    const closingText = value(row, columns.fechamento);
    const admissionText = value(row, columns.admissao);
    const dismissalText = value(row, columns.demissao);
    const sla = numeric(value(row, columns.sla));
    if (openingText && !isoDate(openingText)) avisos.push(`Linha ${line}: data de abertura inválida.`);
    if (closingText && !isoDate(closingText)) avisos.push(`Linha ${line}: data de fechamento inválida.`);
    if (admissionText && !isoDate(admissionText)) avisos.push(`Linha ${line}: data de admissão inválida.`);
    if (dismissalText && !isoDate(dismissalText)) avisos.push(`Linha ${line}: data de demissão inválida.`);
    if (sla != null && sla < 0) avisos.push(`Linha ${line}: SLA negativo foi mantido como pendência e não como indicador.`);

    registros.push({
      linha_original: line,
      cargo,
      departamento: value(row, columns.departamento).trim() || "Não informado",
      gestor: value(row, columns.gestor).trim() || "Não informado",
      data_abertura: isoDate(openingText),
      tipo_contratacao: value(row, columns.contratacao).trim() || "Não informado",
      colaborador_substituido: optional(value(row, columns.substituido)),
      colaborador_contratado: optional(value(row, columns.contratado)),
      data_admissao: isoDate(admissionText),
      data_demissao: isoDate(dismissalText),
      tipo_desligamento: optional(value(row, columns.tipoDesligamento)),
      motivo_desligamento: optional(value(row, columns.motivoDesligamento)),
      data_fechamento: isoDate(closingText),
      sla_dias: sla != null && sla >= 0 ? Math.round(sla) : null,
      custo_colaborador: numeric(value(row, columns.custoColaborador)),
      custo_epi: numeric(value(row, columns.custoEpi)),
      custo_uniforme: numeric(value(row, columns.custoUniforme)),
      tamanho_calca: optional(value(row, columns.calca)),
      tamanho_camisa: optional(value(row, columns.camisa)),
      tamanho_bota: optional(value(row, columns.bota)),
    });
  });

  return { registros, avisos, linhasLidas: rows.length - 1, linhasRejeitadas };
}

export function groupCount<T>(items: T[], selector: (item: T) => string | null | undefined) {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = selector(item)?.trim();
    if (key) map.set(key, (map.get(key) ?? 0) + 1);
  });
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function groupSum<T>(items: T[], label: (item: T) => string | null | undefined, amount: (item: T) => number | null | undefined) {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = label(item)?.trim();
    const value = amount(item);
    if (key && value != null) map.set(key, (map.get(key) ?? 0) + value);
  });
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}
