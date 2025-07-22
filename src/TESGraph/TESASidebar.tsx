import React from "react";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel
} from "@/components/ui/sidebar.tsx";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

type TESASidebarProps = {
    currentTab: string;
    titles: Record<string, { main: string; xaxis: string; yaxis: string }>;
    setTitles: React.Dispatch<React.SetStateAction<Record<string, { main: string; xaxis: string; yaxis: string }>>>;
    fontSizes: Record<string, { main: number; xaxis: number; yaxis: number }>;
    setFontSizes: React.Dispatch<React.SetStateAction<Record<string, { main: number; xaxis: number; yaxis: number }>>>;
    data: Record<string, any>; // カーブデータ
    settings: Record<string, { visible: boolean; color: string; mode: string; markerSymbol: string }>;
    handleSettingChange: (curveKey: string, field: string, value: any) => void;
};

export const TESASidebar: React.FC<TESASidebarProps> = ({
                                                            currentTab,
                                                            titles,
                                                            setTitles,
                                                            fontSizes,
                                                            setFontSizes,
                                                            data,
                                                            settings,
                                                            handleSettingChange
                                                        }) => {
    return (
        <Sidebar side="left" className="bg-white text-gray-900">
            <SidebarContent>

                {/* タイトル設定 */}
                <SidebarGroup>
                    <SidebarGroupLabel className="text-sm font-semibold mb-2">タイトル設定</SidebarGroupLabel>
                    <SidebarGroupContent className="space-y-3 text-xs">
                        {["main", "xaxis", "yaxis"].map((field) => (
                            <div key={field}>
                                <label className="block mb-1 capitalize">
                                    {field === "main" ? "タイトル" : field === "xaxis" ? "X軸" : "Y軸"}
                                </label>
                                <input
                                    className="w-40 border rounded px-2 py-1 text-sm leading-5"
                                    value={titles[currentTab][field as keyof (typeof titles)[string]]}
                                    onChange={(e) =>
                                        setTitles((prev) => ({
                                            ...prev,
                                            [currentTab]: { ...prev[currentTab], [field]: e.target.value }
                                        }))
                                    }
                                />
                            </div>
                        ))}
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* フォントサイズ設定 */}
                <SidebarGroup>
                    <SidebarGroupLabel className="text-sm font-semibold mb-2">フォントサイズ</SidebarGroupLabel>
                    <SidebarGroupContent className="space-y-3 text-xs">
                        {["main", "xaxis", "yaxis"].map((field) => (
                            <div key={field}>
                                <label className="block mb-1 capitalize">
                                    {field === "main" ? "タイトル" : field === "xaxis" ? "X軸" : "Y軸"}
                                </label>
                                <div className="flex items-center gap-2">
                                    <Slider
                                        value={[fontSizes[currentTab][field as keyof (typeof fontSizes)[string]]]}
                                        min={8}
                                        max={40}
                                        step={1}
                                        onValueChange={(values) =>
                                            setFontSizes((prev) => ({
                                                ...prev,
                                                [currentTab]: { ...prev[currentTab], [field]: values[0] }
                                            }))
                                        }
                                        className="flex-1"
                                    />
                                    <input
                                        type="number"
                                        className="w-12 border px-1 py-0.5 text-xs text-center"
                                        value={titles[currentTab][field as keyof (typeof titles)[string]]}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            if (!isNaN(val)) {
                                                setFontSizes((prev) => ({
                                                    ...prev,
                                                    [currentTab]: { ...prev[currentTab], [field]: val }
                                                }));
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* カーブ設定 */}
                <SidebarGroup>
                    <SidebarGroupLabel className="text-sm font-semibold mb-2">カーブ設定</SidebarGroupLabel>
                    <SidebarGroupContent className="space-y-2 text-xs">
                        {Object.entries(data).map(([curveKey]) => (
                            <div key={curveKey} className="flex items-center gap-2">
                                <Checkbox
                                    checked={settings[curveKey]?.visible}
                                    onCheckedChange={(checked) =>
                                        handleSettingChange(curveKey, "visible", !!checked)
                                    }
                                    className="w-4 h-4"
                                />
                                <span className="flex-1 truncate">{curveKey}</span>
                                <div className="relative w-5 h-5 rounded-full border border-gray-300 overflow-hidden cursor-pointer">
                                    <input
                                        type="color"
                                        value={settings[curveKey]?.color}
                                        onChange={(e) =>
                                            handleSettingChange(curveKey, "color", e.target.value)
                                        }
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div
                                        style={{ backgroundColor: settings[curveKey]?.color }}
                                        className="w-full h-full rounded-full pointer-events-none"
                                    />
                                </div>
                            </div>
                        ))}
                    </SidebarGroupContent>
                </SidebarGroup>

            </SidebarContent>
        </Sidebar>
    );
};
