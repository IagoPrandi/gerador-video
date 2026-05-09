import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prompt2Video Studio",
  description: "Gere vídeos com prompt e materiais de referência usando OpenRouter.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
