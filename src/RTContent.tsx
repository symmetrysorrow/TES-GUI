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

const RTContent = ({ folderPath, tabId }: { folderPath: string; tabId: string }) => {
    const plotRef = useRef<PlotlyHTMLElement | null>(null);
    const [containerHeight, setContainerHeight] = useState<number>(window.innerHeight);
    const [data, setData] = useState<RTData | null>(null);

    useEffect(() => {
        invoke<RTData>("GetRTCommand", { tabName: tabId })
            .then(setData)
            .catch((err) => {
                console.error("データ取得エラー:", err);
                alert("データ取得に失敗しました");
            });
    }, [tabId]);

    useEffect(() => {
        const resize = () => setContainerHeight(window.innerHeight - HEADER_HEIGHT - MARGIN_BOTTOM);
        resize();
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, []);

    const setupRightClickDrag = useCallback(() => {
        const el = plotRef.current;
        if (!el) return;

        let dragging = false, lastX = 0, lastY = 0;

        const onDown = (e: MouseEvent) => {
            if (e.button === 2) {
                e.preventDefault();
                dragging = true;
                [lastX, lastY] = [e.clientX, e.clientY];
            }
        };

        const onMove = (e: MouseEvent) => {
            if (!dragging || !el) return;
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;

            const { range: xRange } = el.layout.xaxis || {};
            const { range: yRange } = el.layout.yaxis || {};
            const { clientWidth: w, clientHeight: h } = el;

            if (xRange && yRange && w && h) {
                const xScale = (xRange[1] - xRange[0]) / w;
                const yScale = (yRange[1] - yRange[0]) / h;

                window.Plotly.relayout(el, {
                    "xaxis.range[0]": xRange[0] - dx * xScale,
                    "xaxis.range[1]": xRange[1] - dx * xScale,
                    "yaxis.range[0]": yRange[0] + dy * yScale,
                    "yaxis.range[1]": yRange[1] + dy * yScale,
                });
            }
        };

        const cleanup = () => (dragging = false);
        const blockContext = (e: MouseEvent) => e.preventDefault();

        el.addEventListener("mousedown", onDown);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", cleanup);
        el.addEventListener("contextmenu", blockContext);

        return () => {
            el.removeEventListener("mousedown", onDown);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", cleanup);
            el.removeEventListener("contextmenu", blockContext);
        };
    }, []);

    useEffect(() => {
        const clean = setupRightClickDrag();
        return () => clean?.();
    }, [setupRightClickDrag]);

    const createPlotData = useCallback(
        (xKey: keyof RTData[string], yKey: keyof RTData[string]): Partial<PlotData>[] =>
            data
                ? Object.entries(data).map(([current, entry]): Partial<PlotData> => ({
                    x: entry[xKey],
                    y: entry[yKey],
                    type: "scatter",
                    mode: "lines+markers",
                    name: `${current} µA`,
                }))
                : [],
        [data]
    );


    const renderPlot = (plotData: Partial<PlotData>[]) => (
        <Plot
            ref={(node: any) => {
                if (node?.el) plotRef.current = node.el as PlotlyHTMLElement;
            }}
            data={plotData}
            layout={{
                dragmode: false,
                autosize: true,
                margin: { t: 20, l: 40, r: 20, b: 40 },
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(0,0,0,0)",
            }}
            config={{
                scrollZoom: true,
                displayModeBar: false,
                responsive: true,
            }}
            useResizeHandler
            style={{ width: "100%", height: "100%", flexGrow: 1 }}
        />
    );

    return (
        <div style={{ height: containerHeight }} className="w-full flex flex-col">
            <TabGroup className="flex flex-1 flex-col w-full mx-auto text-white">
                <TabList className="flex p-1 bg-zinc-800 rounded-full w-fit mx-auto">
                    {["RT", "Alpha"].map((label) => (
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
                        {renderPlot(createPlotData("Temp", "R_tes"))}
                    </TabPanel>
                    <TabPanel className="flex-grow flex min-h-0">
                        {renderPlot(createPlotData("BiasPoint", "Alpha"))}
                    </TabPanel>
                </TabPanels>
            </TabGroup>
        </div>
    );
};

export default RTContent;
