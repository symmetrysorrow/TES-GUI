import React from "react";
import {TESAData, TESASetting} from "@/TESGraph/TESAGraph.tsx";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel
} from "@/components/ui/sidebar.tsx";

type TESASidebarProps = {
    titles: Record<string, { main: string; xaxis: string; yaxis: string }>;
    currentTab: string;
    setTitles: React.Dispatch<React.SetStateAction<Record<string, { main: string; xaxis: string; yaxis: string }>>>;
    data: TESAData;
    settings: Record<string, TESASetting>;
    handleSettingChange: (curveKey: string, field: keyof TESASetting, value: any) => void;
};

const markerSymbols = ["None", "circle", "square", "diamond", "cross", "x"];

export const TESASidebar: React.FC<TESASidebarProps> = ({
                                                        titles,
                                                        currentTab,
                                                        setTitles,
                                                        data,
                                                        settings,
                                                        handleSettingChange
                                                    }) => {
    return (
        <Sidebar side="left">
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>タイトル設定</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <div className="mb-6">
                            <label className="block text-sm font-medium">タイトル</label>
                            <input
                                className="w-full border px-2 py-1"
                                value={titles[currentTab].main}
                                onChange={(e) =>
                                    setTitles((prev) => ({
                                        ...prev,
                                        [currentTab]: {
                                            ...prev[currentTab],
                                            main: e.target.value,
                                        },
                                    }))
                                }
                            />
                            <label className="block text-sm font-medium mt-2">X軸</label>
                            <input
                                className="w-full border px-2 py-1"
                                value={titles[currentTab].xaxis}
                                onChange={(e) =>
                                    setTitles((prev) => ({
                                        ...prev,
                                        [currentTab]: {
                                            ...prev[currentTab],
                                            xaxis: e.target.value,
                                        },
                                    }))
                                }
                            />
                            <label className="block text-sm font-medium mt-2">Y軸</label>
                            <input
                                className="w-full border px-2 py-1"
                                value={titles[currentTab].yaxis}
                                onChange={(e) =>
                                    setTitles((prev) => ({
                                        ...prev,
                                        [currentTab]: {
                                            ...prev[currentTab],
                                            yaxis: e.target.value,
                                        },
                                    }))
                                }
                            />
                        </div>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupLabel>表示設定</SidebarGroupLabel>
                    <SidebarGroupContent>
                        {Object.keys(data).map((key) => {
                            const setting = settings[key];
                            return (
                                <div key={key} className="mb-4">
                                    <h3 className="font-semibold text-sm">{key}</h3>
                                    <label className="text-xs">表示</label>
                                    <input
                                        type="checkbox"
                                        checked={setting.visible}
                                        onChange={(e) => handleSettingChange(key, "visible", e.target.checked)}
                                        className="ml-2"
                                    />
                                    <label className="block text-xs mt-1">色</label>
                                    <input
                                        type="color"
                                        value={setting.color}
                                        onChange={(e) => handleSettingChange(key, "color", e.target.value)}
                                        className="w-full"
                                    />
                                    <label className="block text-xs mt-1">スタイル</label>
                                    <select
                                        value={setting.mode}
                                        onChange={(e) => handleSettingChange(key, "mode", e.target.value)}
                                        className="w-full text-xs"
                                    >
                                        <option value="lines">lines</option>
                                        <option value="markers">markers</option>
                                        <option value="lines+markers">lines+markers</option>
                                    </select>
                                    <label className="block text-xs mt-1">マーカー</label>
                                    <select
                                        value={setting.markerSymbol}
                                        onChange={(e) => handleSettingChange(key, "markerSymbol", e.target.value)}
                                        className="w-full text-xs"
                                    >
                                        {markerSymbols.map((symbol) => (
                                            <option key={symbol} value={symbol}>{symbol}</option>
                                        ))}
                                    </select>
                                </div>
                            );
                        })}
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
};
