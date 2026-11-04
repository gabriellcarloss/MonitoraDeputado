import { BarChart, GraphChart, LineChart, RadarChart, ScatterChart } from "echarts/charts";
import {
  DataZoomComponent, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, MarkPointComponent,
  RadarComponent, TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([BarChart, GraphChart, LineChart, RadarChart, ScatterChart, DataZoomComponent, GridComponent, LegendComponent,
  MarkAreaComponent, MarkLineComponent, MarkPointComponent, RadarComponent, TooltipComponent, CanvasRenderer]);

export { echarts };
