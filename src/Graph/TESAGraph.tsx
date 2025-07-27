import React, {
    useState,
    useCallback,
    useImperativeHandle,
    useRef,
    forwardRef,
    useEffect,
} from "react";
import TESGraph, {TESGraphProps, TESGraphRef} from "./TESGraph";
import { PlotData } from "plotly.js";
import {Tab, TabGroup, TabList, TabPanels, TabPanel} from "@headlessui/react";
import { Menu, } from "lucide-react";
import PrintModal from "@/Graph/TESGraphModal.tsx";
import { TESASidebar } from "@/Graph/TESASidebar.tsx";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar.tsx";

const fixedColors = [
    "#1f77b4", // blue
    "#ff7f0e", // orange
    "#2ca02c", // green
    "#d62728", // red
    "#9467bd", // purple
    "#8c564b", // brown
    "#e377c2", // pink
    "#7f7f7f", // gray
    "#bcbd22", // olive
    "#17becf", // cyan
];


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
    visibleKeys?: string[];
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
            visibleKeys,
            ...restProps
        },
        ref
    ) => {
        const [selectedTab, setSelectedTab] = useState(tabs[0].label);

        const innerGraphRefs = useRef<Record<string, React.RefObject<TESGraphRef>>>(
            tabs.reduce((acc, tab) => {
                acc[tab.label] = React.createRef<TESGraphRef>();
                return acc;
            }, {} as Record<string, React.RefObject<TESGraphRef>>)
        );

        //config for settings
        const [settings, setSettings] = useState<Record<string, TESASetting>>(() =>
            Object.keys(data).reduce((acc, key, index) => {
                acc[key] = {
                    visible: true,
                    color: fixedColors[index % fixedColors.length], // これで固定順に色が割り当てられます
                    mode: "lines+markers",
                    markerSymbol: "circle",
                };
                return acc;
            }, {} as Record<string, TESASetting>)
        );

        // config for titles
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

        // config for font sizes
        const [fontSizes, setFontSizes] = useState<Record<string, { main: number; xaxis: number; yaxis: number }>>(
            tabs.reduce((acc, tab) => {
                acc[tab.label] = { main: 16, xaxis: 14, yaxis: 14 };
                return acc;
            }, {} as Record<string, { main: number; xaxis: number; yaxis: number }>)
        );

        //Apply settings when data changes
        useEffect(() => {
            if (data) {
                setSettings(prev => {
                    const newSettings = { ...prev };
                    const keys = Object.keys(data).sort();
                    keys.forEach((key, index) => {
                        if (!newSettings[key]) {
                            newSettings[key] = {
                                visible: true,
                                color: fixedColors[index % fixedColors.length],
                                mode: "lines+markers",
                                markerSymbol: "circle",
                            };
                        }
                    });
                    return newSettings;
                });
            }
        }, [data]);

        // Expose methods to parent component
        useImperativeHandle(ref, () => ({
            exportImage: async (options) => {
                const currentRef = innerGraphRefs.current[selectedTab];
                if (!currentRef?.current) return "";
                return await currentRef.current.exportImage(options);
            },
            forceRedraw: () => {
                const currentRef = innerGraphRefs.current[selectedTab];
                currentRef?.current?.forceRedraw();
            }
        }));

        // Create plot data based on current tab and settings
        const createPlotData = useCallback(
            (tab: tabData): Partial<PlotData>[] => {
                return Object.entries(data).map(([key, entry]) => {
                    const setting = settings[key];
                    const isVisible = visibleKeys ? visibleKeys.includes(key) : setting?.visible;

                    return {
                        x: entry[tab.xKey] ?? [],
                        y: entry[tab.yKey] ?? [],
                        type: "scatter" as const,
                        mode: setting?.mode || "lines+markers",
                        marker: { color: setting?.color, symbol: setting?.markerSymbol },
                        name: "$"+key+unitLabel+"$",
                        visible: isVisible && setting?.visible ? true : "legendonly",
                    };
                });
            },
            [data, settings, visibleKeys, unitLabel]
        );

        const handleSettingChange = (curveKey: string, field: string, value: any) => {
            setSettings(prev => ({
                ...prev,
                [curveKey]: { ...prev[curveKey], [field]: value }
            }));
        };

        function CustomSidebarTrigger() {
            const { toggleSidebar } = useSidebar();
            return <Menu onClick={toggleSidebar} />;
        }

        return (
            <SidebarProvider>
                <div className="flex w-full h-full relative">
                    <div className="flex-grow flex flex-col">
                        <TabGroup
                            selectedIndex={tabs.findIndex((t) => t.label === selectedTab)}
                            onChange={(i) => setSelectedTab(tabs[i].label)}
                            className="min-h-0 h-full flex flex-col"
                        >
                            <TabList className="relative flex justify-center border-b border-gray-400p">
                                {tabs.map((tab) => (
                                    <Tab
                                        key={tab.label}
                                        className={({ selected }) =>
                                            `px-4 py-2 cursor-pointer ${
                                                selected ? "border-b-2 border-blue-500 font-bold" : "text-gray-400"
                                            }`
                                        }
                                    >
                                        {tab.label}
                                    </Tab>
                                ))}
                                <div className="absolute left-1 top-1/2 -translate-y-1/2 p-1 text-gray-600 hover:text-gray-800">
                                    <CustomSidebarTrigger />
                                </div>
                                <div className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-gray-600 hover:text-gray-800">
                                    <PrintModal graphRef={innerGraphRefs.current[selectedTab]}/>
                                </div>

                            </TabList>

                            <TabPanels className="relative flex-1 min-h-0 p-4">
                                {tabs.map((tab) => (
                                    <TabPanel key={tab.label} className="flex h-full overflow-hidden" unmount={false}>
                                        <TESASidebar
                                            currentTab={tab.label}
                                            titles={titles}
                                            setTitles={setTitles}
                                            fontSizes={fontSizes}
                                            setFontSizes={setFontSizes}
                                            data={data}
                                            settings={settings}
                                            handleSettingChange={handleSettingChange}
                                        />

                                        <div className="flex-grow h-full ml-2">
                                            <TESGraph
                                                ref={innerGraphRefs.current[tab.label]}
                                                data={createPlotData(tab)}
                                                layout={{
                                                    title: { text: titles[tab.label].main, font: { size: fontSizes[tab.label].main } },
                                                    xaxis: { title: { text: titles[tab.label].xaxis, font: { size: fontSizes[tab.label].xaxis } } },
                                                    yaxis: { title: { text: titles[tab.label].yaxis, font: { size: fontSizes[tab.label].yaxis } } },
                                                }}
                                                {...restProps}
                                            />

                                        </div>
                                    </TabPanel>
                                ))}
                            </TabPanels>
                        </TabGroup>
                    </div>
                </div>
            </SidebarProvider>
        );
    }
);

export default TESAGraph;
