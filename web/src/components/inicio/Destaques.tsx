import { AlertTriangle, Crown, FileText, Plane, TrendingUp, UserX, Vote } from "lucide-react";
import Link from "next/link";
import { Aparecer } from "@/components/ui/Movimento";
import type { Destaque } from "@/lib/destaques";

const ICONES = { gasto: Crown, pico: TrendingUp, presenca: UserX, quadrante: AlertTriangle, passagens: Plane, entrega: FileText, rebeldia: Vote };

export function Destaques({ itens }: { itens: Destaque[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {itens.map((d, i) => {
        const Icone = ICONES[d.tipo];
        const corpo = (
          <div className="cartao brilho-hover flex h-full items-start gap-3 p-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-subtle text-destaque"><Icone size={18} aria-hidden /></span>
            <span>
              <span className="block text-xs font-semibold text-muted">{d.titulo}</span>
              <span className="block text-sm font-medium">{d.texto}</span>
            </span>
          </div>
        );
        return (
          <Aparecer key={d.tipo} atraso={i * 0.05}>
            {d.href ? <Link href={d.href} className="block h-full">{corpo}</Link> : corpo}
          </Aparecer>
        );
      })}
    </div>
  );
}
