import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { scriptTema } from "@/components/layout/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MonitoraDeputado", template: "%s · MonitoraDeputado" },
  description: "Quanto custam, o que entregam e como votam os deputados federais — dados públicos atualizados diariamente.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
