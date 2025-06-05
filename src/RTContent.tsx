import { useEffect, useRef, useState } from "react";
import Plot from "react-plotly.js";
import {PlotData} from "plotly.js";
import { PlotlyHTMLElement } from "plotly.js";
import {invoke} from "@tauri-apps/api/core";

interface RTData {
    [current: string]: {
        Temp: number[];
        R_tes: number[];
    };
}

const RTContent = ({ folderPath, tabId }: any) => {
    const plotRef = useRef<PlotlyHTMLElement | null>(null);


    const [data, setData] = useState<RTData | null>(null);
    useEffect(() => {
        console.log("RTContent useEffect called with folderPath:", folderPath, "tabId:", tabId);

        invoke<RTData>("GetRTCommand", { tabName: tabId })
            .then((res) => {
                setData(res);
            })
            .catch((err) => {
                console.error("データ取得エラー:", err);
                alert("データ取得に失敗しました");
            });
    }, []);

    useEffect(() => {
        const plotEl = plotRef.current;
        if (!plotEl) return;

        let isRightDragging = false;
        let lastX = 0;
        let lastY = 0;

        const handleMouseDown = (e: MouseEvent) => {
            if (e.button === 2) { // 中央ボタン（ミドルクリック）
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
                    const xScale = (xRange[1] - xRange[0]) / width;   // [実座標]/[画素] = 1pxあたりの移動量
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

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault(); // 中央クリックのコンテキストメニューを無効化
        }

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

    const plotData: Partial<PlotData>[] = data
        ? Object.entries(data).map(([current, { Temp, R_tes }]) => ({
            x: Temp,
            y: R_tes,
            type: "scatter",
            mode: "lines+markers",
            name: `${current} µA`,
        }))
        : [];

    return (
        <div className="flex-grow min-height: 0">
            <Plot
                ref={(node: any) => {
                    if (node && node.el) {
                        plotRef.current = node.el as Plotly.PlotlyHTMLElement;
                    }
                }}
                data={plotData}
                layout={{
                    dragmode: false, // 左クリックドラッグ無効
                    autosize: true,  // 自動サイズ調整
                }}
                config={{
                    scrollZoom: true,
                    displayModeBar: false,
                }}
                useResizeHandler={true} // ← これが重要！
                style={{ width: "auto", height: "100%" }} // フルサイズ
                className="max-h-[100%] flex-grow"
            />
        </div>
    );
};

export default RTContent;
