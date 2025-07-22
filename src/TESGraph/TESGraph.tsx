import { forwardRef, useImperativeHandle, useRef, useEffect } from "react";
import Plot from "react-plotly.js";
import type { Layout, PlotData, PlotlyHTMLElement, Shape } from "plotly.js";
import type { MouseEvent } from "react";

export type TESGraphProps = {
    data: Partial<PlotData>[];
    layout?: Partial<Layout>;
    shapes?: Shape[];
    dragMode?: Layout["dragmode"];
    onSelected?: (event: any) => void;
    onClick?: (event: any) => void;
    onRelayout?: (event: any) => void;
    forceRedraw?: () => void;
};

export type ExportImageOptions = {
    format: "png" | "svg";
    width?: number;
    height?: number;
    transparent?: boolean;
};

export interface TESGraphRef {
    exportImage: (opts: ExportImageOptions) => Promise<string>;
    forceRedraw: () => void;
}

const TESGraph = forwardRef<TESGraphRef, TESGraphProps>(
    (
        {
            data,
            layout = {},
            shapes = [],
            dragMode = false,
            onSelected,
            onClick,
            onRelayout,
        },
        ref
    ) => {
        const plotRef = useRef<any>(null);


        // exportImage API
        useImperativeHandle(ref, () => ({
            exportImage: async ({ format, width, height, transparent }) => {
                if (!plotRef.current) return "";
                const plotDiv = plotRef.current;

                const exportWidth = width ?? 800;
                const exportHeight = height ?? 600;

                const originalBg = plotDiv.layout.paper_bgcolor;
                console.log("layoutRange:", plotDiv.layout.xaxis.range, plotDiv.layout.yaxis.range);

                if (transparent) {
                    plotDiv.layout.paper_bgcolor = "rgba(0,0,0,0)";
                }

                const dataUri = await window.Plotly.toImage(plotDiv, {
                    format,
                    width: exportWidth,
                    height: exportHeight,
                });

                if (transparent) {
                    plotDiv.layout.paper_bgcolor = originalBg;
                }

                return dataUri;
            },
            forceRedraw: () => {
                if (plotRef.current) {
                    console.log("forceRedraw called from parent");
                    window.Plotly.Plots.resize(plotRef.current);
                    window.Plotly.redraw(plotRef.current);
                }
            }
        }));

        // useEffectでイベント登録・解除
        useEffect(() => {
            const plotEl = plotRef.current;
            if (!plotEl) return;

            let dragging = false;
            let lastX = 0;
            let lastY = 0;

            const handleMouseDown = (e: MouseEvent) => {
                if (e.button === 2) {
                    e.preventDefault();
                    dragging = true;
                    lastX = e.clientX;
                    lastY = e.clientY;
                    console.log("Mouse down at", lastX, lastY);
                }
            };
            const handleMouseMove = (e: globalThis.MouseEvent) => {
                if (dragging && plotEl) {
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
                        if (isFinite(xScale) && isFinite(yScale)) {
                            window.Plotly.relayout(plotEl, {
                                "xaxis.range[0]": xRange[0] - dx * xScale,
                                "xaxis.range[1]": xRange[1] - dx * xScale,
                                "yaxis.range[0]": yRange[0] + dy * yScale,
                                "yaxis.range[1]": yRange[1] + dy * yScale,
                            });
                        }
                    }
                }
            };

            const handleMouseHover = () => {
                if (plotEl) {
                    const xRange = plotEl.layout?.xaxis?.range;
                    const yRange = plotEl.layout?.yaxis?.range;
                    if (
                        !xRange || !yRange ||
                        xRange.length !== 2 || yRange.length !== 2 ||
                        !isFinite(xRange[0]) || !isFinite(xRange[1]) ||
                        !isFinite(yRange[0]) || !isFinite(yRange[1])
                    ) {
                        console.log("Invalid ranges detected on hover, forcing redraw");
                        window.Plotly.redraw(plotEl);
                    }
                }
            };

            const handleMouseUp = () => {
                dragging = false;
            };

            const handleContextMenu = (e: MouseEvent) => {
                e.preventDefault();
            }

            plotEl.addEventListener("mousedown", handleMouseDown);
            window.addEventListener("mousemove", handleMouseMove);
            plotEl.addEventListener("mousemove", handleMouseHover);
            window.addEventListener("mouseup", handleMouseUp);
            plotEl.addEventListener("contextmenu", handleContextMenu);

            return () => {
                plotEl.removeEventListener("mousedown", handleMouseDown);
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
            };
        }, [data, layout, shapes]); // dataやlayoutが変わったら再登録される

        useEffect(() => {
            if (!plotRef.current) return;
            const resizeObserver = new ResizeObserver(() => {
                window.Plotly.Plots.resize(plotRef.current);
            });
            resizeObserver.observe(plotRef.current.parentElement); // 親要素を監視

            return () => resizeObserver.disconnect();
        }, []);

        const combinedLayout: Partial<Layout> = {
            autosize: true,
            //margin: { t: 50, l: 50, r: 20, b: 50 },
            paper_bgcolor: "#fff",
            plot_bgcolor: "rgba(0,0,0,0)",
            dragmode: dragMode,
            shapes,
            ...layout,
        };

        return (
            <div style={{ width: "100%", height: "100%" }}>
                <Plot
                    ref={(node: any) => {
                        if (node && node.el) {
                            plotRef.current = node.el as PlotlyHTMLElement;
                        }
                    }}
                    data={data}
                    layout={combinedLayout}
                    config={{
                        scrollZoom: true,
                        displayModeBar: false,
                        responsive: true,
                    }}
                    useResizeHandler
                    style={{ width: "100%", height: "100%", flexGrow: 1 }}
                    onSelected={onSelected}
                    onClick={onClick}
                    onRelayout={onRelayout}
                />
            </div>
        );
    }
);

export default TESGraph;
