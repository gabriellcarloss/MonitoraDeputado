/** Converte os contornos SVG dos estados (@svg-maps/brazil, CC-BY-4.0) em GeoJSON no plano do SVG (y invertido). */

export interface LocalSvg { id: string; name: string; path: string }

type Anel = [number, number][];

export function svgParaGeoJson(locais: LocalSvg[]) {
  return {
    type: "FeatureCollection" as const,
    features: locais.map((l) => ({
      type: "Feature" as const,
      properties: { name: l.id.toUpperCase(), nome: l.name },
      geometry: { type: "MultiPolygon" as const, coordinates: aneis(l.path).map((a) => [a]) },
    })),
  };
}

function aneis(d: string): Anel[] {
  const tokens = d.match(/[mzMZ]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const out: Anel[] = [];
  let x = 0, y = 0, x0 = 0, y0 = 0;
  let atual: Anel | null = null;
  let relativo = true;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "m" || t === "M") {
      relativo = t === "m";
      const nx = Number(tokens[++i]), ny = Number(tokens[++i]);
      x = relativo ? x + nx : nx; y = relativo ? y + ny : ny;
      x0 = x; y0 = y;
      atual = [[x, -y]];
      out.push(atual);
    } else if (t === "z" || t === "Z") {
      if (atual) atual.push([x0, -y0]);
      x = x0; y = y0;
      atual = null;
    } else {
      const ny = Number(tokens[++i]);
      x = relativo ? x + Number(t) : Number(t); y = relativo ? y + ny : ny;
      if (!atual) { atual = [[x, -y]]; out.push(atual); } else atual.push([x, -y]);
    }
  }
  return out;
}
