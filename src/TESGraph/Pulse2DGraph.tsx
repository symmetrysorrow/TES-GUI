import React, { useState } from "react";
import TESGraph from "@/TESGraph/TESGraph.tsx";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel, SidebarProvider
} from "@/components/ui/sidebar.tsx";

export interface Pulse2DProps {
    xdata: number[];
    ydata: number[];
    xaxis: string;
    yaxis: string;
}

type Pulse2DSidebarProps = {
    titles: Record<string, { main: string; xaxis: string; yaxis: string }>;
    currentTab: string;
    setTitles: React.Dispatch<React.SetStateAction<Record<string, { main: string; xaxis: string; yaxis: string }>>>;
    color: string;
    setColor: (color: string) => void;
};

const Pulse2DSidebar: React.FC<Pulse2DSidebarProps> = ({
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
                        <label className="block text-sm font-medium mt-2">色</label>
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

export function Pulse2D({ xdata,ydata, xaxis, yaxis }: Pulse2DProps) {
    // サイドバーで操作する状態
    const [color, setColor] = useState("#4a90e2");
    const [titles, setTitles] = useState<Record<string, { main: string; xaxis: string; yaxis: string }>>({
        Pulse2D: { main: "Pulse Scatter", xaxis, yaxis }
    });

    // Plotly用データ
    const plotData = [
        {
            x: xdata,
            y: ydata,
            type: "scatter" as const,
            mode: "markers" as const,
            marker: { color },
        }
    ];

    const layout = {
        title: { text: titles.Pulse2D.main },
        xaxis: { title: { text: titles.Pulse2D.xaxis } },
        yaxis: { title: { text: titles.Pulse2D.yaxis } },
        bargap: 0.05,
    };

    return (
        <SidebarProvider>
            <div className="flex h-full w-full">
                {/* サイドバー */}
                <Pulse2DSidebar
                    titles={titles}
                    currentTab="Pulse2D"
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

export default Pulse2D;
