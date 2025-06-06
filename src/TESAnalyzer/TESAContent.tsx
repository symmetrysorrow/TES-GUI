import { useEffect, useState, useCallback } from "react";
import Plot from "react-plotly.js";
import { PlotData } from "plotly.js";
import { Tab, TabGroup, TabList, TabPanels, TabPanel } from "@headlessui/react";
import {invoke} from "@tauri-apps/api/core";

const defaultColors = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8",
    "#f58231", "#911eb4", "#46f0f0", "#f032e6",
    "#bcf60c", "#fabebe", "#008080", "#e6beff",
    "#9a6324", "#fffac8", "#800000", "#aaffc3",
    "#808000", "#ffd8b1", "#000075", "#808080",
    "#ffffff", "#000000"
];

export interface TESAData {
    [key: string]: {
        [dataKey: string]: number[];
    };
}

const markerSymbols = ["None", "circle", "square", "diamond", "cross", "x"];

interface TabConfig {
    id: string;
    label: string;
    xKey: string;
    yKey: string;
    defaultTitle: string;
    defaultXaxis: string;
    defaultYaxis: string;
}

interface Setting {
    visible: boolean;
    color: string;
    mode: PlotData["mode"];
    markerSymbol: string;
}

interface TESAContentProps {
    data: TESAData | null;
    tabs: TabConfig[];
    tabId: string|null;
    initialSettings?: Record<string, Setting>;
    initialTitles?: Record<string, { title: string; xaxis: string; yaxis: string }>;
}

const HEADER_HEIGHT = 80;
const MARGIN_BOTTOM = 10;

