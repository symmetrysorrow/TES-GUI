import React, { useState } from "react";
import TESGraph, { TESGraphRef } from "@/TESGraph/TESGraph.tsx";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel, SidebarProvider
} from "@/components/ui/sidebar.tsx";
import { Slider } from "@/components/ui/slider";

export interface HistogramProps {
    data: number[];
    xaxis: string;
    yaxis: string;
    binNum: number;
    graphRef: React.RefObject<TESGraphRef>;
}

type HistogramSidebarProps = {
    titles: Record<string, { main: string; xaxis: string; yaxis: string }>;
    currentTab: string;
    setTitles: React.Dispatch<React.SetStateAction<Record<string, { main: string; xaxis: string; yaxis: string }>>>;
    color: string;
    setColor: (color: string) => void;
    binNum: number;
    setBinNum: (num: number) => void;
    fontSizes: Record<string, number>;
    setFontSizes: React.Dispatch<React.SetStateAction<Record<string, number>>>;
};

const HistogramSidebar: React.FC<HistogramSidebarProps> = ({
                                                               titles,
                                                               currentTab,
                                                               setTitles,
                                                               color,
                                                               setColor,
                                                               binNum,
                                                               setBinNum,
                                                               fontSizes,
                                                               setFontSizes,
                                                           }) => {
    return (
        <Sidebar side="left" collapsible="none">
            <SidebarContent>

                {/* タイトル設定 */}
                <SidebarGroup>
                    <SidebarGroupLabel>タイトル設定</SidebarGroupLabel>
                    <SidebarGroupContent>
                        {["main", "xaxis", "yaxis"].map((field) => (
                            <div key={field} className="mb-4">
                                <label className="block text-sm font-medium">
                                    {field === "main" ? "タイトル" : field === "xaxis" ? "X軸" : "Y軸"}
                                </label>
                                <input
                                    className="w-full border px-2 py-1"
                                    value={titles[currentTab][field as keyof typeof titles[typeof currentTab]]}
                                    onChange={(e) =>
                                        setTitles(prev => ({
                                            ...prev,
                                            [currentTab]: { ...prev[currentTab], [field]: e.target.value }
                                        }))
                                    }
                                />
                                <div className="flex items-center mt-1 space-x-2">
                                    <span className="text-xs">文字サイズ</span>
                                    <Slider
                                        value={[fontSizes[field]]}
                                        min={8}
                                        max={40}
                                        step={1}
                                        onValueChange={(values) =>
                                            setFontSizes(prev => ({ ...prev, [field]: values[0] }))
                                        }
                                        className="flex-1"
                                    />
                                    <input
                                        type="number"
                                        value={fontSizes[field]}
                                        min={8}
                                        max={40}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            if (!isNaN(val) && val >= 8 && val <= 40) {
                                                setFontSizes(prev => ({ ...prev, [field]: val }));
                                            }
                                        }}
                                        className="w-12 border px-1 py-0.5 text-xs text-center"
                                    />
                                </div>
                            </div>
                        ))}
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* 表示設定 */}
                <SidebarGroup>
                    <SidebarGroupLabel>表示設定</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <label className="block text-sm font-medium mt-2">ヒストグラムの色</label>
                        <input
                            type="color"
                            className="w-full"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                        />

                        {/* ビン数 */}
                        <label className="block text-sm font-medium mt-4 mb-1">ビン数</label>
                        <div className="flex items-center space-x-2">
                            <Slider
                                value={[binNum]}
                                min={1}
                                max={2000}
                                step={1}
                                onValueChange={(values) => setBinNum(values[0])}
                                className="flex-1"
                            />
                            <input
                                type="number"
                                value={binNum}
                                min={1}
                                max={2000}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (!isNaN(val) && val >= 1) setBinNum(val);
                                }}
                                className="w-16 border px-1 py-0.5 text-xs text-center"
                            />
                        </div>
                    </SidebarGroupContent>
                </SidebarGroup>

            </SidebarContent>
        </Sidebar>
    );
};

export function PulseHistogram({ data, binNum: initialBinNum, xaxis, yaxis, graphRef }: HistogramProps) {
    const [color, setColor] = useState("#4a90e2");
    const [binNum, setBinNum] = useState(initialBinNum);
    const [titles, setTitles] = useState<Record<string, { main: string; xaxis: string; yaxis: string }>>({
        Histogram: { main: "Pulse Histogram", xaxis, yaxis }
    });

    const [fontSizes, setFontSizes] = useState<Record<string, number>>({
        main: 16,
        xaxis: 14,
        yaxis: 14
    });

    const plotData = [
        {
            x: data,
            type: "histogram" as const,
            marker: { color },
            nbinsx: binNum,
        }
    ];

    const layout = {
        title: { text: titles.Histogram.main, font: { size: fontSizes.main } },
        xaxis: { title: { text: titles.Histogram.xaxis, font: { size: fontSizes.xaxis } } },
        yaxis: { title: { text: titles.Histogram.yaxis, font: { size: fontSizes.yaxis } } },
        bargap: 0.05,
    };

    return (
        <SidebarProvider>
            <div className="flex h-full w-full">
                <HistogramSidebar
                    titles={titles}
                    currentTab="Histogram"
                    setTitles={setTitles}
                    color={color}
                    setColor={setColor}
                    binNum={binNum}
                    setBinNum={setBinNum}
                    fontSizes={fontSizes}
                    setFontSizes={setFontSizes}
                />
                <div className="flex-grow flex-1 h-full p-4">
                    <TESGraph data={plotData} layout={layout} ref={graphRef} />
                </div>
            </div>
        </SidebarProvider>
    );
}

export default PulseHistogram;
