export const MAX_CURRICULO_BYTES = 5 * 1024 * 1024;

export const CURRICULO_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type CandidaturaPublica = {
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  linkedin: string | null;
  escolaridade: string;
  pretensao_salarial: number | null;
  experiencia: string;
  consentimento_lgpd: true;
};

export type ValidationResult =
  | { ok: true; data: CandidaturaPublica }
  | { ok: false; error: string };

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function limit(value: string, maximum: number) {
  return value.slice(0, maximum);
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function validarCandidatura(formData: FormData): ValidationResult {
  const nome = limit(textValue(formData, "nome"), 160);
  const email = limit(textValue(formData, "email").toLowerCase(), 254);
  const telefone = limit(textValue(formData, "telefone"), 30);
  const cidade = limit(textValue(formData, "cidade"), 100);
  const estado = limit(textValue(formData, "estado").toUpperCase(), 2);
  const linkedin = limit(textValue(formData, "linkedin"), 300);
  const escolaridade = limit(textValue(formData, "escolaridade"), 120);
  const experiencia = limit(textValue(formData, "experiencia"), 4000);
  const pretensaoTexto = textValue(formData, "pretensao_salarial")
    .replace(/\s/g, "")
    .replace(".", "")
    .replace(",", ".");
  const consentimento = textValue(formData, "consentimento_lgpd");

  if (textValue(formData, "website")) {
    return { ok: false, error: "Não foi possível enviar a candidatura." };
  }
  if (nome.length < 3) return { ok: false, error: "Informe seu nome completo." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Informe um e-mail válido." };
  }
  const phoneDigits = telefone.replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return { ok: false, error: "Informe um telefone ou WhatsApp válido." };
  }
  if (cidade.length < 2 || !/^[A-Z]{2}$/.test(estado)) {
    return { ok: false, error: "Informe sua cidade e a UF com duas letras." };
  }
  if (!escolaridade) return { ok: false, error: "Informe sua escolaridade." };
  if (experiencia.length < 20) {
    return { ok: false, error: "Conte brevemente sua experiência profissional." };
  }
  if (linkedin && !/^https?:\/\//i.test(linkedin)) {
    return { ok: false, error: "O LinkedIn deve começar com http:// ou https://." };
  }
  if (consentimento !== "true") {
    return { ok: false, error: "É necessário aceitar o aviso de privacidade para se candidatar." };
  }

  let pretensaoSalarial: number | null = null;
  if (pretensaoTexto) {
    pretensaoSalarial = Number(pretensaoTexto);
    if (!Number.isFinite(pretensaoSalarial) || pretensaoSalarial < 0 || pretensaoSalarial > 1_000_000) {
      return { ok: false, error: "Informe uma pretensão salarial válida." };
    }
  }

  return {
    ok: true,
    data: {
      nome,
      email,
      telefone,
      cidade,
      estado,
      linkedin: linkedin || null,
      escolaridade,
      pretensao_salarial: pretensaoSalarial,
      experiencia,
      consentimento_lgpd: true,
    },
  };
}

export function validarCurriculo(file: File) {
  if (!file.name || file.size === 0) return "Anexe seu currículo.";
  if (file.size > MAX_CURRICULO_BYTES) return "O currículo deve ter no máximo 5 MB.";

  const extension = file.name.toLowerCase().split(".").pop();
  if (!extension || !["pdf", "doc", "docx"].includes(extension)) {
    return "Envie o currículo em PDF, DOC ou DOCX.";
  }
  if (file.type && !CURRICULO_MIME_TYPES.includes(file.type as (typeof CURRICULO_MIME_TYPES)[number])) {
    return "O formato do currículo não é permitido.";
  }
  return null;
}

export async function assinaturaCurriculoValida(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const extension = file.name.toLowerCase().split(".").pop();
  const pdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const ole = bytes.length >= 8 && [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((value, index) => bytes[index] === value);

  return (extension === "pdf" && pdf) || (extension === "docx" && zip) || (extension === "doc" && ole);
}

export function nomeSeguroArquivo(fileName: string) {
  const cleaned = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(-120);
  return cleaned || "curriculo.pdf";
}

export function linkPublicoCandidatura(origin: string, token: string) {
  return new URL(`/candidatura/${token}`, origin).toString();
}

export function textoCompartilhamento(cargo: string, link: string) {
  return `Olá! A Premazon está com uma oportunidade para ${cargo}. Conheça a vaga e envie seu currículo por este link seguro: ${link}`;
}
