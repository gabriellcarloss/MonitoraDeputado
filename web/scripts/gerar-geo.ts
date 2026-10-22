// Gera public/geo/br-uf.json a partir de @svg-maps/brazil (CC-BY-4.0).
import { mkdirSync, writeFileSync } from "node:fs";
import mapa from "@svg-maps/brazil";
import { svgParaGeoJson } from "../src/lib/geo";

mkdirSync("public/geo", { recursive: true });
writeFileSync("public/geo/br-uf.json", JSON.stringify(svgParaGeoJson(mapa.locations)));
console.log("public/geo/br-uf.json gerado com", mapa.locations.length, "UFs");
