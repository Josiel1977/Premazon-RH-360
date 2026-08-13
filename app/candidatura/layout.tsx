import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Candidatura | Premazon RH 360",
  description: "Formulário seguro de candidatura a uma oportunidade da Premazon.",
  robots: { index: false, follow: false },
};

export default function CandidaturaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
