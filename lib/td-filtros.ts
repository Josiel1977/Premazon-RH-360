export type TdCollaboratorFilterRecord = {
  id: string;
  nome: string;
  matricula?: string | null;
  email?: string | null;
  setor_nome?: string | null;
  cargo_nome?: string | null;
};

export function normalizeTdFilter(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function matchesTdSector(value: string | null | undefined, selectedSector: string) {
  return selectedSector === "todos" || normalizeTdFilter(value) === normalizeTdFilter(selectedSector);
}

export function buildTdSectorOptions({
  collaborators,
  signalSectors,
  needSectors,
  required = ["RH"],
}: {
  collaborators: TdCollaboratorFilterRecord[];
  signalSectors: Array<string | null | undefined>;
  needSectors: Array<string | null | undefined>;
  required?: string[];
}) {
  const labels = new Map<string, string>();
  [...required, ...collaborators.map((item) => item.setor_nome), ...signalSectors, ...needSectors]
    .forEach((value) => {
      const label = value?.replace(/\s+/g, " ").trim();
      const key = normalizeTdFilter(label);
      if (label && key && !labels.has(key)) labels.set(key, label);
    });

  return [...labels.values()].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

export function filterTdCollaborators(
  collaborators: TdCollaboratorFilterRecord[],
  selectedSector: string,
  search: string,
) {
  const term = normalizeTdFilter(search);
  return collaborators.filter((item) => {
    if (!matchesTdSector(item.setor_nome, selectedSector)) return false;
    if (!term) return true;
    return [item.nome, item.matricula, item.email, item.cargo_nome]
      .some((value) => normalizeTdFilter(value).includes(term));
  });
}
