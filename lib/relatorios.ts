export type ChartItem = { name: string; value: number };

export type DashboardSnapshot = {
  versao: number;
  gerado_em: string;
  privacidade: { dados_pessoais: false; somente_agregados: true };
  indicadores: {
    colaboradores_ativos: number;
    vagas_abertas: number;
    candidaturas_ativas: number;
    carga_horaria_plano: number;
    pdis_ativos: number;
    pendencias_ativas: number;
    pendencias_vencidas: number;
  };
  colaboradores_por_setor: ChartItem[];
  treinamentos_por_status: ChartItem[];
  pdis_por_status: ChartItem[];
  candidaturas_por_etapa: ChartItem[];
  pendencias_por_prioridade: ChartItem[];
};

export type CsvValue = string | number | boolean | null | undefined;

function safeCsvValue(value: CsvValue) {
  if (value == null) return "";
  const text = String(value);
  const protectedText = /^[=+@-]/.test(text.trimStart()) ? `'${text}` : text;
  return `"${protectedText.replaceAll('"', '""')}"`;
}

export function createCsvText(headers: string[], rows: CsvValue[][]) {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(safeCsvValue).join(";")).join("\r\n")}`;
}

export function downloadCsv(filename: string, headers: string[], rows: CsvValue[][]) {
  const blob = new Blob([createCsvText(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.toLowerCase().endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function publicReportUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/relatorio/${token}`;
}

export function formatBytes(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}
