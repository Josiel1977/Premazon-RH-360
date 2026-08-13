export type DiscDimension = "D" | "I" | "S" | "C";

export type DiscOption = {
  id: string;
  text: string;
  dimension: DiscDimension;
};

export type DiscQuestion = {
  id: string;
  text: string;
  options: DiscOption[];
};

export type DiscPublicQuestion = {
  id: string;
  text: string;
  options: { id: string; text: string }[];
};

export type DiscScore = {
  counts: Record<DiscDimension, number>;
  percentages: Record<DiscDimension, number>;
  dominantDimensions: DiscDimension[];
  secondaryDimension: DiscDimension | null;
  combined: boolean;
  label: string;
};

export type DiscValidationResult =
  | { ok: true; score: DiscScore; answers: Record<string, string> }
  | { ok: false; error: string };

export const DISC_INSTRUMENT_VERSION = "rh-disc-24-v1.0";
export const DISC_ALGORITHM_VERSION = "contagem-normalizada-v1";
export const DISC_PRIVACY_NOTICE_VERSION = "perfil-desenvolvimento-v1";

export const DISC_PROFILES: Record<DiscDimension, {
  name: string;
  description: string;
  strengths: string[];
  attention: string[];
  developmentThemes: string[];
}> = {
  D: {
    name: "D — Dominância",
    description: "Preferência por desafios, autonomia, decisões objetivas e foco em resultados.",
    strengths: ["Determinação", "Iniciativa", "Foco em resultados", "Tomada de decisão", "Autonomia"],
    attention: ["Impaciência", "Comunicação excessivamente direta", "Pressa na tomada de decisão"],
    developmentThemes: ["Liderança", "Comunicação assertiva", "Inteligência emocional", "Gestão de conflitos"],
  },
  I: {
    name: "I — Influência",
    description: "Preferência por comunicação, interação, persuasão e mobilização de pessoas.",
    strengths: ["Comunicação", "Relacionamento", "Persuasão", "Entusiasmo", "Motivação"],
    attention: ["Dispersão", "Impulsividade", "Organização", "Atenção aos detalhes"],
    developmentThemes: ["Comunicação", "Gestão do tempo", "Planejamento", "Inteligência emocional"],
  },
  S: {
    name: "S — Estabilidade",
    description: "Preferência por cooperação, constância, escuta e relações de trabalho harmoniosas.",
    strengths: ["Cooperação", "Escuta", "Lealdade", "Paciência", "Trabalho em equipe"],
    attention: ["Resistência a mudanças", "Dificuldade para dizer não", "Evitação de conflitos"],
    developmentThemes: ["Gestão da mudança", "Assertividade", "Liderança", "Tomada de decisão"],
  },
  C: {
    name: "C — Conformidade",
    description: "Preferência por análise, organização, critérios claros, precisão e qualidade.",
    strengths: ["Organização", "Precisão", "Planejamento", "Análise", "Atenção aos detalhes"],
    attention: ["Perfeccionismo", "Excesso de análise", "Rigidez", "Dificuldade com mudanças rápidas"],
    developmentThemes: ["Flexibilidade", "Gestão da mudança", "Comunicação", "Tomada de decisão"],
  },
};

function options(id: string, values: [string, DiscDimension][]): DiscOption[] {
  return values.map(([text, dimension], index) => ({ id: `${id}-${index + 1}`, text, dimension }));
}

