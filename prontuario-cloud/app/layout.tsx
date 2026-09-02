import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prontuário Cloud — Dr. Reginaldo Chiarini",
  description: "Prontuário médico pessoal — Medicina de Família e Comunidade",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
