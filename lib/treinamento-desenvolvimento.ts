import type { SpreadsheetCell } from "@/lib/rumo-ao-topo";

export type TdImportType = "lnt" | "avaliacao_desempenho";

export type TdLntRecord = {
  linha_original: number;
  resposta_em: string | null;
  gestor_importado: string;
  setor_importado: string;
  colaborador_nome_importado: string;
  cargo_importado: string;
  necessidades_tecnicas: string[];
  temas_comportamentais: string[];
  outro_detalhe: string | null;
  treinamento_sugerido: string | null;
};

export type TdCompetencyScore = {
  nota: number;
  evidencia: string | null;
  pergunta: string;
};

export type TdPerformanceRecord = {
  linha_original: number;
  avaliacao_em: string | null;
  colaborador_nome_importado: string;
  setor_importado: string;
  cargo_importado: string;
  gestor_importado: string;
  competencias: Record<string, TdCompetencyScore>;
  media_geral: number;
  competencias_avaliadas: number;
  pontos_fortes: string | null;
  pontos_desenvolver: string | null;
};

export type TdParseResult<T> = {
  registros: T[];
  avisos: string[];
  linhasLidas: number;
  linhasRejeitadas: number;
  linhaCabecalho: number;
};

export const TD_COMPETENCIES = [
  { key: "comunicacao", label: "Comunicação", match: "expressa suas ideias" },
  { key: "assertividade_seguranca", label: "Assertividade e segurança", match: "seguranca em suas decisoes" },
  { key: "influencia", label: "Influência", match: "influenciar positivamente" },
  { key: "lideranca", label: "Liderança", match: "inspira orienta e motiva" },
  { key: "comprometimento", label: "Comprometimento", match: "cumpre prazos assume responsabilidades" },
  { key: "responsabilidade", label: "Responsabilidade", match: "autoria de suas acoes" },
  { key: "pontualidade", label: "Pontualidade", match: "horarios e prazos" },
  { key: "organizacao", label: "Organização", match: "planeja e executa" },
  { key: "agilidade_qualidade", label: "Agilidade e qualidade", match: "agilidade e precisao" },
  { key: "disciplina", label: "Disciplina", match: "politicas regras e procedimentos" },
  { key: "equilibrio_emocional", label: "Equilíbrio emocional", match: "equilibrio emocional" },
  { key: "desenvolvimento_continuo", label: "Desenvolvimento contínuo", match: "vontade constante de evoluir" },
  { key: "resiliencia", label: "Resiliência", match: "persiste diante dos obstaculos" },
  { key: "etica", label: "Ética", match: "integridade honestidade e respeito" },
  { key: "trabalho_equipe", label: "Trabalho em equipe", match: "colabora com os colegas" },
] as const;