export const DISC_QUESTIONS: DiscQuestion[] = [
  { id: "q01", text: "Quando recebo uma tarefa desafiadora, normalmente:", options: options("q01", [["Assumo o desafio e procuro resolver rapidamente.", "D"], ["Converso com as pessoas e busco ideias.", "I"], ["Procuro entender como a tarefa afetará a equipe.", "S"], ["Analiso cuidadosamente as informações antes de começar.", "C"]]) },
  { id: "q02", text: "Em uma reunião de trabalho, eu normalmente:", options: options("q02", [["Vou direto ao ponto e apresento minha opinião.", "D"], ["Participo bastante e estimulo a participação.", "I"], ["Escuto primeiro e procuro manter o equilíbrio.", "S"], ["Faço perguntas para esclarecer os detalhes.", "C"]]) },
  { id: "q03", text: "Quando surge um problema inesperado:", options: options("q03", [["Tomo uma decisão rapidamente.", "D"], ["Procuro conversar para encontrar uma solução.", "I"], ["Mantenho a calma e analiso a situação.", "S"], ["Investigo a causa antes de decidir.", "C"]]) },
  { id: "q04", text: "No trabalho, costumo ser reconhecido por:", options: options("q04", [["Determinação e iniciativa.", "D"], ["Comunicação e entusiasmo.", "I"], ["Paciência e cooperação.", "S"], ["Organização e atenção aos detalhes.", "C"]]) },
  { id: "q05", text: "Quando preciso convencer alguém:", options: options("q05", [["Apresento argumentos objetivos e foco no resultado.", "D"], ["Procuro criar conexão e entusiasmo.", "I"], ["Escuto a pessoa e busco chegar a um acordo.", "S"], ["Apresento fatos, dados e informações.", "C"]]) },
  { id: "q06", text: "Quando recebo uma crítica:", options: options("q06", [["Procuro entender rapidamente o que precisa ser corrigido.", "D"], ["Converso sobre o assunto.", "I"], ["Reflito antes de responder.", "S"], ["Analiso se a crítica está fundamentada.", "C"]]) },
  { id: "q07", text: "Em uma equipe, geralmente assumo o papel de:", options: options("q07", [["Pessoa que toma iniciativa e conduz.", "D"], ["Pessoa que motiva os colegas.", "I"], ["Pessoa que apoia a equipe.", "S"], ["Pessoa que organiza e verifica detalhes.", "C"]]) },
  { id: "q08", text: "Quando preciso tomar uma decisão importante:", options: options("q08", [["Decido e sigo em frente.", "D"], ["Converso com outras pessoas.", "I"], ["Avalio os impactos para todos.", "S"], ["Analiso informações e riscos.", "C"]]) },
  { id: "q09", text: "Em relação às mudanças:", options: options("q09", [["Gosto de mudanças que tragam resultados.", "D"], ["Gosto de novidades.", "I"], ["Prefiro mudanças planejadas.", "S"], ["Preciso entender os impactos.", "C"]]) },
  { id: "q10", text: "Quando tenho uma meta:", options: options("q10", [["Faço o possível para alcançar o resultado.", "D"], ["Busco pessoas para ajudar e manter a motivação.", "I"], ["Organizo meu ritmo para manter constância.", "S"], ["Planejo cuidadosamente cada etapa.", "C"]]) },
  { id: "q11", text: "Quando trabalho sob pressão:", options: options("q11", [["Aumento o ritmo e foco na solução.", "D"], ["Procuro manter o ambiente positivo.", "I"], ["Tento manter a calma.", "S"], ["Organizo as prioridades para evitar erros.", "C"]]) },
  { id: "q12", text: "Quando começo a trabalhar com uma pessoa nova:", options: options("q12", [["Quero saber rapidamente o que precisamos entregar.", "D"], ["Procuro conversar e criar proximidade.", "I"], ["Procuro conhecer a pessoa aos poucos.", "S"], ["Quero entender suas responsabilidades.", "C"]]) },
  { id: "q13", text: "Meu ambiente de trabalho ideal é:", options: options("q13", [["Dinâmico e orientado para resultados.", "D"], ["Alegre, participativo e interativo.", "I"], ["Tranquilo e colaborativo.", "S"], ["Estruturado e com regras claras.", "C"]]) },
  { id: "q14", text: "Quando alguém demora para tomar uma decisão:", options: options("q14", [["Incentivo a pessoa a decidir logo.", "D"], ["Converso para ajudá-la.", "I"], ["Dou tempo para que se sinta segura.", "S"], ["Forneço informações para ajudar.", "C"]]) },
  { id: "q15", text: "Quando recebo uma nova responsabilidade:", options: options("q15", [["Aceito e assumo o controle.", "D"], ["Fico animado com a oportunidade.", "I"], ["Procuro entender como contribuir.", "S"], ["Quero conhecer os procedimentos.", "C"]]) },
  { id: "q16", text: "Quando ocorre um conflito:", options: options("q16", [["Enfrento diretamente o problema.", "D"], ["Procuro conversar.", "I"], ["Busco preservar o relacionamento.", "S"], ["Analiso os fatos.", "C"]]) },
  { id: "q17", text: "Quando preciso aprender algo novo:", options: options("q17", [["Aprendo fazendo.", "D"], ["Gosto de conversar e trocar experiências.", "I"], ["Prefiro aprender com acompanhamento.", "S"], ["Gosto de estudar instruções.", "C"]]) },
  { id: "q18", text: "Quando estou trabalhando em um projeto:", options: options("q18", [["Foco no resultado final.", "D"], ["Foco no envolvimento das pessoas.", "I"], ["Foco na cooperação.", "S"], ["Foco na qualidade.", "C"]]) },
  { id: "q19", text: "Quando alguém apresenta uma ideia nova:", options: options("q19", [["Quero saber se ela gera resultado.", "D"], ["Fico interessado e exploro a ideia.", "I"], ["Penso no impacto para as pessoas.", "S"], ["Avalio riscos e detalhes.", "C"]]) },
  { id: "q20", text: "Quando preciso organizar meu trabalho:", options: options("q20", [["Defino prioridades.", "D"], ["Organizo conforme as oportunidades.", "I"], ["Estabeleço uma rotina.", "S"], ["Crio listas e controles.", "C"]]) },
  { id: "q21", text: "Quando alguém precisa de ajuda:", options: options("q21", [["Procuro resolver rapidamente.", "D"], ["Converso e procuro motivar.", "I"], ["Ofereço apoio.", "S"], ["Procuro entender exatamente o problema.", "C"]]) },
  { id: "q22", text: "Uma característica importante no trabalho é:", options: options("q22", [["Resultado.", "D"], ["Relacionamento.", "I"], ["Harmonia.", "S"], ["Qualidade.", "C"]]) },
  { id: "q23", text: "Quando tenho pouco tempo para concluir uma tarefa:", options: options("q23", [["Acelero e foco na entrega.", "D"], ["Busco apoio das pessoas.", "I"], ["Mantenho a tranquilidade.", "S"], ["Defino prioridades para evitar erros.", "C"]]) },
  { id: "q24", text: "Se pudesse escolher uma característica profissional:", options: options("q24", [["Determinado.", "D"], ["Comunicativo.", "I"], ["Colaborativo.", "S"], ["Analítico.", "C"]]) },
];

