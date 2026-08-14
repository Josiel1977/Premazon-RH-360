export type MovementType = "desligamento" | "aumento_quadro" | "substituicao";
export type MovementStage = "gestor" | "rh" | "dp" | "diretoria" | "conclusao";
export type MovementStatus = "em_fluxo" | "rejeitada" | "concluida" | "cancelada";

export const movementTypeLabels: Record<MovementType, string> = {
  desligamento: "Solicitação de desligamento",
  aumento_quadro: "Aumento de quadro",
  substituicao: "Substituição",
};

export const movementStageLabels: Record<MovementStage, string> = {
  gestor: "Gestor",
  rh: "RH",
  dp: "Departamento Pessoal",
  diretoria: "Diretoria",
  conclusao: "Conclusão",
};

export const movementStatusLabels: Record<MovementStatus, string> = {
  em_fluxo: "Em aprovação",
  rejeitada: "Rejeitada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export function movementDocumentCode(type: MovementType) {
  return type === "desligamento" ? "RQ.04.09" : "RQ.04.10";
}

export function nextMovementStage(stage: MovementStage): MovementStage | null {
  const stages: MovementStage[] = ["gestor", "rh", "dp", "diretoria", "conclusao"];
  const index = stages.indexOf(stage);
  return index >= 0 && index < stages.length - 1 ? stages[index + 1] : null;
}

export function canApproveMovement(profile: string, stage: MovementStage) {
  if (profile === "administrador") return ["rh", "dp", "diretoria"].includes(stage);
  return profile === stage && ["rh", "dp", "diretoria"].includes(stage);
}

export function movementProgress(stage: MovementStage, status: MovementStatus) {
  if (status === "concluida") return 100;
  if (status === "rejeitada" || status === "cancelada") return 0;
  return { gestor: 20, rh: 40, dp: 60, diretoria: 80, conclusao: 100 }[stage];
}
