import React, { useEffect, useState } from "react";
import TESGraph, { TESGraphRef } from "@/Graph/TESGraph.tsx";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarProvider
} from "@/components/ui/sidebar.tsx";
import { invoke } from "@tauri-apps/api/core";
import { PlotData } from "plotly.js";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {autoWrapLatex} from "@/Graph/TESAGraph.tsx";  // shadcn slider

type PulseAnalysisResult = {
    Time: number[];
    Pulse: number[];
    FilteredPulse: number[];
    PI: PulseInfoS;
    PIH: PulseInfoHelperS;
    PAH: PulseAnalysisHelperS;
};

type PulseInfoS = {
    Base: number;
    PeakAverage: number;
    PeakIndex: number;
    RiseTime: number;
    DecayTime: number;
};

type PulseInfoHelperS = {
    Peak: number;
    RiseHighIndex: number;
    RiseLowIndex: number;
    DecayHighIndex: number;
    DecayLowIndex: number;
};

type PulseAnalysisHelperS = {
    BaseStart: number;
    BaseEnd: number;
    PeakSearch: number;
    PeakAverageStart: number;
    PeakAverageEnd: number;
};

export interface PulsePulseProps {
    tabId: string;
    channel: string;
    pulseIndex: string;
    pulseConfigVer: number;
    graphRef: React.RefObject<TESGraphRef>;
}

