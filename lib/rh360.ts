export type PendingPriority = "baixa" | "media" | "alta" | "critica";
export type PendingStatus = "aberta" | "em_andamento" | "aguardando" | "concluida" | "cancelada";

export function normalizePersonName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isPendingOverdue(deadline: string | null, status: PendingStatus, today = new Date()) {
  if (!deadline || status === "concluida" || status === "cancelada") return false;
  const endOfDeadline = new Date(`${deadline}T23:59:59`);
  return endOfDeadline.getTime() < today.getTime();
}

export function pendingUrgency(priority: PendingPriority, deadline: string | null, status: PendingStatus, today = new Date()) {
  if (isPendingOverdue(deadline, status, today)) return 5;
  return { critica: 4, alta: 3, media: 2, baixa: 1 }[priority];
}

export function groupByLabel<T>(items: T[], selector: (item: T) => string | null | undefined) {
  const grouped = new Map<string, number>();
  items.forEach((item) => {
    const label = selector(item)?.trim() || "Não informado";
    grouped.set(label, (grouped.get(label) ?? 0) + 1);
  });
  return [...grouped.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}
