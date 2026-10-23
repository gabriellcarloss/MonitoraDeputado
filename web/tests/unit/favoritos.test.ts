import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { lerFavoritos, linkLista, parseIds, useFavoritos } from "@/lib/favoritos";

describe("favoritos", () => {
  beforeEach(() => localStorage.clear());

  it("parseIds aceita lista ou texto e descarta lixo", () => {
    expect(parseIds("5, 2,x,5,0")).toEqual([5, 2]);
    expect(parseIds([1, "2", null, 2.5])).toEqual([1, 2]);
    expect(parseIds(undefined)).toEqual([]);
  });

  it("armazenamento corrompido vira lista vazia", () => {
    localStorage.setItem("md:favoritos", "{nao é json");
    expect(lerFavoritos()).toEqual([]);
  });

  it("marca, desmarca e sincroniza entre componentes", () => {
    const a = renderHook(() => useFavoritos());
    const b = renderHook(() => useFavoritos());
    act(() => a.result.current.alternar(10));
    act(() => a.result.current.alternar(20));
    expect(b.result.current.ids).toEqual([10, 20]);
    act(() => b.result.current.alternar(10));
    expect(a.result.current.ids).toEqual([20]);
    expect(lerFavoritos()).toEqual([20]);
  });

  it("link da lista", () => expect(linkLista([1, 2])).toBe("/deputados/?lista=1,2"));
});
