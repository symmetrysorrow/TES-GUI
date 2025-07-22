import React, { useEffect, useState } from "react";
import TESGraph,{TESGraphRef} from "@/TESGraph/TESGraph.tsx";
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
    pulseConfigVer:number;
    graphRef: React.RefObject<TESGraphRef>;
}

export function PulsePulse({ tabId, pulseIndex, channel , pulseConfigVer,graphRef}: PulsePulseProps) {
    const [titles, setTitles] = useState({
        Pulse: { main: "Pulse Graph", xaxis: "Time", yaxis: "Amplitude" },
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
    }, [channel, pulseIndex,pulseConfigVer]);

    const plotData: Partial<PlotData>[] = [];

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

    if (analysis?.PIH && traceSettings.RiseRegion.visible) {
        plotData.push({
            x: [
                analysis.Time[analysis.PIH.RiseLowIndex],
                analysis.Time[analysis.PIH.RiseHighIndex],
                analysis.Time[analysis.PIH.RiseHighIndex],
                analysis.Time[analysis.PIH.RiseLowIndex],
                analysis.Time[analysis.PIH.RiseLowIndex]
            ],
            y: [0, 0, 1, 1, 0],
            type: "scatter",
            fill: "toself",
            fillcolor: traceSettings.RiseRegion.color,
            line: { width: 0 },
            name: "Rise Region",
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
            y: [0, 0, 1, 1, 0],
            type: "scatter",
            fill: "toself",
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
            y: [0, 0, 1, 1, 0],
            type: "scatter",
            fill: "toself",
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
            y: [0, 0, 1, 1, 0],
            type: "scatter",
            fill: "toself",
            fillcolor: traceSettings.PeakAverageRegion.color,
            line: { width: 0 },
            name: "Peak Average Region",
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
        title: { text: titles.Pulse.main },
        xaxis: { title: { text: titles.Pulse.xaxis } },
        yaxis: { title: { text: titles.Pulse.yaxis } },
        bargap: 0.05,
    };

    return (
        <SidebarProvider>
            <div className="flex h-full w-full">
                <Sidebar side="left" collapsible="none">
                    <SidebarContent>
                        <SidebarGroup>
                            <SidebarGroupLabel>タイトル設定</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <label className="block text-sm">タイトル</label>
                                <input
                                    className="w-full border px-2 py-1"
                                    value={titles.Pulse.main}
                                    onChange={(e) =>
                                        setTitles(prev => ({
                                            ...prev,
                                            Pulse: { ...prev.Pulse, main: e.target.value }
                                        }))
                                    }
                                />
                                <label className="block text-sm mt-2">X軸</label>
                                <input
                                    className="w-full border px-2 py-1"
                                    value={titles.Pulse.xaxis}
                                    onChange={(e) =>
                                        setTitles(prev => ({
                                            ...prev,
                                            Pulse: { ...prev.Pulse, xaxis: e.target.value }
                                        }))
                                    }
                                />
                                <label className="block text-sm mt-2">Y軸</label>
                                <input
                                    className="w-full border px-2 py-1"
                                    value={titles.Pulse.yaxis}
                                    onChange={(e) =>
                                        setTitles(prev => ({
                                            ...prev,
                                            Pulse: { ...prev.Pulse, yaxis: e.target.value }
                                        }))
                                    }
                                />
                            </SidebarGroupContent>
                        </SidebarGroup>

                        <SidebarGroup>
                            <SidebarGroupLabel>トレース設定</SidebarGroupLabel>
                            <SidebarGroupContent>
                                {Object.entries(traceSettings).map(([key, setting]) => (
                                    <div key={key} className="flex items-center mb-2">
                                        <input
                                            type="checkbox"
                                            checked={setting.visible}
                                            onChange={(e) =>
                                                setTraceSettings(prev => ({
                                                    ...prev,
                                                    [key]: { ...prev[key], visible: e.target.checked }
                                                }))
                                            }
                                        />
                                        <span className="ml-2 flex-1">{key}</span>
                                        <input
                                            type="color"
                                            value={setting.color}
                                            onChange={(e) =>
                                                setTraceSettings(prev => ({
                                                    ...prev,
                                                    [key]: { ...prev[key], color: e.target.value }
                                                }))
                                            }
                                            className="ml-2"
                                        />
                                    </div>
                                ))}
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>
                </Sidebar>

                <div className="flex-grow">
                    <TESGraph data={plotData} layout={layout} ref={graphRef}/>
                </div>
            </div>
        </SidebarProvider>
    );
}

export default PulsePulse;
