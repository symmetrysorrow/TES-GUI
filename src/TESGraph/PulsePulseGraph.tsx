import React, {useEffect, useState} from "react";
import TESGraph from "@/TESGraph/TESGraph.tsx";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel, SidebarProvider
} from "@/components/ui/sidebar.tsx";
import {invoke} from "@tauri-apps/api/core";
import {PlotData} from "plotly.js";

type PulseAnalysisResult = {
    Time: number[];             // f64 の Vec
    Pulse: number[];            // Vec<f64>
    FilteredPulse: number[];    // Vec<f64>
    PI: PulseInfoS;
    PIH: PulseInfoHelperS;
    PAH: PulseAnalysisHelperS;
};

type PulseInfoS = {
    Base: number;
    PeakAverage: number;
    PeakIndex: number;     // Rust側はu32→numberでOK
    RiseTime: number;
    DecayTime: number;
};

type PulseInfoHelperS = {
    Peak: number;
    RiseHighIndex: number;   // Rust側 usize→number
    RiseLowIndex: number;
    DecayHighIndex: number;
    DecayLowIndex: number;
};

type PulseAnalysisHelperS = {
    BaseStart: number;         // Rust側 u32→number
    BaseEnd: number;
    PeakSearch: number;
    PeakAverageStart: number;
    PeakAverageEnd: number;
};

export interface PulsePulseProps {
    tabId: string;
    channel: string;
    pulseIndex:string;
}

type PulseSidebarProps = {
    titles: Record<string, { main: string; xaxis: string; yaxis: string }>;
    currentTab: string;
    setTitles: React.Dispatch<React.SetStateAction<Record<string, { main: string; xaxis: string; yaxis: string }>>>;
    color: string;
    setColor: (color: string) => void;
};

