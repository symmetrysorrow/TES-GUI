import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { TESAData } from "@/TESGraph/TESAGraph.tsx";

const PulseGraph = ({ tabId }: { tabId: string }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [pulseData, setPulseData] = useState<TESAData | null>(null);

    // 詳細進捗
    const [progress, setProgress] = useState<number>(0);
    // 全体のチャンネル数と完了済みチャンネル数
    const [channelsDone, setChannelsDone] = useState<number>(0);
    const [totalChannels, setTotalChannels] = useState<number>(0);
    const [currentChannel, setCurrentChannel] = useState<number | null>(null);

    useEffect(() => {
        let unlistenProgress: (() => void) | null = null;
        let unlistenChannelDone: (() => void) | null = null;

        const startAnalysis = async () => {
            setIsLoading(true);
            setProgress(0);
            setChannelsDone(0);
            setTotalChannels(0);
            setCurrentChannel(null);

            // Rust側から送られてくる進捗イベントをlisten
            unlistenProgress = await listen<{
                progress: number;
                channel: number;
            }>("pulse-progress", (event) => {
                setProgress(event.payload.progress);
                setCurrentChannel(event.payload.channel);
            });

            unlistenChannelDone = await listen<{
                done: number;
                total: number;
                channel: number;
            }>("pulse-channel-done", (event) => {
                setChannelsDone(event.payload.done);
                setTotalChannels(event.payload.total);
            });

            try {
                // Rustのコマンドを呼び出し（解析スタート）
                await invoke("AnalyzePulseFolderCommand", { tabName: tabId });
                console.log("解析完了");

                // 終了後、最終データ取得
                const res = await invoke<TESAData>("GetPulseInfoCommand", { tabName: tabId });
                //setPulseData(res);
            } catch (e) {
                alert("フォルダ解析エラー\n"+e);
            } finally {
                setIsLoading(false);
            }
        };

        startAnalysis();

        // クリーンアップ
        return () => {
            if (unlistenProgress) unlistenProgress();
            if (unlistenChannelDone) unlistenChannelDone();
        };
    }, [tabId]);

    return (
        <div className="h-full flex flex-col">
            {isLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center text-black text-xl space-y-4">
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
                        <progress
                            className="w-full"
                            max={totalChannels || 1} // 0除算防止
                            value={channelsDone}
                        ></progress>
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 flex-col items-center justify-center text-black text-xl">
                    Finished!
                </div>
            )}
        </div>
    );
};

export default PulseGraph;
