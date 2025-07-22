import React from "react";
import { TESAData, TESASetting } from "@/TESGraph/TESAGraph.tsx";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel
} from "@/components/ui/sidebar.tsx";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

type TESASidebarProps = {
    titles: Record<string, { main: string; xaxis: string; yaxis: string }>;
    currentTab: string;
    setTitles: React.Dispatch<React.SetStateAction<Record<string, { main: string; xaxis: string; yaxis: string }>>>;
    data: TESAData;
    settings: Record<string, TESASetting>;
    handleSettingChange: (curveKey: string, field: keyof TESASetting, value: any) => void;
};

const markerSymbols = ["circle", "square", "diamond", "cross", "x"];

const ModeIcon = ({ mode }: { mode: "lines" | "markers" | "lines+markers" }) => {
    switch (mode) {
        case "lines":
            return (
                <svg width="24" height="16" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="2,14 8,6 14,10 20,4 22,6" />
                </svg>
            );
        case "markers":
            return (
                <svg width="24" height="16" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="4" cy="10" r="2" fill="currentColor" />
                    <circle cx="12" cy="6" r="2" fill="currentColor" />
                    <circle cx="20" cy="8" r="2" fill="currentColor" />
                </svg>
            );
        case "lines+markers":
            return (
                <svg width="24" height="16" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="2,14 8,6 14,10 20,4 22,6" />
                    <circle cx="2" cy="14" r="2" fill="currentColor" />
                    <circle cx="8" cy="6" r="2" fill="currentColor" />
                    <circle cx="14" cy="10" r="2" fill="currentColor" />
                    <circle cx="20" cy="4" r="2" fill="currentColor" />
                    <circle cx="22" cy="6" r="2" fill="currentColor" />
                </svg>
            );
        default:
            return null;
    }
};

const MarkerIcon: React.FC<{ type: string }> = ({ type }) => {
    const size = 16;
    const stroke = "black";
    switch (type) {
        case "circle":
            return <circle cx={size/2} cy={size/2} r={size/4} fill={stroke} />;
        case "square":
            return <rect x={size/4} y={size/4} width={size/2} height={size/2} fill={stroke} />;
        case "diamond":
            return (
                <polygon
                    points={`${size/2},${size/4} ${size*3/4},${size/2} ${size/2},${size*3/4} ${size/4},${size/2}`}
                    fill={stroke}
                />
            );
        case "cross":
            return (
                <>
                    <line x1={size/4} y1={size/4} x2={size*3/4} y2={size*3/4} stroke={stroke} strokeWidth={2} />
                    <line x1={size*3/4} y1={size/4} x2={size/4} y2={size*3/4} stroke={stroke} strokeWidth={2} />
                </>
            );
        case "x":
            return (
                <>
                    <line x1={size/4} y1={size/4} x2={size*3/4} y2={size*3/4} stroke={stroke} strokeWidth={2} />
                    <line x1={size*3/4} y1={size/4} x2={size/4} y2={size*3/4} stroke={stroke} strokeWidth={2} />
                </>
            );
        default:
            return null;
    }
};


export const TESASidebar: React.FC<TESASidebarProps> = ({
                                                            titles,
                                                            currentTab,
                                                            setTitles,
                                                            data,
                                                            settings,
                                                            handleSettingChange
                                                        }) => {
    return (
        <Sidebar side="left" className="bg-white text-gray-900">
            <SidebarContent>
                {/* タイトル設定 */}
                <SidebarGroup>
                    <SidebarGroupLabel className="text-sm font-semibold">タイトル設定</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <div className="space-y-2 text-xs">
                            <div>
                                <label className="block mb-0.5">タイトル</label>
                                <Input
                                    className="w-45 rounded-sm h-7"
                                    value={titles[currentTab].main}
                                    onChange={(e) =>
                                        setTitles((prev) => ({
                                            ...prev,
                                            [currentTab]: { ...prev[currentTab], main: e.target.value }
                                        }))
                                    }
                                />
                            </div>
                            <div>
                                <label className="block mb-0.5">X軸</label>
                                <Input
                                    className="w-45 rounded-sm h-7"
                                    value={titles[currentTab].xaxis}
                                    onChange={(e) =>
                                        setTitles((prev) => ({
                                            ...prev,
                                            [currentTab]: { ...prev[currentTab], xaxis: e.target.value }
                                        }))
                                    }
                                />
                            </div>
                            <div>
                                <label className="block mb-0.5">Y軸</label>
                                <Input
                                    className="w-45 rounded-sm h-7"
                                    value={titles[currentTab].yaxis}
                                    onChange={(e) =>
                                        setTitles((prev) => ({
                                            ...prev,
                                            [currentTab]: { ...prev[currentTab], yaxis: e.target.value }
                                        }))
                                    }
                                />
                            </div>
                        </div>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* 表示設定 */}
                <SidebarGroup>
                    <SidebarGroupLabel className="text-sm font-semibold">表示設定</SidebarGroupLabel>
                    <SidebarGroupContent className="space-y-3">
                        {Object.keys(data).map((key) => {
                            const setting = settings[key];
                            return (
                                <div key={key} className="border-b pb-1">
                                    <div className="text-sm font-medium mb-1">{key}</div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={setting.visible}
                                            onCheckedChange={(v) => handleSettingChange(key, "visible", !!v)}
                                        />

                                        <div className="relative w-5 h-5">
                                            <div
                                                className="absolute inset-0 rounded-full border"
                                                style={{ backgroundColor: setting.color }}
                                            />
                                            <input
                                                type="color"
                                                value={setting.color}
                                                onChange={(e) => handleSettingChange(key, "color", e.target.value)}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                        </div>

                                        <Select
                                            value={setting.mode}
                                            onValueChange={(v) => handleSettingChange(key, "mode", v)}
                                        >
                                            <SelectTrigger className="w-15 h-6 rounded-sm text-xs px-2 border border-gray-300 flex items-center gap-2">
                                                <ModeIcon mode={setting.mode} />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="lines" className="flex items-center gap-2">
                                                    <ModeIcon mode="lines" />
                                                    <span>Lines</span>
                                                </SelectItem>
                                                <SelectItem value="markers" className="flex items-center gap-2">
                                                    <ModeIcon mode="markers" />
                                                    <span>Markers</span>
                                                </SelectItem>
                                                <SelectItem value="lines+markers" className="flex items-center gap-2">
                                                    <ModeIcon mode="lines+markers" />
                                                    <span>Lines+Markers</span>
                                                </SelectItem>
                                            </SelectContent>


                                        </Select>

                                        <Select
                                            value={setting.markerSymbol}
                                            onValueChange={(v) => handleSettingChange(key, "markerSymbol", v)}
                                        >
                                            <SelectTrigger className="w-14 h-6 flex items-center justify-center rounded-sm border border-gray-300 px-1">
                                                <svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <MarkerIcon type={setting.markerSymbol} />
                                                </svg>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {markerSymbols.map((symbol) => (
                                                    <SelectItem
                                                        key={symbol}
                                                        value={symbol}
                                                        className="flex items-center gap-2 px-2 py-1"
                                                    >
                                                        <svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <MarkerIcon type={symbol} />
                                                        </svg>
                                                        <span>{symbol}</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                    </div>
                                </div>

                            );
                        })}
                    </SidebarGroupContent>

                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
};
