import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type PulseInfo = {
    Base: number;
    PeakAverage: number;
    PeakIndex: number;
    RiseTime: number;
    DecayTime: number;
};

type PulseData = {
    [ch: string]: { [index: string]: PulseInfo };
};

type ScreenStatus = "Loading" | "Ready" | "Analyzing" | "Finished";

const PulseGraph = ({ tabId }: { tabId: string }) => {
    const [status, setStatus] = useState<ScreenStatus>("Loading");
    const [pulseData, setPulseData] = useState<PulseData | null>(null);

    const [progress, setProgress] = useState<number>(0);
    const [channelsDone, setChannelsDone] = useState<number>(0);
    const [totalChannels, setTotalChannels] = useState<number>(0);
    const [currentChannel, setCurrentChannel] = useState<number | null>(null);

    // 初期ロード処理
    useEffect(() => {
        const init = async () => {
            setStatus("Loading");
            try {
                const res = await invoke<string>("AnalyzePulseFolderPreCommand", { tabName: tabId });
                if (res === "Perfect") {
                    setStatus("Finished");
                    return;
                }else{
                    setStatus("Ready");
                }
            } catch (e) {
                console.error("初期ロードエラー:", e);
                alert("初期ロードエラー\n" + e);
            }
        };
        init();
    }, [tabId]);

    const startAnalyzeFolder = async () => {
        setStatus("Analyzing");
        setProgress(0);
        setChannelsDone(0);
        setTotalChannels(0);
        setCurrentChannel(null);

        let unlistenProgress: (() => void) | null = null;
        let unlistenChannelDone: (() => void) | null = null;

        try {
            // イベント監視登録
            unlistenProgress = await listen<{ progress: number; channel: number }>(
                "pulse-progress",
                (event) => {
                    setProgress(event.payload.progress);
                    setCurrentChannel(event.payload.channel);
                }
            );

            unlistenChannelDone = await listen<{ done: number; total: number; channel: number }>(
                "pulse-channel-done",
                (event) => {
                    setChannelsDone(event.payload.done);
                    setTotalChannels(event.payload.total);
                }
            );

            // Rustの解析コマンド実行
            await invoke("AnalyzePulseFolderCommand", { tabName: tabId }).catch(e=> {alert("Pulseフォルダ解析中にエラーが発生しました。\n" + e);});

            // 終了後に最終データ取得
            const res = await invoke<PulseData>("GetPulseInfoCommand", { tabName: tabId });
            setPulseData(res);
            setStatus("Finished");
        } catch (e) {
            console.error("解析中にエラー:", e);
            alert("Pulseフォルダ解析中にエラーが発生しました。\n" + e);
            setStatus("Ready");
        } finally {
            // クリーンアップ
            if (unlistenProgress) unlistenProgress();
            if (unlistenChannelDone) unlistenChannelDone();
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center text-black text-xl space-y-4">
            {status === "Loading" && (
                <>
                    <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                    <div>Loading...</div>
                </>
            )}

            {status === "Ready" && (
                <>
                    <div>解析を開始できます</div>
                    <button
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        onClick={startAnalyzeFolder}
                    >
                        アナライズ開始
                    </button>
                </>
            )}

            {status === "Analyzing" && (
                <>
                    <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                    <div>現在処理中のチャネル: {currentChannel ?? "-"}</div>
                    <div className="w-64">
                        <div>詳細進捗: {progress}%</div>
                        <progress className="w-full" max={100} value={progress}></progress>
                    </div>
                    <div className="w-64">
                        <div>
                            チャンネル進捗: {channelsDone} / {totalChannels || "-"}
                        </div>
                        <progress className="w-full" max={totalChannels || 1} value={channelsDone}></progress>
                    </div>
                </>
            )}

            {status === "Finished" && (
                <>
                    <div>Finished!</div>
                    <div>チャネル数: {Object.keys(pulseData ?? {}).length}</div>
                </>
            )}
        </div>
    );
};

export default PulseGraph;
