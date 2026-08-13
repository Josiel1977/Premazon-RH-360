export type OnboardingContentType = "texto" | "documento" | "link" | "curso";

export function onboardingSlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export function validateOnboardingVersion(input: {
  type: OnboardingContentType; text?: string; link?: string; documentPath?: string; courseId?: string;
}) {
  if (input.type === "texto" && !input.text?.trim()) return "Informe o texto que será apresentado.";
  if (input.type === "documento" && !input.documentPath) return "Selecione o documento controlado.";
  if (input.type === "link" && !input.link?.startsWith("https://")) return "Use um endereço seguro iniciado por https://.";
  if (input.type === "curso" && !input.courseId) return "Vincule um curso da Universidade Corporativa.";
  return null;
}

export function onboardingProgress(statuses: string[]) {
  if (!statuses.length) return 0;
  return Math.round(statuses.filter((status) => ["concluida", "dispensada"].includes(status)).length / statuses.length * 100);
}
