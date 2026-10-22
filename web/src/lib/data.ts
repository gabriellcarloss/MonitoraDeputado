/** Leitura dos dados em tempo de build (Server Components / generateStaticParams). */
import fs from "node:fs";
import path from "node:path";
import type { Alerta, Brasil, DeputadoDetalhe, DeputadoResumo, Meta } from "./types";

const DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "public", "data");

function ler<T>(arquivo: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIR, arquivo), "utf8")) as T;
  } catch {
    return null;
  }
}

export const getMeta = () => ler<Meta>("meta.json");
export const getDeputados = () => ler<DeputadoResumo[]>("deputados.json") ?? [];
export const getBrasil = () => ler<Brasil>("brasil.json");
export const getAlertas = () => ler<Alerta[]>("alertas.json") ?? [];
export const getDeputado = (id: number | string) => ler<DeputadoDetalhe>(`deputado/${Number(id)}.json`);
export const getDeputadoIds = () => getDeputados().map((d) => d.id);
