import type { Metadata } from "next";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource-variable/inter";
import { Footer } from "@/components/layout/Footer";
import { Sidebar } from "@/components/layout/Sidebar";
import { scriptTema } from "@/components/layout/ThemeToggle";
import { getMeta } from "@/lib/data";
import { AUTOR, SITE_URL } from "@/lib/site";
import "./globals.css";

const DESCRICAO = "Quanto custam, o que entregam e como votam os deputados federais — dados públicos atualizados diariamente.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "MonitoraDeputado", template: "%s · MonitoraDeputado" },
  description: DESCRICAO,
  applicationName: "MonitoraDeputado",
  authors: [{ name: AUTOR.nome, url: AUTOR.linkedin }],
  openGraph: {
    type: "website", locale: "pt_BR", siteName: "MonitoraDeputado", title: "MonitoraDeputado", description: DESCRICAO,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "MonitoraDeputado — fiscalização cidadã dos deputados federais" }],
  },
  twitter: { card: "summary_large_image", title: "MonitoraDeputado", description: DESCRICAO, images: ["/og.png"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const meta = getMeta();
  return (
    <html lang="pt-BR" suppressHydrationWarning>
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
