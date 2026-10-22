// Prepara public/duckdb para o site não depender de CDN:
//  - bundle "eh" do DuckDB-WASM;
//  - parquet-wasm (leitor de reserva quando a extensão Parquet do DuckDB não carrega);
//  - extensão Parquet do DuckDB, baixada de extensions.duckdb.org quando a rede permite (no CI).
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const dist = path.dirname(require.resolve("@duckdb/duckdb-wasm/dist/duckdb-eh.wasm"));
const destino = path.resolve("public/duckdb");
mkdirSync(destino, { recursive: true });
for (const f of ["duckdb-eh.wasm", "duckdb-browser-eh.worker.js"]) copyFileSync(path.join(dist, f), path.join(destino, f));
const pq = path.join(path.dirname(require.resolve("parquet-wasm/esm/parquet_wasm.js")), "parquet_wasm_bg.wasm");
copyFileSync(pq, path.join(destino, "parquet_wasm_bg.wasm"));

// Versão do DuckDB embutida no wasm (ex.: v1.1.1) define o caminho da extensão.
const VERSAO = process.env.DUCKDB_VERSAO ?? "v1.1.1";
const ext = path.join(destino, "extensions", VERSAO, "wasm_eh", "parquet.duckdb_extension.wasm");
if (!existsSync(ext)) {
  try {
    const r = await fetch(`https://extensions.duckdb.org/${VERSAO}/wasm_eh/parquet.duckdb_extension.wasm`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    mkdirSync(path.dirname(ext), { recursive: true });
    writeFileSync(ext, Buffer.from(await r.arrayBuffer()));
    console.log("extensão parquet baixada");
  } catch (e) {
    console.warn("extensão parquet indisponível (o site usará parquet-wasm):", e.message ?? e);
  }
}
writeFileSync(path.join(destino, "info.json"), JSON.stringify({ versao: VERSAO, extensao: existsSync(ext) }));
console.log("duckdb-wasm preparado em", destino);