const TESAContent = ({
                         data,
                         tabs,
                         tabId,
                         initialSettings = {},
                         initialTitles,
                     }: TESAContentProps) => {
    const [containerHeight, setContainerHeight] = useState<number>(window.innerHeight);
    const [selectedTab, setSelectedTab] = useState(tabs[0].id);

    // IV選択関連
    const [ivSelecting, setIVSelecting] = useState(false);
    const [ivSelectedRange, setIVSelectedRange] = useState<[number, number] | null>(null);
    const [ivSelectedCurrent, setIVSelectedCurrent] = useState<string | null>(null);
    const [ivModalOpen, setIVModalOpen] = useState(false);

    // 表示設定
    const [settings, setSettings] = useState<Record<string, Setting>>(initialSettings);
    // タイトル設定
    const [titles, setTitles] = useState(() => {
        if (initialTitles) return initialTitles;
        const initTitles: Record<string, { title: string; xaxis: string; yaxis: string }> = {};
        tabs.forEach(({ id, defaultTitle, defaultXaxis, defaultYaxis }) => {
            initTitles[id] = { title: defaultTitle, xaxis: defaultXaxis, yaxis: defaultYaxis };
        });
        return initTitles;
    });

    // 初期設定セット
    useEffect(() => {
        if (!data) return;
        if (Object.keys(settings).length === 0) {
            const initial: Record<string, Setting> = {};
            let i = 0;
            for (const current in data) {
                initial[current] = {
                    visible: true,
                    color: defaultColors[i % defaultColors.length],
                    mode: "lines+markers",
                    markerSymbol: markerSymbols[i % markerSymbols.length],
                };
                i++;
            }
            setSettings(initial);
        }
    }, [data]);

    // リサイズ対応
    useEffect(() => {
        const resize = () => setContainerHeight(window.innerHeight - HEADER_HEIGHT - MARGIN_BOTTOM);
        resize();
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, []);

    // プロットデータ作成
    const createPlotData = useCallback(
        (xKey: string, yKey: string): Partial<PlotData>[] =>
            data
                ? Object.entries(data).map(([current, entry]): Partial<PlotData> => {
                    const setting = settings[current];
                    return {
                        x: entry[xKey] ?? [],
                        y: entry[yKey] ?? [],
                        type: "scatter",
                        mode:
                            setting?.markerSymbol === "None"
                                ? "lines"
                                : setting?.mode || "lines+markers",
                        marker:
                            setting?.markerSymbol === "None"
                                ? { color: setting?.color }
                                : {
                                    color: setting?.color,
                                    symbol: setting?.markerSymbol,
                                },
                        name: `${current} µA`,
                        visible: setting?.visible ? true : "legendonly",
                    };
                })
                : [],
        [data, settings]
    );

    // IV選択用モーダルを開く
    const openIVSelectModal = () => setIVModalOpen(true);

    // IV選択モーダルの選択確定
    const handleIVModalConfirm = (selectedCurrent: string) => {
        if (!data || !Object.keys(data).includes(selectedCurrent)) {
            setIVModalOpen(false);
            return;
        }
        // 選択されたcurrentだけvisibleにして他は非表示
        const newSettings: Record<string, Setting> = {};
        Object.entries(settings).forEach(([current, setting]) => {
            newSettings[current] = { ...setting, visible: current === selectedCurrent };
        });
        setSettings(newSettings);
        setIVSelectedCurrent(selectedCurrent);
        setIVSelectedRange(null);
        setIVSelecting(true);
        setIVModalOpen(false);
    };

    // IV選択モーダルキャンセル
    const handleIVModalCancel = () => setIVModalOpen(false);

    // 範囲確定ボタン押下
    const handleConfirmRange = () => {
        if (!ivSelectedRange) return;
        const [xMin, xMax] = ivSelectedRange;
        invoke("CalibrateSingleJumpCommand", {tabName:tabId,temp:Number(ivSelectedCurrent), calibStartIbias:xMin, calibEndIbias:xMax})
        invoke
        // 全visibleを戻す
        setSettings((prev) =>
            Object.fromEntries(
                Object.entries(prev).map(([k, v]) => [k, { ...v, visible: true }])
            )
        );
        setIVSelecting(false);
        setIVSelectedRange(null);
        setIVSelectedCurrent(null);
    };

    // キャンセルボタン押下（ドラッグ中も可能）
    const handleCancelRange = () => {
        console.log("選択がキャンセルされました");
        setSettings((prev) =>
            Object.fromEntries(
                Object.entries(prev).map(([k, v]) => [k, { ...v, visible: true }])
            )
        );
        setIVSelecting(false);
        setIVSelectedRange(null);
        setIVSelectedCurrent(null);
    };

    // Plotlyの範囲選択イベント
    const onSelected = (e: any) => {
        if (!ivSelecting || !e?.range?.x) return;
        const [xMin, xMax] = e.range.x;
        setIVSelectedRange([xMin, xMax]);
    };

    const renderPlot = (plotData: Partial<PlotData>[], plotType: string) => {
        // 矩形用のshapeを準備
        const shapes = [];

        if (selectedTab === "IV" && ivSelecting && ivSelectedRange) {
            const [xMin, xMax] = ivSelectedRange;
            shapes.push({
                type: 'rect' as const,
                xref: 'x'as const,
                yref: 'paper'as const,
                x0: xMin,
                x1: xMax,
                y0: 0,
                y1: 1,
                fillcolor: 'rgba(0, 123, 255, 0.3)',  // 青色半透明
                line: {
                    width: 0,
                },
                layer: 'below' as const,
            });
        }

        return (
            <Plot
                data={plotData}
                layout={{
                    title: { text: titles[plotType].title },
                    xaxis: { title: { text: titles[plotType].xaxis } },
                    yaxis: { title: { text: titles[plotType].yaxis } },
                    dragmode: selectedTab === "IV" && ivSelecting ? "select" : false,
                    autosize: true,
                    margin: { t: 40, l: 50, r: 20, b: 100 },
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    shapes: shapes,  // ここに矩形をセット
                }}
                config={{
                    scrollZoom: true,
                    displayModeBar: false,
                    responsive: true,
                }}
                useResizeHandler
                style={{ width: "100%", height: containerHeight - 100, flexGrow: 1 }}
                onSelected={onSelected}
            />
        );
    };


    return (
        <div style={{ height: containerHeight }} className="w-full flex">
            {/* 左サイドバー: 設定 */}
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
                            className="w-full mt-1 bg-zinc-800 text-white"
                        >
                            {markerSymbols.map((sym) => (
                                <option key={sym} value={sym}>
                                    {sym}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}

                {/* タイトル編集 */}
                <div className="mt-4">
                    <h3 className="font-semibold mb-1">タイトル設定</h3>
                    <input
                        type="text"
                        className="w-full mb-1 px-2 py-1 text-black"
                        value={titles[selectedTab].title}
                        onChange={(e) =>
                            setTitles((prev) => ({
                                ...prev,
                                [selectedTab]: { ...prev[selectedTab], title: e.target.value },
                            }))
                        }
                        placeholder="グラフタイトル"
                    />
                    <input
                        type="text"
                        className="w-full mb-1 px-2 py-1 text-black"
                        value={titles[selectedTab].xaxis}
                        onChange={(e) =>
                            setTitles((prev) => ({
                                ...prev,
                                [selectedTab]: { ...prev[selectedTab], xaxis: e.target.value },
                            }))
                        }
                        placeholder="X軸タイトル"
                    />
                    <input
                        type="text"
                        className="w-full mb-1 px-2 py-1 text-black"
                        value={titles[selectedTab].yaxis}
                        onChange={(e) =>
                            setTitles((prev) => ({
                                ...prev,
                                [selectedTab]: { ...prev[selectedTab], yaxis: e.target.value },
                            }))
                        }
                        placeholder="Y軸タイトル"
                    />
                </div>

                {/* IV範囲選択 */}
                {selectedTab === "IV" && !ivSelecting && (
                    <button
                        onClick={openIVSelectModal}
                        className="bg-blue-600 text-white px-3 py-1 rounded mt-4"
                    >
                        IV範囲選択開始
                    </button>
                )}
                {selectedTab === "IV" && ivSelecting && (
                    <div className="mt-4 space-x-2">
                        {ivSelectedRange && (
                            <button
                                onClick={handleConfirmRange}
                                className="bg-green-600 text-white px-3 py-1 rounded"
                            >
                                範囲確定
                            </button>
                        )}
                        <button
                            onClick={handleCancelRange}
                            className="bg-red-600 text-white px-3 py-1 rounded"
                        >
                            キャンセル
                        </button>
                    </div>
                )}

                {/* IV選択モーダル */}
                {ivModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                        <div className="bg-white rounded p-4 max-w-sm w-full">
                            <h3 className="font-bold mb-2">currentを選択してください</h3>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const selected = formData.get("current");
                                    if (typeof selected === "string") handleIVModalConfirm(selected);
                                }}
                            >
                                {Object.keys(data || {}).map((current) => (
                                    <label
                                        key={current}
                                        className="block mb-1 cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
                                    >
                                        <input
                                            type="radio"
                                            name="current"
                                            value={current}
                                            className="mr-2"
                                            required
                                        />
                                        {current} µA
                                    </label>
                                ))}
                                <div className="flex justify-end mt-4 gap-2">
                                    <button
                                        type="button"
                                        onClick={handleIVModalCancel}
                                        className="bg-gray-400 text-white px-3 py-1 rounded"
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-blue-600 text-white px-3 py-1 rounded"
                                    >
                                        確定
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* 右コンテンツ: グラフ */}
            <div className="flex-grow flex flex-col">
                <TabGroup selectedIndex={tabs.findIndex((t) => t.id === selectedTab)} onChange={(i) => setSelectedTab(tabs[i].id)}>
                    <TabList className="flex border-b border-gray-400">
                        {tabs.map((tab) => (
                            <Tab
                                key={tab.id}
                                className={({ selected }) =>
                                    `px-4 py-2 cursor-pointer ${
                                        selected ? "border-b-2 border-blue-500 font-bold" : "text-gray-400"
                                    }`
                                }
                            >
                                {tab.label}
                            </Tab>
                        ))}
                    </TabList>
                    <TabPanels className="flex-grow">
                        {tabs.map((tab) => (
                            <TabPanel key={tab.id} className="h-full">
                                {renderPlot(createPlotData(tab.xKey, tab.yKey), tab.id)}
                            </TabPanel>
                        ))}
                    </TabPanels>
                </TabGroup>
            </div>
        </div>
    );
};

export default TESAContent;
