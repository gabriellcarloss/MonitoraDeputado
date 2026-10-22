"use client";

import type { EChartsOption } from "echarts";
import dynamic from "next/dynamic";

const Core = dynamic(
  async () => {
    const [{ default: ReactEChartsCore }, { echarts }] = await Promise.all([
      import("echarts-for-react/lib/core"),
      import("./echarts-core"),
    ]);
    function Grafico(props: { option: EChartsOption; height: number; onEvents?: Record<string, (p: never) => void> }) {
      return (
        <ReactEChartsCore echarts={echarts} option={props.option} style={{ height: props.height, width: "100%" }}
          notMerge lazyUpdate onEvents={props.onEvents} />
      );
    }
    return Grafico;
  },
  { ssr: false, loading: () => <div className="animate-pulse rounded-md bg-subtle" style={{ height: 240 }} /> },
);

export function EChart({ option, altura = 280, onEvents }: {
  option: EChartsOption; altura?: number; onEvents?: Record<string, (p: never) => void>;
}) {
  return <Core option={option} height={altura} onEvents={onEvents} />;
}
