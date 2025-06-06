import { useEffect, useRef, useState, useCallback } from "react";
import Plot from "react-plotly.js";
import { PlotData, PlotlyHTMLElement } from "plotly.js";
import { invoke } from "@tauri-apps/api/core";
import { Tab, TabGroup, TabList, TabPanels, TabPanel } from "@headlessui/react";

interface RTData {
    [current: string]: {
        Temp: number[];
        R_tes: number[];
        Alpha: number[];
        BiasPoint: number[];
    };
}

const HEADER_HEIGHT = 80;
const MARGIN_BOTTOM = 10;

const markerSymbols = ["circle", "square", "diamond", "cross", "x"];

const RTContent = ({ folderPath, tabId }: { folderPath: string; tabId: string }) => {
    const plotRef = useRef<PlotlyHTMLElement | null>(null);
    const [containerHeight, setContainerHeight] = useState<number>(window.innerHeight);
    const [data, setData] = useState<RTData | null>(null);
    const [settings, setSettings] = useState<Record<string, {
        visible: boolean;
        color: string;
        mode: PlotData["mode"];
        markerSymbol: string;
    }>>({});
    const [titles, setTitles] = useState({
        RT: {
            title: "R-T Plot",
            xaxis: "Temperature [K]",
            yaxis: "Resistance [Ohm]",
        },
        Alpha: {
            title: "Alpha-Bias Plot",
            xaxis: "Bias Point [uV]",
            yaxis: "Alpha",
        },
    });

    useEffect(() => {
        invoke<RTData>("GetRTCommand", { tabName: tabId })
            .then(setData)
            .catch((err) => {
                console.error("データ取得エラー:", err);
                alert("データ取得に失敗しました");
            });
    }, [tabId]);

    useEffect(() => {
        if (!data) return;
        const initial: typeof settings = {};
        let i = 0;
        for (const current in data) {
            initial[current] = {
                visible: true,
                color: `hsl(${i * 60}, 70%, 50%)`,
                mode: "lines+markers",
                markerSymbol: markerSymbols[i % markerSymbols.length],
            };
            i++;
        }
        setSettings(initial);
    }, [data]);

    useEffect(() => {
        const resize = () => setContainerHeight(window.innerHeight - HEADER_HEIGHT - MARGIN_BOTTOM);
        resize();
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, []);

    const createPlotData = useCallback(
        (xKey: keyof RTData[string], yKey: keyof RTData[string]): Partial<PlotData>[] =>
            data
                ? Object.entries(data).map(([current, entry]): Partial<PlotData> => {
                    const setting = settings[current];
                    return {
                        x: entry[xKey],
                        y: entry[yKey],
                        type: "scatter",
                        mode: setting?.mode || "lines+markers",
                        marker: {
                            color: setting?.color,
                            symbol: setting?.markerSymbol || "circle",
                        },
                        name: `${current} µA`,
                        visible: setting?.visible ? true : "legendonly",
                    };
                })
                : [],
        [data, settings]
    );

    const renderPlot = (plotData: Partial<PlotData>[], plotType: "RT" | "Alpha") => (
        <Plot
            data={plotData}
            layout={{
                title: { text: titles[plotType].title },  // ←ここがポイント
                xaxis: { title: { text: titles[plotType].xaxis } },
                yaxis: { title: { text: titles[plotType].yaxis }},
                dragmode: false,
                autosize: true,
                margin: { t: 40, l: 50, r: 20, b: 100 },
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(0,0,0,0)",
            }}
            config={{
                scrollZoom: true,
                displayModeBar: false,
                responsive: true,
            }}
            useResizeHandler
            style={{ width: "100%", height: containerHeight-100, flexGrow: 1 }}
        />

    );

    return (
        <div style={{ height: containerHeight }} className="w-full flex">
            <div className="flex flex-col w-64 p-2 bg-zinc-900 text-white overflow-auto">
                <h2 className="text-lg font-semibold mb-2">表示設定</h2>
                {Object.entries(settings).map(([current, setting]) => (
                    <div key={current} className="mb-2">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={setting.visible}
                                onChange={(e) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        [current]: { ...prev[current], visible: e.target.checked },
                                    }))
                                }
                            />
                            {current} µA
                        </label>
                        <input
                            type="color"
                            value={setting.color}
                            onChange={(e) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    [current]: { ...prev[current], color: e.target.value },
                                }))
                            }
                            className="w-full mt-1"
                        />
                        <select
                            value={setting.markerSymbol}
                            onChange={(e) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    [current]: { ...prev[current], markerSymbol: e.target.value },
                                }))
                            }
                            className="w-full mt-1 text-black"
                        >
                            {markerSymbols.map((symbol) => (
                                <option key={symbol} value={symbol}>
                                    {symbol}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
                <hr className="my-2 border-zinc-700" />
                <h2 className="text-lg font-semibold mb-1">グラフ設定</h2>
                {(["RT", "Alpha"] as const).map((type) => (
                    <div key={type}>
                        <label>{type} タイトル</label>
                        <input
                            value={titles[type].title}
                            onChange={(e) =>
                                setTitles((prev) => ({
                                    ...prev,
                                    [type]: { ...prev[type], title: e.target.value },
                                }))
                            }
                        />
                        <label className="block text-sm font-medium mt-1">X軸</label>
                        <input
                            type="text"
                            value={titles[type as "RT" | "Alpha"].xaxis}
                            onChange={(e) =>
                                setTitles((prev) => ({
                                    ...prev,
                                    [type]: { ...prev[type], xaxis: e.target.value },
                                }))
                            }
                            className="w-full mt-1 px-1 text-black"
                        />
                        <label className="block text-sm font-medium mt-1">Y軸</label>
                        <input
                            type="text"
                            value={titles[type as "RT" | "Alpha"].yaxis}
                            onChange={(e) =>
                                setTitles((prev) => ({
                                    ...prev,
                                    [type]: { ...prev[type], yaxis: e.target.value },
                                }))
                            }
                            className="w-full mt-1 px-1 text-black"
                        />
                    </div>
                ))}
            </div>

            <div className="flex-1">
                <TabGroup className="flex flex-1 flex-col w-full mx-auto text-white">
                    <TabList className="flex p-1 bg-zinc-800 rounded-full w-fit mx-auto">
                        {"RT,Alpha".split(",").map((label) => (
                            <Tab
                                key={label}
                                className={({ selected }) =>
                                    `px-2 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                                        selected ? "text-zinc-900 shadow" : "text-white hover:bg-zinc-700"
                                    }`
                                }
                            >
                                {label}
                            </Tab>
                        ))}
                    </TabList>
                    <TabPanels className="w-full flex-grow flex flex-col h-full min-h-0">
                        <TabPanel className="flex-grow flex min-h-0">
                            {renderPlot(createPlotData("Temp", "R_tes"), "RT")}
                        </TabPanel>
                        <TabPanel className="flex-grow flex min-h-0">
                            {renderPlot(createPlotData("BiasPoint", "Alpha"), "Alpha")}
                        </TabPanel>
                    </TabPanels>
                </TabGroup>
            </div>
        </div>
    );
};

export default RTContent;