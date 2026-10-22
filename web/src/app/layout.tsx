import type { Metadata } from "next";
import "@fontsource/anton/400.css";
import "@fontsource-variable/inter";
import { Footer } from "@/components/layout/Footer";
import { Sidebar } from "@/components/layout/Sidebar";
import { scriptTema } from "@/components/layout/ThemeToggle";
import { getMeta } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MonitoraDeputado", template: "%s · MonitoraDeputado" },
  description: "Quanto custam, o que entregam e como votam os deputados federais — dados públicos atualizados diariamente.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const meta = getMeta();
  return (
    <html lang="pt-BR" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <Sidebar />
        <div className="lg:pl-60">
          {meta?.ficticio ? (
            <div role="note" className="border-b border-atencao/40 bg-atencao/15 px-4 py-2 text-center text-sm">
              <strong>Dados fictícios de demonstração.</strong> Nomes, partidos e empresas são inventados; nenhum valor
              se refere a pessoas reais.
            </div>
          ) : null}
          <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">{children}</main>
          <Footer geradoEm={meta?.gerado_em} />
        </div>
      </body>
    </html>
  );
}
