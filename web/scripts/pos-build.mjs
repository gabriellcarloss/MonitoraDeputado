// Os arquivos por deputado (data/deputado/*.json) só servem para gerar as páginas no build.
// Tirá-los da publicação reduz em ~500 os arquivos enviados à Vercel por execução (limite diário do plano gratuito).
import { rmSync } from "node:fs";

rmSync("out/data/deputado", { recursive: true, force: true });
console.log("out/data/deputado removido da publicação");
