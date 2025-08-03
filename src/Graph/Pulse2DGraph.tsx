import React, { useState } from "react";
import TESGraph, { TESGraphRef } from "@/Graph/TESGraph.tsx";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel, SidebarProvider
} from "@/components/ui/sidebar.tsx";
import { Slider } from "@/components/ui/slider";
import {autoWrapLatex} from "@/Graph/TESAGraph.tsx";

export interface Pulse2DProps {
    xdata: number[];
    ydata: number[];
    xaxis: string;
    yaxis: string;
    graphRef: React.RefObject<TESGraphRef>;
}

type Pulse2DSidebarProps = {
    titles: Record<string, { main: string; xaxis: string; yaxis: string }>;
    currentTab: string;
    setTitles: React.Dispatch<React.SetStateAction<Record<string, { main: string; xaxis: string; yaxis: string }>>>;
    color: string;
    setColor: (color: string) => void;
    fontSizes: Record<string, number>;
    setFontSizes: React.Dispatch<React.SetStateAction<Record<string, number>>>;
};

const Pulse2DSidebar: React.FC<Pulse2DSidebarProps> = ({
                                                           titles,
                                                           currentTab,
                                                           setTitles,
                                                           color,
                                                           setColor,
                                                           fontSizes,
                                                           setFontSizes,
                                                       }) => {
    return (
        <Sidebar side="left"  collapsible="none">
            <SidebarContent>

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

                <SidebarGroup>
                    <SidebarGroupLabel>表示設定</SidebarGroupLabel>
                    <SidebarGroupContent>
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

export function Pulse2D({ xdata, ydata, xaxis, yaxis, graphRef }: Pulse2DProps) {
    const [color, setColor] = useState("#4a90e2");
    const [titles, setTitles] = useState<Record<string, { main: string; xaxis: string; yaxis: string }>>({
        Pulse2D: { main: "Pulse Scatter", xaxis, yaxis }
    });

    const [fontSizes, setFontSizes] = useState<Record<string, number>>({
        main: 16,
        xaxis: 14,
        yaxis: 14
    });

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
        title: {
            text: autoWrapLatex(titles.Pulse2D.main),
            font: { size: fontSizes.main }
        },
        xaxis: {
            title: {
                text: autoWrapLatex(titles.Pulse2D.xaxis),
                font: { size: fontSizes.xaxis }
            }
        },
        yaxis: {
            title: {
                text: autoWrapLatex(titles.Pulse2D.yaxis),
                font: { size: fontSizes.yaxis }
            }
        },
        bargap: 0.05,
    };

    return (
        <SidebarProvider>
            <div className="flex h-full w-full">
                <Pulse2DSidebar
                    titles={titles}
                    currentTab="Pulse2D"
                    setTitles={setTitles}
                    color={color}
                    setColor={setColor}
                    fontSizes={fontSizes}
                    setFontSizes={setFontSizes}
                />
                <div className="flex-grow">
                    <TESGraph data={plotData} layout={layout} ref={graphRef} />
                </div>
            </div>
        </SidebarProvider>
    );
}

export default Pulse2D;