const dimensions: DiscDimension[] = ["D", "I", "S", "C"];

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function publicDiscQuestions(seed: string): DiscPublicQuestion[] {
  return DISC_QUESTIONS.map((question) => ({
    id: question.id,
    text: question.text,
    options: [...question.options]
      .sort((a, b) => stableHash(`${seed}:${question.id}:${a.id}`) - stableHash(`${seed}:${question.id}:${b.id}`))
      .map(({ id, text }) => ({ id, text })),
  }));
}

function normalizedPercentages(counts: Record<DiscDimension, number>, total: number) {
  const exact = dimensions.map((dimension) => ({ dimension, value: (counts[dimension] / total) * 100 }));
  const result = Object.fromEntries(exact.map((item) => [item.dimension, Math.floor(item.value)])) as Record<DiscDimension, number>;
  let remaining = 100 - Object.values(result).reduce((sum, value) => sum + value, 0);
  exact.sort((a, b) => (b.value - Math.floor(b.value)) - (a.value - Math.floor(a.value)));
  for (let index = 0; remaining > 0; index = (index + 1) % exact.length) {
    result[exact[index].dimension] += 1;
    remaining -= 1;
  }
  return result;
}

export function scoreDiscAnswers(input: unknown): DiscValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "As respostas não foram recebidas corretamente." };
  }
  const raw = input as Record<string, unknown>;
  const questionIds = new Set(DISC_QUESTIONS.map((question) => question.id));
  if (Object.keys(raw).some((key) => !questionIds.has(key))) {
    return { ok: false, error: "O formulário contém uma pergunta desconhecida." };
  }

  const answers: Record<string, string> = {};
  const counts: Record<DiscDimension, number> = { D: 0, I: 0, S: 0, C: 0 };
  for (const question of DISC_QUESTIONS) {
    const answer = raw[question.id];
    if (typeof answer !== "string") return { ok: false, error: "Responda todas as 24 perguntas." };
    const selected = question.options.find((option) => option.id === answer);
    if (!selected) return { ok: false, error: "Uma das respostas não pertence a este questionário." };
    answers[question.id] = selected.id;
    counts[selected.dimension] += 1;
  }

  const ordered = [...dimensions].sort((a, b) => counts[b] - counts[a]);
  const topScore = counts[ordered[0]];
  const exactTies = ordered.filter((dimension) => counts[dimension] === topScore);
  const closePair = exactTies.length === 1 && topScore - counts[ordered[1]] <= 2;
  const dominantDimensions = exactTies.length > 1 ? exactTies : closePair ? ordered.slice(0, 2) : [ordered[0]];
  const secondaryDimension = ordered.find((dimension) => !dominantDimensions.includes(dimension)) ?? null;
  const combined = dominantDimensions.length > 1;
  const label = dominantDimensions.length === 4
    ? "Perfil equilibrado D/I/S/C"
    : dominantDimensions.map((dimension) => DISC_PROFILES[dimension].name).join(" + ");

  return {
    ok: true,
    answers,
    score: {
      counts,
      percentages: normalizedPercentages(counts, DISC_QUESTIONS.length),
      dominantDimensions,
      secondaryDimension,
      combined,
      label,
    },
  };
}

export function resultGuidance(score: DiscScore) {
  const profiles = score.dominantDimensions.map((dimension) => DISC_PROFILES[dimension]);
  const unique = (items: string[]) => [...new Set(items)];
  return {
    descriptions: profiles.map((profile) => profile.description),
    strengths: unique(profiles.flatMap((profile) => profile.strengths)),
    attention: unique(profiles.flatMap((profile) => profile.attention)),
    developmentThemes: unique(profiles.flatMap((profile) => profile.developmentThemes)),
  };
}
