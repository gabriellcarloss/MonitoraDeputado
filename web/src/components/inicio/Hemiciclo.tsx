/** Plenário em pontos: um ponto por deputado federal (513), em arcos concêntricos. Puramente decorativo. */
const TOTAL = 513;
const ARCOS = 9;

function pontos() {
  const raios = Array.from({ length: ARCOS }, (_, i) => 0.4 + (0.6 * i) / (ARCOS - 1));
  const soma = raios.reduce((a, b) => a + b, 0);
  const contagens = raios.map((r) => Math.round((r / soma) * TOTAL));
  contagens[ARCOS - 1] += TOTAL - contagens.reduce((a, b) => a + b, 0);
  const lista: { x: number; y: number; atraso: number; destaque: boolean }[] = [];
  raios.forEach((r, i) => {
    const n = contagens[i];
    for (let k = 0; k < n; k++) {
      const t = n === 1 ? 0.5 : k / (n - 1); // 0 = esquerda, 1 = direita
      const ang = Math.PI * (1 - t);
      lista.push({
        x: 100 + Math.cos(ang) * r * 96,
        y: 100 - Math.sin(ang) * r * 96,
        atraso: Math.round(t * 900 + i * 40),
        destaque: (k * 7 + i * 3) % 23 === 0,
      });
    }
  });
  return lista;
}

const PONTOS = pontos();

export function Hemiciclo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 108" className={className} aria-hidden focusable="false">
      {PONTOS.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={p.destaque ? 1.9 : 1.45}
          className={`hemi-ponto ${p.destaque ? "hemi-destaque" : ""}`} style={{ ["--d" as string]: `${p.atraso}ms` }} />
      ))}
    </svg>
  );
}
