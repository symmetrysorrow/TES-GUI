import React, { useState } from "react";
import TESGraph from "@/TESGraph/TESGraph.tsx";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel, SidebarProvider
} from "@/components/ui/sidebar.tsx";

export interface HistogramProps {
    data: number[];
    xaxis: string;
    yaxis: string;
    binNum: number;
}

type HistogramSidebarProps = {
    titles: Record<string, { main: string; xaxis: string; yaxis: string }>;
    currentTab: string;
    setTitles: React.Dispatch<React.SetStateAction<Record<string, { main: string; xaxis: string; yaxis: string }>>>;
    color: string;
    setColor: (color: string) => void;
    binNum: number;
    setBinNum: (num: number) => void;
};

const HistogramSidebar: React.FC<HistogramSidebarProps> = ({
                                                               titles,
                                                               currentTab,
                                                               setTitles,
                                                               color,
                                                               setColor,
                                                               binNum,
                                                               setBinNum,
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
                        {/* ビン数設定 */}
                        <label className="block text-sm font-medium mt-2">ビン数</label>
                        <input
                            type="number"
                            className="w-full border px-2 py-1"
                            value={binNum}
                            min={1}
                            onChange={(e) => setBinNum(Number(e.target.value))}
                        />
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
};

export function PulseHistogram({ data, binNum: initialBinNum, xaxis, yaxis }: HistogramProps) {
    // サイドバーで操作する状態
    const [color, setColor] = useState("#4a90e2");
    const [binNum, setBinNum] = useState(initialBinNum);
    const [titles, setTitles] = useState<Record<string, { main: string; xaxis: string; yaxis: string }>>({
        Histogram: { main: "Pulse Histogram", xaxis, yaxis }
    });

    // Plotly用データ
    const plotData = [
        {
            x: data,
            type: "histogram" as const,
            marker: { color },
            nbinsx: binNum,
        }
    ];

    const layout = {
        title: { text: titles.Histogram.main },
        xaxis: { title: { text: titles.Histogram.xaxis } },
        yaxis: { title: { text: titles.Histogram.yaxis } },
        bargap: 0.05,
    };

    return (
        <SidebarProvider>
            <div className="flex h-full w-full">
                {/* サイドバー */}
                <HistogramSidebar
                    titles={titles}
                    currentTab="Histogram"
                    setTitles={setTitles}
                    color={color}
                    setColor={setColor}
                    binNum={binNum}
                    setBinNum={setBinNum}
                />

                {/* グラフ */}
                <div className="flex-grow">
                    <TESGraph data={plotData} layout={layout} />
                </div>
            </div>
        </SidebarProvider>
    );
}

export default PulseHistogram;
