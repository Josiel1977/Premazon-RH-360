import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Autopercepção Comportamental | Premazon RH 360",
  description: "Questionário individual de autopercepção para desenvolvimento profissional.",
  robots: { index: false, follow: false },
};

export default function ProfileQuestionnaireLayout({ children }: { children: React.ReactNode }) {
  return children;
}
