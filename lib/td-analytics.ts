export function performanceBand(score: number) {
  if (score >= 9) return "Excelente";
  if (score >= 7.5) return "Muito bom";
  if (score >= 6) return "Bom";
  if (score >= 4.5) return "Atenção";
  return "Crítico";
}

export function nineBoxPosition(performance: number, potential: number) {
  const performanceLevel = performance >= 8 ? 2 : performance >= 6 ? 1 : 0;
  const potentialLevel = potential >= 8 ? 2 : potential >= 6 ? 1 : 0;
  const labels = [
    ["Risco", "Eficaz", "Especialista"],
    ["Questionável", "Mantenedor", "Alta Performance"],
    ["Enigma", "Forte Desempenho", "Estrela"],
  ];
  return labels[potentialLevel][performanceLevel];
}

export function estimatedPotential(competencies: Record<string, { nota?: number }>) {
  const keys = ["desenvolvimento_continuo", "lideranca", "resiliencia", "influencia", "responsabilidade"];
  const values = keys.map((key) => Number(competencies[key]?.nota)).filter(Number.isFinite);
  if (!values.length) return null;
  return Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(2));
}
