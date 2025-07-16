import React, {
    useState,
    useCallback,
    useImperativeHandle,
    useRef,
    forwardRef, useEffect,
} from "react";
import TESGraph, { TESGraphProps, TESGraphRef } from "./TESGraph";
import { PlotData } from "plotly.js";
import { Tab, TabGroup, TabList, TabPanels, TabPanel } from "@headlessui/react";
import { Menu, Printer} from "lucide-react";
import PrintModal from "@/TESGraph/TESGraphModal.tsx";


export interface TESAData {
    [curveKey: string]: {
        [dataKey: string]: number[];
    };
}

export interface tabData {
    label: string;
    xKey: string;
    yKey: string;
    defaultTitle: string;
    defaultXaxis: string;
    defaultYaxis: string;
}

const markerSymbols = ["None", "circle", "square", "diamond", "cross", "x"];

export interface TESAGraphProps extends Omit<TESGraphProps, "data"> {
    data: TESAData;
    unitLabel: string;
    tabs: tabData[];
    sidebarOpen: boolean;
    onToggleSidebar: () => void;
    visibleKeys?: string[]; // 追加
}

interface Setting {
    visible: boolean;
    color: string;
    mode: PlotData["mode"];
    markerSymbol: string;
}

const TESAGraph = forwardRef<TESGraphRef, TESAGraphProps>(
    (
        {
            data,
            unitLabel,
            tabs,
            sidebarOpen,
            onToggleSidebar,
            visibleKeys, // 受け取る
            ...restProps
        },
        ref
    ) => {
        const [selectedTab, setSelectedTab] = useState(tabs[0].label);
        const [printModalOpen, setPrintModalOpen] = useState(false);


        // タブごとにTESGraphのrefを作成し保持（初回のみ）
        const innerGraphRefs = useRef<Record<string, React.RefObject<TESGraphRef>>>(
            tabs.reduce((acc, tab) => {
                acc[tab.label] = React.createRef<TESGraphRef>();
                return acc;
            }, {} as Record<string, React.RefObject<TESGraphRef>>)
        );

        // 各カーブの表示設定をstate管理
        const [settings, setSettings] = useState<Record<string, Setting>>(() =>
            Object.keys(data).reduce((acc, key) => {
                acc[key] = {
                    visible: true,
                    color:
                        "#" +
                        Math.floor(Math.random() * 16777215)
                            .toString(16)
                            .padStart(6, "0"),
                    mode: "lines+markers",
                    markerSymbol: "circle",
                };
                return acc;
            }, {} as Record<string, Setting>)
        );

        //DEBUG
        useEffect(() => {
            console.log("settings:", settings);
        }, [settings]);

        // 各タブのタイトル・軸ラベルをstate管理
        const [titles, setTitles] = useState(
            tabs.reduce((acc, tab) => {
                acc[tab.label] = {
                    main: tab.defaultTitle,
                    xaxis: tab.defaultXaxis,
                    yaxis: tab.defaultYaxis,
                };
                return acc;
            }, {} as Record<string, { main: string; xaxis: string; yaxis: string }>)
        );

        useEffect(() => {
            if (data) {
                setSettings(prev => {
                    const newSettings = { ...prev };
                    Object.keys(data).forEach(key => {
                        if (!newSettings[key]) {
                            newSettings[key] = {
                                visible: true,
                                color: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
                                mode: "lines+markers",
                                markerSymbol: "circle",
                            };
                        }
                    });
                    return newSettings;
                });
            }
        }, [data]);


        // 表示中タブのTESGraphRefを外部に公開
        useImperativeHandle(ref, () => ({
            exportImage: async (options) => {
                const currentRef = innerGraphRefs.current[selectedTab];
                if (!currentRef?.current) return "";
                return await currentRef.current.exportImage(options);
            },
        }));

        // プロット用データ作成関数
        const createPlotData = useCallback(
            (tab: TESAGraphProps["tabs"][number]): Partial<PlotData>[] => {
                return Object.entries(data).map(([keyValue, entry]) => {
                    const setting = settings[keyValue];
                    // visibleKeysがあれば、それに含まれるkeyのみvisible
                    const isVisible = visibleKeys
                        ? visibleKeys.includes(keyValue)
                        : setting?.visible;

                    return {
                        x: entry[tab.xKey] ?? [],
                        y: entry[tab.yKey] ?? [],
                        type: "scatter",
                        mode:
                            setting?.markerSymbol === "None"
                                ? "lines"
                                : setting?.mode || "lines+markers",
                        marker:
                            setting?.markerSymbol === "None"
                                ? { color: setting?.color }
                                : { color: setting?.color, symbol: setting?.markerSymbol },
                        name: `${keyValue}${unitLabel}`,
                        visible: isVisible && setting?.visible ? true : "legendonly",
                    };
                });
            },
            [data, settings, visibleKeys]
        );

        //const title = titles[selectedTab];

        // 設定変更ハンドラ
        const handleSettingChange = (
            curveKey: string,
            field: keyof Setting,
            value: any
        ) => {
            setSettings((prev) => ({
                ...prev,
                [curveKey]: {
                    ...prev[curveKey],
                    [field]: value,
                },
            }));
        };

        return (
            <div className="flex w-full h-full relative">
                <PrintModal
                    isOpen={printModalOpen}
                    onClose={() => setPrintModalOpen(false)}
                    graphRef={innerGraphRefs.current[selectedTab]}
                />

                {/* グラフとタブ */}
                <div className="flex-grow flex flex-col">
                    <TabGroup
                        selectedIndex={tabs.findIndex((t) => t.label === selectedTab)}
                        onChange={(i) => setSelectedTab(tabs[i].label)}
                        className="min-h-0 h-full"
                    >
                        <TabList id="tabList" className="relative flex justify-center border-b border-gray-400 px-2">
                            {tabs.map((tab) => (
                                <Tab
                                    key={tab.label}
                                    className={({ selected }) =>
                                        `px-4 py-2 cursor-pointer ${
                                            selected
                                                ? "border-b-2 border-blue-500 font-bold"
                                                : "text-gray-400"
                                        }`
                                    }
                                >
                                    {tab.label}
                                </Tab>
                            ))}
                            <button
                                onClick={() => setPrintModalOpen(true)}
                                className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-gray-600 hover:text-gray-800"
                            >
                                <Printer size={20} />
                            </button>
                            <button
                                onClick={onToggleSidebar}
                                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-gray-600 hover:text-gray-800"
                            >
                                <Menu size={20} />
                            </button>
                        </TabList>

                        <TabPanels id="tabPanels" className="flex-grow min-h-0 h-[calc(100%-60px)]">
                            {tabs.map((tab) => (
                                <TabPanel key={tab.label} className="flex h-full overflow-hidden" unmount={false}>
                                    {/* グラフ領域：横伸び */}
                                    <div className="flex-grow h-full ml-2">
                                        <TESGraph
                                            ref={innerGraphRefs.current[tab.label]}
                                            data={createPlotData(tab)}
                                            layout={{
                                                title: { text: titles[tab.label].main },
                                                xaxis: { title: { text: titles[tab.label].xaxis } },
                                                yaxis: { title: { text: titles[tab.label].yaxis } },
                                            }}
                                            {...restProps}
                                        />
                                    </div>

                                    {/* 右側の固定幅サイドバー */}
                                    {sidebarOpen && (
                                        <div className="w-64 flex h-full flex-col border-l border-gray-300">
                                            <div className="h-full overflow-y-auto p-4">
                                                {/* 表示設定パネルの中身 */}
                                                <h2 className="text-lg font-bold mb-4">表示設定</h2>
                                                {/* タイトル・軸設定 */}
                                                <div className="mb-6">
                                                    <label className="block text-sm font-medium">タイトル</label>
                                                    <input
                                                        className="w-full border px-2 py-1"
                                                        value={titles[tab.label].main}
                                                        onChange={(e) =>
                                                            setTitles((prev) => ({
                                                                ...prev,
                                                                [tab.label]: {
                                                                    ...prev[tab.label],
                                                                    main: e.target.value,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                    <label className="block text-sm font-medium mt-2">X軸</label>
                                                    <input
                                                        className="w-full border px-2 py-1"
                                                        value={titles[tab.label].xaxis}
                                                        onChange={(e) =>
                                                            setTitles((prev) => ({
                                                                ...prev,
                                                                [tab.label]: {
                                                                    ...prev[tab.label],
                                                                    xaxis: e.target.value,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                    <label className="block text-sm font-medium mt-2">Y軸</label>
                                                    <input
                                                        className="w-full border px-2 py-1"
                                                        value={titles[tab.label].yaxis}
                                                        onChange={(e) =>
                                                            setTitles((prev) => ({
                                                                ...prev,
                                                                [tab.label]: {
                                                                    ...prev[tab.label],
                                                                    yaxis: e.target.value,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                </div>
                                                {/* 各カーブの設定 */}
                                                {Object.keys(data).map((key) => {
                                                    const setting = settings[key];
                                                    return (
                                                        <div key={key} className="mb-4">
                                                            <h3 className="font-semibold text-sm">{key}</h3>
                                                            <label className="text-xs">表示</label>
                                                            <input
                                                                type="checkbox"
                                                                checked={setting.visible}
                                                                onChange={(e) =>
                                                                    handleSettingChange(key, "visible", e.target.checked)
                                                                }
                                                                className="ml-2"
                                                            />
                                                            <label className="block text-xs mt-1">色</label>
                                                            <input
                                                                type="color"
                                                                value={setting.color}
                                                                onChange={(e) =>
                                                                    handleSettingChange(key, "color", e.target.value)
                                                                }
                                                                className="w-full"
                                                            />
                                                            <label className="block text-xs mt-1">スタイル</label>
                                                            <select
                                                                value={setting.mode}
                                                                onChange={(e) =>
                                                                    handleSettingChange(key, "mode", e.target.value)
                                                                }
                                                                className="w-full text-xs"
                                                            >
                                                                <option value="lines">lines</option>
                                                                <option value="markers">markers</option>
                                                                <option value="lines+markers">lines+markers</option>
                                                            </select>
                                                            <label className="block text-xs mt-1">マーカー</label>
                                                            <select
                                                                value={setting.markerSymbol}
                                                                onChange={(e) =>
                                                                    handleSettingChange(key, "markerSymbol", e.target.value)
                                                                }
                                                                className="w-full text-xs"
                                                            >
                                                                {markerSymbols.map((symbol) => (
                                                                    <option key={symbol} value={symbol}>
                                                                        {symbol}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </TabPanel>

                            ))}
                        </TabPanels>
                    </TabGroup>
                </div>
            </div>
        );
    }
);

export default TESAGraph;
