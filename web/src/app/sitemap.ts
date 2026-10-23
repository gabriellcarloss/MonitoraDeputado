import type { MetadataRoute } from "next";
import { getDeputadoIds, getMeta } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

const PAGINAS = ["/", "/deputados/", "/gastos/", "/gastos/passagens/", "/votacoes/", "/presenca/", "/proposicoes/", "/alertas/", "/rede/", "/sobre/"];

export default function sitemap(): MetadataRoute.Sitemap {
  const quando = getMeta()?.gerado_em ? new Date(getMeta()!.gerado_em) : new Date();
  return [
    ...PAGINAS.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: quando, changeFrequency: "daily" as const, priority: p === "/" ? 1 : 0.7 })),
    ...getDeputadoIds().map((id) => ({ url: `${SITE_URL}/deputado/${id}/`, lastModified: quando, changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
