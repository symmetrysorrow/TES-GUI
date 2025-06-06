import { useEffect, useRef, useState } from "react";
import Plot from "react-plotly.js";
import { PlotData, PlotlyHTMLElement } from "plotly.js";
import { invoke } from "@tauri-apps/api/core";
import {Tab, TabGroup, TabList,TabPanels,TabPanel} from "@headlessui/react";

interface RTData {
    [current: string]: {
        Temp: number[];
        R_tes: number[];
        Alpha: number[];
        BiasPoint: number[];
    };
}

const RTContent = ({ folderPath, tabId }: any) => {
    const plotRef = useRef<PlotlyHTMLElement | null>(null);
    //const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerHeight, setContainerHeight] = useState<number>(window.innerHeight);

    const [data, setData] = useState<RTData | null>(null);
    useEffect( () => {
        invoke<RTData>("GetRTCommand", { tabName: tabId })
            .then((res) => setData(res))
            .catch((err) => {
                console.error("データ取得エラー:", err);
                alert("データ取得に失敗しました");
            });
    }, []);

    // Plot リサイズを強制管理
    useEffect(() => {
        const resize = () => {
            const headerHeight = 80; // 例えば TopToolbar の高さなど
            const margin = 10; // パディングなどあれば
            setContainerHeight(window.innerHeight - headerHeight - margin);
        };
        resize(); // 初期実行
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, []);

    useEffect(() => {
        const plotEl = plotRef.current;
        if (!plotEl) return;

        let isRightDragging = false;
        let lastX = 0;
        let lastY = 0;

        const handleMouseDown = (e: MouseEvent) => {
            if (e.button === 2) {
                e.preventDefault();
                isRightDragging = true;
                lastX = e.clientX;
                lastY = e.clientY;
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (isRightDragging && plotEl) {
                const dx = e.clientX - lastX;
                const dy = e.clientY - lastY;
                lastX = e.clientX;
                lastY = e.clientY;

                const xRange = plotEl.layout.xaxis.range;
                const yRange = plotEl.layout.yaxis.range;
                const width = plotEl.clientWidth;
                const height = plotEl.clientHeight;

                if (xRange && yRange && width > 0 && height > 0) {
                    const xScale = (xRange[1] - xRange[0]) / width;
                    const yScale = (yRange[1] - yRange[0]) / height;

                    window.Plotly.relayout(plotEl, {
                        "xaxis.range[0]": xRange[0] - dx * xScale,
                        "xaxis.range[1]": xRange[1] - dx * xScale,
                        "yaxis.range[0]": yRange[0] + dy * yScale,
                        "yaxis.range[1]": yRange[1] + dy * yScale,
                    });
                }
            }
        };

        const handleMouseUp = () => {
            isRightDragging = false;
        };

        const handleContextMenu = (e: MouseEvent) => e.preventDefault();

        plotEl.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        plotEl.addEventListener("contextmenu", handleContextMenu);

        return () => {
            plotEl.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    const RTPlotData: Partial<PlotData>[] = data
        ? Object.entries(data).map(([current, { Temp, R_tes }]) => ({
            x: Temp,
            y: R_tes,
            type: "scatter",
            mode: "lines+markers",
            name: `${current} µA`,
        }))
        : [];

    const ABPlotData: Partial<PlotData>[] = data
        ? Object.entries(data).map(([current, { BiasPoint, Alpha }]) => ({
            x: BiasPoint,
            y: Alpha,
            type: "scatter",
            mode: "lines+markers",
            name: `${current} µA`,
        }))
        : [];

    return (
        <div
            style={{ height: containerHeight, width: "100%" }}
            className="w-full flex flex-col"
        >
            <TabGroup className="flex flex-1 flex-col w-full mx-auto text-white" id="rt-tabs-container">
                <TabList className="flex p-1 bg-zinc-800 rounded-full w-fit mx-auto">
                    {["RT", "Alpha"].map((label) => (
                        <Tab
                            key={label}
                            className={({ selected }) =>
                                `px-2 py-1 rounded-full text-sm font-medium transition-colors duration-200
                            ${selected ? "text-zinc-900 shadow" : "text-white hover:bg-zinc-700"}`
                            }
                        >
                            {label}
                        </Tab>
                    ))}
                </TabList>

                <TabPanels className="w-full flex-grow flex flex-col h-full min-h-0">
                    <TabPanel className="flex-grow flex min-h-0">
                        <Plot
                            ref={(node: any) => {
                                if (node?.el) {
                                    plotRef.current = node.el as Plotly.PlotlyHTMLElement;
                                }
                            }}
                            data={RTPlotData}
                            layout={{
                                dragmode: false,
                                autosize: true,
                                margin: { t: 20, l: 40, r: 20, b: 40 },
                            }}
                            config={{
                                scrollZoom: true,
                                displayModeBar: false,
                                responsive: true,
                            }}
                            useResizeHandler={true}
                            style={{ width: "100%", height: "100%", flexGrow: 1 }}
                        />
                    </TabPanel>
                    <TabPanel className="flex-grow flex min-h-0">
                        <Plot
                            ref={(node: any) => {
                                if (node?.el) {
                                    plotRef.current = node.el as Plotly.PlotlyHTMLElement;
                                }
                            }}
                            data={ABPlotData}
                            layout={{
                                dragmode: false,
                                autosize: true,
                                margin: { t: 20, l: 40, r: 20, b: 40 },
                            }}
                            config={{
                                scrollZoom: true,
                                displayModeBar: false,
                                responsive: true,
                            }}
                            useResizeHandler={true}
                            style={{ width: "100%", height: "100%", flexGrow: 1 }}
                        />
                    </TabPanel>
                </TabPanels>
            </TabGroup>
        </div>

    );
};

export default RTContent;