export function PulsePulse({ tabId, pulseIndex, channel, pulseConfigVer, graphRef }: PulsePulseProps) {
    const [titles, setTitles] = useState({
        Pulse: { main: "Pulse Graph", xaxis: "Time", yaxis: "Amplitude" },
    });

    const [titleFontSizes, setTitleFontSizes] = useState({
        main: 16,
        xaxis: 12,
        yaxis: 12,
    });

    const [traceSettings, setTraceSettings] = useState<Record<string, { visible: boolean; color: string }>>({
        Pulse: { visible: true, color: "#4a90e2" },
        FilteredPulse: { visible: true, color: "#e24a4a" },
        RiseRegion: { visible: true, color: "rgba(100,200,255,0.2)" },
        DecayRegion: { visible: true, color: "rgba(255,200,100,0.2)" },
        BaseRegion: { visible: true, color: "rgba(200,255,100,0.2)" },
        PeakAverageRegion: { visible: true, color: "rgba(255,100,200,0.2)" },
        Peak: { visible: true, color: "#e24a4a" },
    });

    const [analysis, setAnalysis] = useState<PulseAnalysisResult | null>(null);

    //Update the graph when the pulse index ,channel or setting changes
    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await invoke<PulseAnalysisResult>("GetPulseAnalysisCommand", {
                    tabName: tabId,
                    key: Number(pulseIndex),
                    channel: Number(channel),
                });
                setAnalysis(result);
            } catch (e) {
                alert("データ取得失敗:" + e);
                setAnalysis(null);
            }
        };
        fetchData();
    }, [channel, pulseIndex, pulseConfigVer]);

    const plotData: Partial<PlotData>[] = [];

    const plotMax= analysis?.Pulse ? Math.max(...analysis.Pulse) : 1;

    if (analysis?.Time && analysis?.Pulse && traceSettings.Pulse.visible) {
        plotData.push({
            x: analysis.Time,
            y: analysis.Pulse,
            type: "scatter",
            mode: "lines",
            name: "Pulse",
            marker: { color: traceSettings.Pulse.color },
        });
    }

    if (analysis?.Time && analysis?.FilteredPulse && traceSettings.FilteredPulse.visible) {
        plotData.push({
            x: analysis.Time,
            y: analysis.FilteredPulse,
            type: "scatter",
            mode: "lines",
            name: "Filtered Pulse",
            marker: { color: traceSettings.FilteredPulse.color },
        });
    }

    if (analysis?.PIH && traceSettings.DecayRegion.visible) {
        plotData.push({
            x: [
                analysis.Time[analysis.PIH.DecayLowIndex],
                analysis.Time[analysis.PIH.DecayHighIndex],
                analysis.Time[analysis.PIH.DecayHighIndex],
                analysis.Time[analysis.PIH.DecayLowIndex],
                analysis.Time[analysis.PIH.DecayLowIndex]
            ],
            y: [0, 0, plotMax, plotMax, 0],
            type: "scatter",
            fill: "toself",
            mode:"lines",
            fillcolor: traceSettings.DecayRegion.color,
            line: { width: 0 },
            name: "Decay Region",
        });
    }

    if (analysis?.PAH && traceSettings.BaseRegion.visible) {
        plotData.push({
            x: [
                analysis.Time[analysis.PAH.BaseStart],
                analysis.Time[analysis.PAH.BaseEnd],
                analysis.Time[analysis.PAH.BaseEnd],
                analysis.Time[analysis.PAH.BaseStart],
                analysis.Time[analysis.PAH.BaseStart]
            ],
            y: [0, 0, plotMax, plotMax, 0],
            type: "scatter",
            fill: "toself",
            mode:"lines",
            fillcolor: traceSettings.BaseRegion.color,
            line: { width: 0 },
            name: "Base Region",
        });
    }

    if (analysis?.PAH && traceSettings.PeakAverageRegion.visible) {
        plotData.push({
            x: [
                analysis.Time[analysis.PAH.PeakAverageStart],
                analysis.Time[analysis.PAH.PeakAverageEnd],
                analysis.Time[analysis.PAH.PeakAverageEnd],
                analysis.Time[analysis.PAH.PeakAverageStart],
                analysis.Time[analysis.PAH.PeakAverageStart]
            ],
            y: [0, 0, plotMax, plotMax, 0],
            type: "scatter",
            fill: "toself",
            mode:"lines",
            fillcolor: traceSettings.PeakAverageRegion.color,
            line: { width: 0 },
            name: "Peak Average Region",
        });
    }

    if (analysis?.PIH && traceSettings.RiseRegion.visible) {
        plotData.push({
            x: [
                analysis.Time[analysis.PIH.RiseLowIndex],
                analysis.Time[analysis.PIH.RiseHighIndex],
                analysis.Time[analysis.PIH.RiseHighIndex],
                analysis.Time[analysis.PIH.RiseLowIndex],
                analysis.Time[analysis.PIH.RiseLowIndex]
            ],
            y: [0, 0, plotMax, plotMax, 0],
            type: "scatter",
            fill: "toself",
            mode:"lines",
            fillcolor: traceSettings.RiseRegion.color,
            line: { width: 0 },
            name: "Rise Region",
        });
    }

    if (analysis?.PI && traceSettings.Peak.visible) {
        plotData.push({
            x: [analysis.Time[analysis.PI.PeakIndex]],
            y: [analysis.PI.PeakAverage],
            type: "scatter",
            mode: "markers",
            marker: { color: traceSettings.Peak.color, size: 10 },
            name: "Peak",
        });
    }

    const layout = {
        title: { text: autoWrapLatex(titles.Pulse.main), font: { size: titleFontSizes.main } },
        xaxis: { title: { text: autoWrapLatex(titles.Pulse.xaxis), font: { size: titleFontSizes.xaxis } } },
        yaxis: { title: { text: autoWrapLatex(titles.Pulse.yaxis), font: { size: titleFontSizes.yaxis } } },
        bargap: 0.05,
    };

    return (
        <SidebarProvider>
            <div className="flex h-full w-full">
                <Sidebar side="left" className="bg-white text-gray-900"  collapsible="none">
                    <SidebarContent>
                        <SidebarGroup>
                            <SidebarGroupLabel className="text-sm font-semibold mb-2">タイトル設定</SidebarGroupLabel>
                            <SidebarGroupContent className="space-y-6 text-xs">
                                {["main", "xaxis", "yaxis"].map((field) => (
                                    <div key={field}>
                                        <label className="block mb-1 capitalize">
                                            {field === "main" ? "タイトル" : field === "xaxis" ? "X軸" : "Y軸"}
                                        </label>
                                        <input
                                            className="w-40 border rounded px-2 py-1 text-sm leading-5 mb-2"
                                            value={titles.Pulse[field as keyof typeof titles.Pulse]}
                                            onChange={(e) =>
                                                setTitles((prev) => ({
                                                    ...prev,
                                                    Pulse: { ...prev.Pulse, [field]: e.target.value },
                                                }))
                                            }
                                        />
                                        <div className="flex items-center space-x-2">
                                            <Slider
                                                value={[titleFontSizes[field as keyof typeof titleFontSizes]]}
                                                min={8}
                                                max={40}
                                                step={1}
                                                onValueChange={(values) =>
                                                    setTitleFontSizes((prev) => ({
                                                        ...prev,
                                                        [field]: values[0],
                                                    }))
                                                }
                                                className="flex-1"
                                            />
                                            <input
                                                type="number"
                                                value={titleFontSizes[field as keyof typeof titleFontSizes]}
                                                min={8}
                                                max={40}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (!isNaN(val) && val >= 8 && val <= 40) {
                                                        setTitleFontSizes((prev) => ({
                                                            ...prev,
                                                            [field]: val,
                                                        }));
                                                    }
                                                }}
                                                className="w-14 border px-1 py-0.5 text-xs text-center"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </SidebarGroupContent>
                        </SidebarGroup>

                        <SidebarGroup>
                            <SidebarGroupLabel className="text-sm font-semibold mt-6 mb-2">トレース設定</SidebarGroupLabel>
                            <SidebarGroupContent>
                                {Object.entries(traceSettings).map(([key, setting]) => (
                                    <div key={key} className="flex items-center gap-3 mb-3 text-xs">
                                        <Checkbox
                                            checked={setting.visible}
                                            onCheckedChange={(checked) =>
                                                setTraceSettings((prev) => ({
                                                    ...prev,
                                                    [key]: { ...prev[key], visible: !!checked },
                                                }))
                                            }
                                            className="w-4 h-4"
                                        />
                                        <span className="flex-1">{key}</span>
                                        <div className="relative w-6 h-6 rounded-full border border-gray-300 overflow-hidden cursor-pointer">
                                            <input
                                                type="color"
                                                value={setting.color}
                                                onChange={(e) =>
                                                    setTraceSettings((prev) => ({
                                                        ...prev,
                                                        [key]: { ...prev[key], color: e.target.value },
                                                    }))
                                                }
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div style={{ backgroundColor: setting.color }} className="w-full h-full rounded-full pointer-events-none" />
                                        </div>
                                    </div>
                                ))}
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>
                </Sidebar>

                <div className="flex-grow p-4">
                    <TESGraph data={plotData} layout={layout} ref={graphRef} />
                </div>
            </div>
        </SidebarProvider>
    );
}

export default PulsePulse;
