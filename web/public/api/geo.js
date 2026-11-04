// Localização APROXIMADA de quem visita (cidade, UF e país), lida dos cabeçalhos que a própria Vercel
// acrescenta a cada requisição. O IP não sai daqui nem é guardado: só a cidade volta para o navegador,
// que a envia junto com o registro de acesso (veja web/src/components/coleta/Acessos.tsx e /privacidade).
export const config = { runtime: "edge" };

export default function handler(req) {
  const h = req.headers;
  const ler = (k) => {
    const v = h.get(k) || "";
    try { return decodeURIComponent(v); } catch { return v; }
  };
  const corpo = JSON.stringify({
    cidade: ler("x-vercel-ip-city").slice(0, 60),
    estado: ler("x-vercel-ip-country-region").slice(0, 10),
    pais: ler("x-vercel-ip-country").slice(0, 4),
  });
  return new Response(corpo, {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
