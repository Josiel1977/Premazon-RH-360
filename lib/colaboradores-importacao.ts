import type { SpreadsheetCell } from "@/lib/rumo-ao-topo";
import { normalizePersonName } from "@/lib/rh360";

export type ColaboradorImportado = {
  linha_original: number;
  nome: string;
  setor: string | null;
  equipe: string | null;
  funcao: string | null;
  status: "ativo";
};

export type ColaboradoresImportResult = {
  registros: ColaboradorImportado[];
  avisos: string[];
  linhaCabecalho: number;
  linhasLidas: number;
  linhasRejeitadas: number;
  duplicadosNoArquivo: number;
};

type Field = "nome" | "setor" | "equipe" | "funcao";

const aliases: Record<string, Field> = {
  colaborador: "nome",
  nome: "nome",
  nomecolaborador: "nome",
  funcionario: "nome",
  empregado: "nome",
  setor: "setor",
  area: "setor",
  departamento: "setor",
  equipe: "equipe",
  turma: "equipe",
  funcao: "funcao",
  cargo: "funcao",
};

function text(value: SpreadsheetCell) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).replace(/\s+/g, " ").trim();
}

function header(value: SpreadsheetCell) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function validOrganizationalText(value: SpreadsheetCell) {
  const normalized = text(value);
  return normalized && /[A-Za-zÀ-ÿ]/.test(normalized) ? normalized : "";
}

export function parseColaboradoresRows(rows: SpreadsheetCell[][]): ColaboradoresImportResult {
  const headerIndex = rows.findIndex((row) => row.some((cell) => aliases[header(cell)] === "nome"));
  if (headerIndex < 0) throw new Error("Não foi encontrada uma coluna Colaborador, Nome ou Funcionário.");

  const fields = rows[headerIndex].map((cell) => aliases[header(cell)]);
  if (!fields.includes("setor") && !fields.includes("funcao")) {
    throw new Error("A planilha precisa possuir ao menos Setor/Área ou Função/Cargo além do nome.");
  }

  const registros: ColaboradorImportado[] = [];
  const avisos: string[] = [];
  const names = new Set<string>();
  let linhasRejeitadas = 0;
  let duplicadosNoArquivo = 0;

  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    if (!row.some((cell) => text(cell))) continue;

    const values: Partial<Record<Field, SpreadsheetCell>> = {};
    fields.forEach((field, index) => {
      if (field && values[field] === undefined) values[field] = row[index];
    });

    const nome = text(values.nome);
    const setor = validOrganizationalText(values.setor);
    const equipe = validOrganizationalText(values.equipe);
    const funcao = validOrganizationalText(values.funcao);
    const normalizedName = normalizePersonName(nome);
    const looksLikeSummary = /^(total|colaboradores?|empregados?)\b/.test(normalizedName);

    if (nome.length < 3 || nome.length > 180 || looksLikeSummary || (!setor && !funcao)) {
      linhasRejeitadas += 1;
      if (avisos.length < 20) avisos.push(`Linha ${rowIndex + 1}: ignorada por não representar um cadastro completo de colaborador.`);
      continue;
    }

    if (names.has(normalizedName)) {
      duplicadosNoArquivo += 1;
      if (avisos.length < 20) avisos.push(`Linha ${rowIndex + 1}: ${nome} já apareceu anteriormente no arquivo.`);
      continue;
    }

    names.add(normalizedName);
    registros.push({
      linha_original: rowIndex + 1,
      nome,
      setor: setor || null,
      equipe: equipe || null,
      funcao: funcao || null,
      status: "ativo",
    });
  }

  return {
    registros,
    avisos,
    linhaCabecalho: headerIndex + 1,
    linhasLidas: Math.max(0, rows.length - headerIndex - 1),
    linhasRejeitadas,
    duplicadosNoArquivo,
  };
}