function cellText(value: SpreadsheetCell) {
  if (value == null) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

export function normalizeTdText(value: SpreadsheetCell) {
  return cellText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findHeaderRow(rows: SpreadsheetCell[][], requiredTerms: string[]) {
  return rows.slice(0, 20).findIndex((row) => {
    const joined = normalizeTdText(row.map(cellText).join(" | "));
    return requiredTerms.every((term) => joined.includes(term));
  });
}

function findColumn(headers: SpreadsheetCell[], terms: string[], excluded: string[] = []) {
  return headers.findIndex((header) => {
    const normalized = normalizeTdText(header);
    return terms.every((term) => normalized.includes(term)) && excluded.every((term) => !normalized.includes(term));
  });
}

function splitList(value: SpreadsheetCell) {
  return cellText(value)
    .split(/;|\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function meaningfulText(value: SpreadsheetCell) {
  const text = cellText(value);
  const normalized = normalizeTdText(text);
  if (!normalized || ["nao", "n a", "nao se aplica", "nao tem", "nenhum", "sem indicacoes"].includes(normalized)) {
    return null;
  }
  return text;
}

function excelDate(value: SpreadsheetCell) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (typeof value === "number" && value > 25_000 && value < 80_000) {
    const milliseconds = Math.round((value - 25_569) * 86_400_000);
    return new Date(milliseconds).toISOString();
  }
  const text = cellText(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

export function scoreTdRating(value: SpreadsheetCell) {
  const normalized = normalizeTdText(value);
  if (!normalized) return null;
  if (normalized === "sempre") return 10;
  if (normalized === "frequentemente") return 8;
  if (normalized === "as vezes") return 6;
  if (normalized === "raramente") return 4;
  if (normalized === "nunca") return 2;

  const numeric = Number(cellText(value).replace(",", "."));
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 10 ? numeric : null;
}

export function parseLntRows(rows: SpreadsheetCell[][]): TdParseResult<TdLntRecord> {
  const headerIndex = findHeaderRow(rows, ["gestor", "colaborador", "competencias tecnicas"]);
  if (headerIndex < 0) throw new Error("Não foi encontrado o cabeçalho da planilha de LNT.");

  const headers = rows[headerIndex];
  const columns = {
    timestamp: findColumn(headers, ["carimbo", "data"]),
    gestor: findColumn(headers, ["gestor"]),
    setor: findColumn(headers, ["setor"]),
    colaborador: findColumn(headers, ["colaborador"]),
    cargo: findColumn(headers, ["cargo"]),
    tecnicas: findColumn(headers, ["competencias", "tecnicas"]),
    comportamentais: findColumn(headers, ["temas", "comportamentais"]),
    outro: findColumn(headers, ["outro", "descreva"]),
    treinamento: findColumn(headers, ["treinamento", "especifico"]),
  };

  const required = [columns.gestor, columns.setor, columns.colaborador, columns.cargo, columns.tecnicas];
  if (required.some((column) => column < 0)) {
    throw new Error("A planilha de LNT não possui todas as colunas obrigatórias.");
  }

  const registros: TdLntRecord[] = [];
  const avisos: string[] = [];
  let linhasRejeitadas = 0;

  rows.slice(headerIndex + 1).forEach((row, offset) => {
    const line = headerIndex + offset + 2;
    if (!row.some((cell) => cellText(cell))) return;
    const collaborator = cellText(row[columns.colaborador]);
    if (!collaborator) {
      linhasRejeitadas += 1;
      avisos.push(`Linha ${line}: ignorada porque o colaborador está vazio.`);
      return;
    }

    const technicalNeeds = splitList(row[columns.tecnicas]);
    const behavioralTopics = columns.comportamentais >= 0 ? splitList(row[columns.comportamentais]) : [];
    if (technicalNeeds.length === 0 && behavioralTopics.length === 0) {
      avisos.push(`Linha ${line}: colaborador sem necessidade técnica ou comportamental informada.`);
    }

    registros.push({
      linha_original: line,
      resposta_em: columns.timestamp >= 0 ? excelDate(row[columns.timestamp]) : null,
      gestor_importado: cellText(row[columns.gestor]) || "Não informado",
      setor_importado: cellText(row[columns.setor]) || "Não informado",
      colaborador_nome_importado: collaborator,
      cargo_importado: cellText(row[columns.cargo]) || "Não informado",
      necessidades_tecnicas: technicalNeeds,
      temas_comportamentais: behavioralTopics,
      outro_detalhe: columns.outro >= 0 ? meaningfulText(row[columns.outro]) : null,
      treinamento_sugerido: columns.treinamento >= 0 ? meaningfulText(row[columns.treinamento]) : null,
    });
  });

  return {
    registros,
    avisos,
    linhasLidas: rows.slice(headerIndex + 1).filter((row) => row.some((cell) => cellText(cell))).length,
    linhasRejeitadas,
    linhaCabecalho: headerIndex + 1,
  };
}

export function parsePerformanceRows(rows: SpreadsheetCell[][]): TdParseResult<TdPerformanceRecord> {
  const headerIndex = findHeaderRow(rows, ["colaborador", "gestor", "pontos fortes"]);
  if (headerIndex < 0) throw new Error("Não foi encontrado o cabeçalho da avaliação de desempenho.");

  const headers = rows[headerIndex];
  const baseColumns = {
    colaborador: findColumn(headers, ["colaborador"]),
    setor: findColumn(headers, ["setor"]),
    cargo: findColumn(headers, ["cargo"]),
    gestor: findColumn(headers, ["gestor"]),
    data: findColumn(headers, ["data"]),
    fortes: findColumn(headers, ["pontos", "fortes"]),
    desenvolver: findColumn(headers, ["pontos", "desenvolver"]),
  };
  if ([baseColumns.colaborador, baseColumns.setor, baseColumns.cargo, baseColumns.gestor].some((column) => column < 0)) {
    throw new Error("A avaliação não possui as colunas de identificação esperadas.");
  }

  const competencyColumns = TD_COMPETENCIES.map((competency) => ({
    ...competency,
    scoreColumn: findColumn(headers, competency.match.split(" "), ["comentarios", "evidencias"]),
  }));
  const missing = competencyColumns.filter((item) => item.scoreColumn < 0);
  if (missing.length) {
    throw new Error(`Não foi possível reconhecer ${missing.length} competência(s): ${missing.map((item) => item.label).join(", ")}.`);
  }

  const registros: TdPerformanceRecord[] = [];
  const avisos: string[] = [];
  let linhasRejeitadas = 0;

  rows.slice(headerIndex + 1).forEach((row, offset) => {
    const line = headerIndex + offset + 2;
    if (!row.some((cell) => cellText(cell))) return;
    const collaborator = cellText(row[baseColumns.colaborador]);
    if (!collaborator) {
      linhasRejeitadas += 1;
      avisos.push(`Linha ${line}: ignorada porque o colaborador está vazio.`);
      return;
    }

    const competencias: Record<string, TdCompetencyScore> = {};
    competencyColumns.forEach((competency) => {
      const score = scoreTdRating(row[competency.scoreColumn]);
      if (score == null) return;
      const evidenceColumn = competency.scoreColumn + 1;
      const evidenceHeader = normalizeTdText(headers[evidenceColumn]);
      competencias[competency.key] = {
        nota: score,
        evidencia: evidenceHeader.includes("comentarios") || evidenceHeader.includes("evidencias")
          ? cellText(row[evidenceColumn]) || null
          : null,
        pergunta: cellText(headers[competency.scoreColumn]),
      };
    });

    const scores = Object.values(competencias).map((item) => item.nota);
    if (scores.length === 0) {
      linhasRejeitadas += 1;
      avisos.push(`Linha ${line}: avaliação sem notas reconhecíveis; enviada para revisão e não importada.`);
      return;
    }
    if (scores.length < TD_COMPETENCIES.length) {
      avisos.push(`Linha ${line}: possui ${scores.length} de ${TD_COMPETENCIES.length} competências avaliadas.`);
    }

    registros.push({
      linha_original: line,
      avaliacao_em: baseColumns.data >= 0 ? excelDate(row[baseColumns.data]) : null,
      colaborador_nome_importado: collaborator,
      setor_importado: cellText(row[baseColumns.setor]) || "Não informado",
      cargo_importado: cellText(row[baseColumns.cargo]) || "Não informado",
      gestor_importado: cellText(row[baseColumns.gestor]) || "Não informado",
      competencias,
      media_geral: Number((scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(2)),
      competencias_avaliadas: scores.length,
      pontos_fortes: baseColumns.fortes >= 0 ? cellText(row[baseColumns.fortes]) || null : null,
      pontos_desenvolver: baseColumns.desenvolver >= 0 ? cellText(row[baseColumns.desenvolver]) || null : null,
    });
  });

  return {
    registros,
    avisos,
    linhasLidas: rows.slice(headerIndex + 1).filter((row) => row.some((cell) => cellText(cell))).length,
    linhasRejeitadas,
    linhaCabecalho: headerIndex + 1,
  };
}

export function summarizeLnt(records: TdLntRecord[]) {
  const sectors = new Set(records.map((record) => normalizeTdText(record.setor_importado)).filter(Boolean));
  const people = new Set(records.map((record) => normalizeTdText(record.colaborador_nome_importado)).filter(Boolean));
  return {
    registros: records.length,
    colaboradores: people.size,
    setores: sectors.size,
    necessidadesTecnicas: records.reduce((total, record) => total + record.necessidades_tecnicas.length, 0),
    necessidadesComportamentais: records.reduce((total, record) => total + record.temas_comportamentais.length, 0),
    cursosSugeridos: records.filter((record) => record.treinamento_sugerido).length,
  };
}

export function summarizePerformance(records: TdPerformanceRecord[]) {
  const allScores = records.flatMap((record) => Object.entries(record.competencias).map(([key, value]) => ({ key, score: value.nota })));
  const gaps = allScores.filter((item) => item.score < 7);
  return {
    registros: records.length,
    media: records.length
      ? Number((records.reduce((total, record) => total + record.media_geral, 0) / records.length).toFixed(2))
      : 0,
    gaps: gaps.length,
    competenciasAvaliadas: allScores.length,
  };
}