const PulseSidebar: React.FC<PulseSidebarProps> = ({
                                                               titles,
                                                               currentTab,
                                                               setTitles,
                                                               color,
                                                               setColor,
                                                           }) => {
    return (
        <Sidebar side="left">
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>タイトル設定</SidebarGroupLabel>
                    <SidebarGroupContent>
                        {/* タイトル入力 */}
                        <label className="block text-sm font-medium">タイトル</label>
                        <input
                            className="w-full border px-2 py-1"
                            value={titles[currentTab].main}
                            onChange={(e) =>
                                setTitles(prev => ({
                                    ...prev,
                                    [currentTab]: { ...prev[currentTab], main: e.target.value }
                                }))
                            }
                        />
                        <label className="block text-sm font-medium mt-2">X軸</label>
                        <input
                            className="w-full border px-2 py-1"
                            value={titles[currentTab].xaxis}
                            onChange={(e) =>
                                setTitles(prev => ({
                                    ...prev,
                                    [currentTab]: { ...prev[currentTab], xaxis: e.target.value }
                                }))
                            }
                        />
                        <label className="block text-sm font-medium mt-2">Y軸</label>
                        <input
                            className="w-full border px-2 py-1"
                            value={titles[currentTab].yaxis}
                            onChange={(e) =>
                                setTitles(prev => ({
                                    ...prev,
                                    [currentTab]: { ...prev[currentTab], yaxis: e.target.value }
                                }))
                            }
                        />
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>表示設定</SidebarGroupLabel>
                    <SidebarGroupContent>
                        {/* 色設定 */}
                        <label className="block text-sm font-medium mt-2">ヒストグラムの色</label>
                        <input
                            type="color"
                            className="w-full"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                        />
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
};

export function PulsePulse({ tabId, pulseIndex, channel }: PulsePulseProps) {
    // サイドバーで操作する状態
    const [color, setColor] = useState("#4a90e2");
    const [titles, setTitles] = useState<Record<string, { main: string; xaxis: string; yaxis: string }>>({
        Pulse: { main: "Pulse Histogram", xaxis:"Time", yaxis:"Amplitude", }
    });

    const [analysis, setAnalysis] = useState<PulseAnalysisResult | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await invoke<PulseAnalysisResult>("GetPulseAnalysisCommand", {
                    tabName: tabId,
                    key: Number(pulseIndex),
                    channel: Number(channel)
                });
                setAnalysis(result);
            } catch (e) {
                alert("データ取得失敗:"+e);
                setAnalysis(null);
            }
        };

        fetchData();
    }, [channel, pulseIndex]);

    const highlightTraces: Partial<PlotData>[] = [];

    if (analysis && analysis.Time) {
        const time = analysis.Time;

        if (analysis.PIH?.RiseLowIndex !== undefined && analysis.PIH?.RiseHighIndex !== undefined) {
            highlightTraces.push({
                x: [
                    time[analysis.PIH.RiseLowIndex],
                    time[analysis.PIH.RiseHighIndex],
                    time[analysis.PIH.RiseHighIndex],
                    time[analysis.PIH.RiseLowIndex],
                    time[analysis.PIH.RiseLowIndex]
                ],
                y: [0, 0, 1, 1, 0], // yref=paper 相当で0~1
                type: "scatter",
                fill: "toself",
                fillcolor: "rgba(100,200,255,0.2)",
                line: { width: 0 },
                name: "Rise Region",
                yaxis: "y",  // 普通のy軸
            });
        }

        if (analysis.PIH?.DecayLowIndex !== undefined && analysis.PIH?.DecayHighIndex !== undefined) {
            highlightTraces.push({
                x: [
                    time[analysis.PIH.DecayLowIndex],
                    time[analysis.PIH.DecayHighIndex],
                    time[analysis.PIH.DecayHighIndex],
                    time[analysis.PIH.DecayLowIndex],
                    time[analysis.PIH.DecayLowIndex]
                ],
                y: [0, 0, 1, 1, 0],
                type: "scatter",
                fill: "toself",
                fillcolor: "rgba(255,200,100,0.2)",
                line: { width: 0 },
                name: "Decay Region",
                yaxis: "y",
            });
        }

        if (analysis.PI?.PeakIndex !== undefined) {
            highlightTraces.push({
                x: [time[analysis.PI.PeakIndex]],
                y: [analysis.PI.PeakAverage],
                type: "scatter",
                mode: "markers",
                marker: { color: "#e24a4a", size: 10 },
                name: "Peak",
                yaxis: "y",
            });
        }

        if (analysis.PAH?.BaseStart !== undefined && analysis.PAH?.BaseEnd !== undefined) {
            highlightTraces.push({
                x: [
                    time[analysis.PAH.BaseStart],
                    time[analysis.PAH.BaseEnd],
                    time[analysis.PAH.BaseEnd],
                    time[analysis.PAH.BaseStart],
                    time[analysis.PAH.BaseStart]
                ],
                y: [0, 0, 1, 1, 0],
                type: "scatter",
                fill: "toself",
                fillcolor: "rgba(200,255,100,0.2)",
                line: { width: 0 },
                name: "Base Region",
                yaxis: "y",
            });
        }

        if (analysis.PAH?.PeakAverageStart !== undefined && analysis.PAH?.PeakAverageEnd !== undefined) {
            highlightTraces.push({
                x: [
                    time[analysis.PAH.PeakAverageStart],
                    time[analysis.PAH.PeakAverageEnd],
                    time[analysis.PAH.PeakAverageEnd],
                    time[analysis.PAH.PeakAverageStart],
                    time[analysis.PAH.PeakAverageStart]
                ],
                y: [0, 0, 1, 1, 0],
                type: "scatter",
                fill: "toself",
                fillcolor: "rgba(255,100,200,0.2)",
                line: { width: 0 },
                name: "Peak Average Region",
                yaxis: "y",
            });
        }

        if (analysis.PI?.PeakAverage !== undefined) {
            highlightTraces.push({
                x: [time[analysis.PI?.PeakIndex]],
                y: [analysis.PI?.PeakAverage || 0],
                type: "scatter",
                mode: "markers",
                marker: { color: "#4a90e2", size: 10 },
                name: "Peak Search",
                yaxis: "y",
            });
        }
    }

    // Plotly用データ
    const plotData = [
        {
            x: analysis?.Time,
            y: analysis?.Pulse,
            type: "scatter" as const,
            mode: "lines" as const,
            name: "Pulse",
            marker: { color },
        },
        {
            x: analysis?.Time,
            y: analysis?.FilteredPulse,
            type: "scatter" as const,
            mode: "lines" as const,
            name: "Filtered Pulse",
            marker: { color: "#e24a4a" },  // 別の色にすると見やすい
        },
            ...highlightTraces
    ];

    const layout = {
        title: { text: titles.Pulse.main },
        xaxis: { title: { text: titles.Pulse.xaxis } },
        yaxis: { title: { text: titles.Pulse.yaxis } },
        bargap: 0.05,
    };



    return (
        <SidebarProvider>
            <div className="flex h-full">
                {/* サイドバー */}
                <PulseSidebar
                    titles={titles}
                    currentTab="Pulse"
                    setTitles={setTitles}
                    color={color}
                    setColor={setColor}
                />

                {/* グラフ */}
                <div className="flex-grow">
                    <TESGraph data={plotData} layout={layout} />
                </div>
            </div>
        </SidebarProvider>
    );
}

export default PulsePulse;
