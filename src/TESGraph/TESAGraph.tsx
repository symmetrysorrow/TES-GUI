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
import { Printer} from "lucide-react";
import PrintModal from "@/TESGraph/TESGraphModal.tsx";
import {TESASidebar} from "@/TESGraph/TESASidebar.tsx";
import {SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar.tsx";


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

export interface TESAGraphProps extends Omit<TESGraphProps, "data"> {
    data: TESAData;
    unitLabel: string;
    tabs: tabData[];
    sidebarOpen: boolean;
    onToggleSidebar: () => void;
    visibleKeys?: string[]; // 追加
}

export interface TESASetting {
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
        const [settings, setSettings] = useState<Record<string, TESASetting>>(() =>
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
            }, {} as Record<string, TESASetting>)
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
            field: keyof TESASetting,
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
                            </TabList>

                            <TabPanels id="tabPanels" className="flex-grow min-h-0 h-full">
                                {tabs.map((tab) => (

                                    <TabPanel key={tab.label} className="flex h-full overflow-hidden" unmount={false}>
                                        <SidebarProvider>
                                            <TESASidebar
                                                titles={titles}
                                                currentTab={tab.label}
                                                setTitles={setTitles}
                                                data={data}
                                                settings={settings}
                                                handleSettingChange={handleSettingChange}
                                            />

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
                                        </SidebarProvider>
                                    </TabPanel>

                                    //</TESASidebar>
                                ))}
                            </TabPanels>

                    </TabGroup>
                </div>
            </div>
        );
    }
);

export default TESAGraph;
