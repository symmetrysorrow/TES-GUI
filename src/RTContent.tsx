import React, { useEffect, useRef, useState } from "react";
import { TabContentProps } from "@/FolderTab.tsx";
import Plot from "react-plotly.js";
import {PlotData} from "plotly.js";
import { invoke } from "@tauri-apps/api/core";

interface RTData {
    [current: string]: {
        Temp: number[];
        R_tes: number[];
    };
}

const RTContent: React.FC<TabContentProps> = ({ folderPath,tabId }) => {
    const mounted = useRef(false);
    const [data, setData] = useState<RTData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!mounted.current) {
            console.log("RTContent: 初回作成時にのみフォルダパスを出力", folderPath);
            mounted.current = true;
        } else {
            console.log("RTContent: フォルダパスが変更されました:", folderPath);
        }

        invoke<RTData>("GetRTCommand", { tabName: tabId })
            .then((res) => {
                setData(res);
            })
            .catch((err) => {
                console.error("データ取得エラー:", err);
                setError("データ取得に失敗しました");
            });
    }, [folderPath]);

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
        <div>
            <h2>RT 測定データ</h2>
            <p>選択されたフォルダ: {folderPath}</p>
            {error && <p style={{ color: "red" }}>{error}</p>}
            {data ? (
                <Plot
                    data={plotData}
                    layout={{
                        title: {text: 'A Fancy Plot'},
                        dragmode:"pan",
                        //yaxis: { title: "抵抗 (Ω)" },
                        autosize: true,
                    }}
                    style={{ width: "100%", height: "500px" }}
                    config={{
                        scrollZoom: true,
                        doubleClick: "reset",
                        displayModeBar: true,

                    }}
                    //useResizeHandler={true}
                />
            ) : (
                <p>データを読み込んでいます...</p>
            )}
        </div>
    );
};

export default React.memo(RTContent);
