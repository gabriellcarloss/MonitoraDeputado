import { describe, expect, it } from "vitest";
import { svgParaGeoJson } from "@/lib/geo";

describe("svgParaGeoJson", () => {
  it("converte path relativo (m + pares implícitos + z) em polígono com y invertido", () => {
    const g = svgParaGeoJson([{ id: "ac", name: "Acre", path: "m 0,0 10,0 0,10 z" }]);
    expect(g.features[0].properties.name).toBe("AC");
    expect(g.features[0].geometry.coordinates).toEqual([[[[0, -0], [10, -0], [10, -10], [0, -0]]]]);
  });
  it("vários subcaminhos: após z o ponto volta ao início do subcaminho", () => {
    const g = svgParaGeoJson([{ id: "rj", name: "Rio", path: "m 5,5 1,0 0,1 z m 10,0 1,0 0,1 z" }]);
    const polis = g.features[0].geometry.coordinates;
    expect(polis).toHaveLength(2);
    expect(polis[1][0][0]).toEqual([15, -5]);
  });
});
