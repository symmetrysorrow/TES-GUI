import { useEffect, useState,useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { PulseHistogram } from "@/TESGraph/PulseHistgram";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import Pulse2DGraph from "@/TESGraph/Pulse2DGraph.tsx";
import PulsePulse from "@/TESGraph/PulsePulseGraph.tsx";
import PulseConfig from "@/TESAnalyzer/PulseConfig.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Printer, RefreshCw, Settings} from "lucide-react";
import {Progress} from "@/components/ui/progress.tsx";
import { TESGraphRef } from "@/TESGraph/TESGraph";
import PrintModal from "@/TESGraph/TESGraphModal.tsx";

// 型定義はそのままでOK
type PulseInfo = { Base: number; PeakAverage: number; PeakIndex: number; RiseTime: number; DecayTime: number; };
export type PulseData = { [ch: string]: { [index: string]: PulseInfo } };
type ScreenStatus = "Loading" | "Ready" | "Analyzing" | "Finished";
type TabKey = "pulse" | "histogram" | "2d";
type TabSettings = {
    histogram?: { channel: string; field: string; binNum: number };
    pulse?: { channel: string; pulseIndex: string };
    scatter2d?: { xChannel: string; xField: string; yChannel: string; yField: string; };
};

export const PulseGraph = ({ tabId }: { tabId: string }) => {
    const graphRef = useRef<TESGraphRef>(null);

    const [status, setStatus] = useState<ScreenStatus>("Loading");
    const [pulseData, setPulseData] = useState<PulseData | null>(null);
    const [progress, setProgress] = useState(0);
    const [channelsDone, setChannelsDone] = useState(0);
    const [totalChannels, setTotalChannels] = useState(0);

    const [activeTab, setActiveTab] = useState<TabKey | null>(null);
    const [settings, setSettings] = useState<TabSettings>({});

    const [pulseConfigVersion, setPulseConfigVersion] = useState(0);

    const [printModalOpen, setPrintModalOpen] = useState(false);

    // pulseData がない場合は空配列
    const channels = pulseData ? Object.keys(pulseData) : [];
    const fields: (keyof PulseInfo)[] = ["Base", "PeakAverage", "PeakIndex", "RiseTime", "DecayTime"];

    const tabs = [
        { key: "pulse", label: "波形" },
        { key: "histogram", label: "ヒストグラム" },
        { key: "2d", label: "2D散布図" },
    ];

    // 初期ロード
    useEffect(() => {
        const init = async () => {
            setStatus("Loading");
            try {
                const res = await invoke<string>("AnalyzePulseFolderPreCommand", { tabName: tabId });
                if (res === "Perfect") {
                    const data = await invoke<PulseData>("GetPulseInfoCommand", { tabName: tabId });
                    setPulseData(data);
                    setStatus("Finished");
                } else {
                    setStatus("Ready");
                }
            } catch (e) {
                console.error(e);
                alert("初期ロードエラー\n" + e);
            }
        };
        init();


    }, [tabId]);

    const resetPreresult = async () => {
        try {
            await invoke("ResetPreResultCommand", { tabName: tabId });
            setPulseData(null);
            setActiveTab(null);
            setSettings({});
            await startAnalyzeFolder();
        } catch (e) {
            console.error(e);
            alert("リセットエラー\n" + e);
        }
    }

    // 解析開始
    const startAnalyzeFolder = async () => {
        setStatus("Analyzing");
        setProgress(0);
        setChannelsDone(0);
        setTotalChannels(0);
        let unlistenProgress: (() => void) | null = null;
        let unlistenChannelDone: (() => void) | null = null;
        try {
            unlistenProgress = await listen<{ progress: number; channel: number }>(
                "pulse-progress", e => { setProgress(e.payload.progress);  }
            );
            unlistenChannelDone = await listen<{ done: number; total: number; channel: number }>(
                "pulse-channel-done", e => { setChannelsDone(e.payload.done); setTotalChannels(e.payload.total); }
            );
            await invoke("AnalyzePulseFolderCommand", { tabName: tabId });
            const data = await invoke<PulseData>("GetPulseInfoCommand", { tabName: tabId });
            setPulseData(data);
            setStatus("Finished");
        } catch (e) {
            console.error(e);
            alert("解析エラー\n" + e);
            setStatus("Ready");
        } finally {
            if (unlistenProgress) unlistenProgress();
            if (unlistenChannelDone) unlistenChannelDone();
        }
    };

    useEffect(() => {
        if (pulseData) {
            const firstChannel = Object.keys(pulseData)[0];
            const firstPulseIndex = pulseData[firstChannel] ? Object.keys(pulseData[firstChannel])[0] : "";

            setSettings({
                pulse: {
                    channel: firstChannel,
                    pulseIndex: firstPulseIndex
                },
                histogram: {
                    channel: firstChannel,
                    field: "Base",
                    binNum: 30
                },
                scatter2d: {
                    xChannel: firstChannel,
                    xField: "Base",
                    yChannel: firstChannel,
                    yField: "PeakAverage"
                }
            });

            // 初期表示したいタブも設定（例: pulse）
            setActiveTab("pulse");
        }
    }, [pulseData]);


    return (
        <div className="flex flex-col h-full">
            <PrintModal
                isOpen={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                graphRef={graphRef}
            />
            {/* 状態表示 */}
            {status === "Loading" &&
                (<div className="fixed inset-0 flex items-center justify-center bg-white/70 z-50">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid mb-4"></div>
                        <div className="text-lg font-semibold text-gray-700">Loading...</div>
                    </div>
                </div>)
            }
            {status === "Ready" && (
                <div className="flex flex-col md:flex-row items-center justify-center gap-6 p-6">
                    {/* 解析開始ボタンカード */}
                    <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center justify-center">
                        <h2 className="text-lg font-semibold mb-4">解析の開始</h2>
                        <Button
                            onClick={startAnalyzeFolder}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-full shadow hover:from-blue-600 hover:to-blue-700 transition"
                        >
                            解析開始
                        </Button>
                    </div>

                    {/* 設定カード */}
                    <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-md overflow-auto">
                        <h2 className="text-lg font-semibold mb-4">解析設定</h2>
                        <PulseConfig tabId={tabId} onConfigChange={() => setPulseConfigVersion(v => v + 1)} />
                    </div>
                </div>

            )}
            {status === "Analyzing" && (

                <div className="fixed inset-0 flex items-center justify-center bg-white/70 z-50">
                    <div className="flex flex-col items-center bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4">
                        {/* ローディングスピナー */}
                        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>

                        {/* タイトル */}
                        <div className="text-xl font-semibold text-gray-800">解析中...</div>

                        {/* パルス進捗 */}
                        <div className="w-full">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>パルス: {progress}%</span>
                            </div>
                            <Progress value={progress} />
                        </div>

                        {/* チャンネル進捗 */}
                        <div className="w-full">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>チャンネル: {channelsDone}/{totalChannels}</span>
                            </div>
                            <Progress value={totalChannels ? (channelsDone / totalChannels) * 100 : 0} />
                        </div>
                    </div>
                </div>

            )}

            {status === "Finished" && (
                <>
                    {/* タブ（Popover付き） */}
                    <div className="flex border-b justify-center relative">

                        {/* タブグループ（中央寄せ） */}
                        <div className="flex space-x-2">
                            {tabs.map(tab => {
                            const isActive = activeTab === tab.key;
                            return (
                                <Popover key={tab.key}>
                                    <PopoverTrigger asChild>
                                        <button className={`relative justify-center px-4 py-2 text-sm font-semibold ${
                                                isActive ? "text-black" : "text-gray-500"
                                            }`}
                                        >
                                            {tab.label}
                                            {isActive && (
                                                <span className="absolute bottom-0 justify-center left-0 w-full h-0.5 bg-blue-500" />
                                            )}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64">
                                        {tab.key === "histogram" && (
                                            <>
                                                <label className="block mb-1 text-sm">チャンネル:</label>
                                                <select
                                                    value={settings.histogram?.channel ?? channels[0]}
                                                    onChange={e =>
                                                        setSettings(prev => ({
                                                            ...prev,
                                                            histogram: {
                                                                ...(prev.histogram ?? {}),
                                                                channel: e.target.value,
                                                                field: prev.histogram?.field ?? fields[0],
                                                                binNum: prev.histogram?.binNum ?? 30
                                                            }
                                                        }))
                                                    }
                                                    className="w-full border rounded px-2 py-1 mb-2"
                                                >
                                                    {channels.map(ch => <option key={ch}>{ch}</option>)}
                                                </select>

                                                <label className="block mb-1 text-sm">項目:</label>
                                                <select
                                                    value={settings.histogram?.field ?? fields[0]}
                                                    onChange={e =>
                                                        setSettings(prev => ({
                                                            ...prev,
                                                            histogram: {
                                                                ...(prev.histogram ?? {}),
                                                                channel: prev.histogram?.channel ?? channels[0],
                                                                field: e.target.value,
                                                                binNum: prev.histogram?.binNum ?? 30
                                                            }
                                                        }))
                                                    }
                                                    className="w-full border rounded px-2 py-1 mb-2"
                                                >
                                                    {fields.map(f => <option key={f}>{f}</option>)}
                                                </select>

                                                <label className="block mb-1 text-sm">ビン数:</label>
                                                <input
                                                    type="number"
                                                    value={settings.histogram?.binNum ?? 30}
                                                    onChange={e =>
                                                        setSettings(prev => ({
                                                            ...prev,
                                                            histogram: {
                                                                ...(prev.histogram ?? {}),
                                                                channel: prev.histogram?.channel ?? channels[0],
                                                                field: prev.histogram?.field ?? fields[0],
                                                                binNum: Number(e.target.value)
                                                            }
                                                        }))
                                                    }
                                                    className="w-full border rounded px-2 py-1 mb-2"
                                                />

                                                <div className="flex justify-end mt-2">
                                                    <button
                                                        onClick={() => setActiveTab(tab.key as TabKey)}
                                                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                                    >
                                                        グラフ作成
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                        {tab.key === "2d" && (
                                            <>
                                                <label className="block mb-1 text-sm">Xチャンネル:</label>
                                                <select
                                                    value={settings.scatter2d?.xChannel ?? channels[0]}
                                                    onChange={e =>
                                                        setSettings(prev => ({
                                                            ...prev,
                                                            scatter2d: {
                                                                ...(prev.scatter2d ?? {}),
                                                                xChannel: e.target.value,
                                                                xField: prev.scatter2d?.xField ?? fields[0],
                                                                yChannel: prev.scatter2d?.yChannel ?? channels[0],
                                                                yField: prev.scatter2d?.yField ?? fields[0],
                                                            }
                                                        }))
                                                    }
                                                    className="w-full border rounded px-2 py-1 mb-2"
                                                >
                                                    {channels.map(ch => <option key={ch}>{ch}</option>)}
                                                </select>

                                                <label className="block mb-1 text-sm">x項目:</label>
                                                <select
                                                    value={settings.scatter2d?.xField ?? fields[0]}
                                                    onChange={e =>
                                                        setSettings(prev => ({
                                                            ...prev,
                                                            scatter2d: {
                                                                ...(prev.scatter2d ?? {}),
                                                                xChannel: prev.scatter2d?.xChannel ?? channels[0],
                                                                xField: e.target.value,
                                                                yChannel: prev.scatter2d?.yChannel ?? channels[0],
                                                                yField: prev.scatter2d?.yField ?? fields[0],
                                                            }
                                                        }))
                                                    }
                                                    className="w-full border rounded px-2 py-1 mb-2"
                                                >
                                                    {fields.map(f => <option key={f}>{f}</option>)}
                                                </select>

                                                <label className="block mb-1 text-sm">Yチャンネル:</label>
                                                <select
                                                    value={settings.scatter2d?.yChannel ?? channels[0]}
                                                    onChange={e =>
                                                        setSettings(prev => ({
                                                            ...prev,
                                                            scatter2d: {
                                                                ...(prev.scatter2d ?? {}),
                                                                xChannel: prev.scatter2d?.xChannel ?? channels[0],
                                                                xField: prev.scatter2d?.xField ?? fields[0],
                                                                yChannel: e.target.value,
                                                                yField: prev.scatter2d?.yField ?? fields[0],
                                                            }
                                                        }))
                                                    }
                                                    className="w-full border rounded px-2 py-1 mb-2"
                                                >
                                                    {channels.map(ch => <option key={ch}>{ch}</option>)}
                                                </select>

                                                <label className="block mb-1 text-sm">y項目:</label>
                                                <select
                                                    value={settings.scatter2d?.yField ?? fields[0]}
                                                    onChange={e =>
                                                        setSettings(prev => ({
                                                            ...prev,
                                                            scatter2d: {
                                                                ...(prev.scatter2d ?? {}),
                                                                xChannel: prev.scatter2d?.xChannel ?? channels[0],
                                                                xField: prev.scatter2d?.xField ?? fields[0],
                                                                yChannel: prev.scatter2d?.yChannel ?? channels[0],
                                                                yField: e.target.value,
                                                            }
                                                        }))
                                                    }
                                                    className="w-full border rounded px-2 py-1 mb-2"
                                                >
                                                    {fields.map(f => <option key={f}>{f}</option>)}
                                                </select>

                                                <div className="flex justify-end mt-2">
                                                    <button
                                                        onClick={() => setActiveTab(tab.key as TabKey)}
                                                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                                    >
                                                        グラフ作成
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        {tab.key === "pulse" && (
                                            <>
                                                <label className="block mb-1 text-sm">チャンネル:</label>
                                                <select
                                                    value={settings.pulse?.channel ?? channels[0]}
                                                    onChange={e =>
                                                        setSettings(prev => ({
                                                            ...prev,
                                                            pulse: {
                                                                ...(prev.pulse ?? {}),
                                                                channel: e.target.value,
                                                                pulseIndex: prev.pulse?.pulseIndex ??
                                                                    (pulseData?.[e.target.value] ? Object.keys(pulseData[e.target.value])[0] : "")
                                                            }
                                                        }))
                                                    }
                                                    className="w-full border rounded px-2 py-1 mb-2"
                                                >
                                                    {channels.map(ch => <option key={ch}>{ch}</option>)}
                                                </select>

                                                <label className="block mb-1 text-sm">pulseIndex:</label>
                                                <select
                                                    value={settings.pulse?.pulseIndex ??
                                                        (pulseData?.[settings.pulse?.channel ?? channels[0]]
                                                            ? Object.keys(pulseData[settings.pulse?.channel ?? channels[0]])[0]
                                                            : "")
                                                    }
                                                    onChange={e =>
                                                        setSettings(prev => ({
                                                            ...prev,
                                                            pulse: {
                                                                ...(prev.pulse ?? {}),
                                                                channel: prev.pulse?.channel ?? channels[0],
                                                                pulseIndex: e.target.value
                                                            }
                                                        }))
                                                    }
                                                    className="w-full border rounded px-2 py-1 mb-2"
                                                >
                                                    {
                                                        (pulseData?.[settings.pulse?.channel ?? channels[0]]
                                                                ? Object.keys(pulseData[settings.pulse?.channel ?? channels[0]])
                                                                : []
                                                        ).map(idx => <option key={idx}>{idx}</option>)
                                                    }
                                                </select>

                                                <div className="flex justify-end mt-2">
                                                    <button
                                                        onClick={() => setActiveTab(tab.key as TabKey)}
                                                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                                    >
                                                        グラフ作成
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                    </PopoverContent>

                                </Popover>
                            );
                        })}
                        </div>
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                            <button
                                onClick={() => setPrintModalOpen(true)}
                            >
                                <Printer size={20} />
                            </button>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <RefreshCw />
                                </PopoverTrigger>
                                <PopoverContent>
                                    <div className="flex flex-col space-y-1">
                                        <Button variant="outline" onClick={resetPreresult}>再計算</Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Settings />
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                    <PulseConfig tabId={tabId} onConfigChange={() => setPulseConfigVersion(v => v + 1)}/>
                                </PopoverContent>
                            </Popover>

                        </div>

                    </div>

                    {/* パネル */}
                    <div className="flex-1 relative overflow-auto" id={"Panel"}>
                        {activeTab === "histogram" && settings.histogram && (
                            <div>
                                <span>some</span>
                            <PulseHistogram
                                data={Object.values(pulseData?.[settings.histogram.channel] ?? {}).map(
                                    d => d[settings.histogram!.field as keyof PulseInfo]
                                )}
                                xaxis={settings.histogram.field}
                                yaxis="Count"
                                binNum={settings.histogram.binNum}
                                graphRef={graphRef}
                            />

                            </div>
                        )}
                        {activeTab === "pulse" && settings.pulse &&(
                            <PulsePulse
                                tabId={tabId}
                                channel={settings.pulse.channel}
                                pulseIndex={settings.pulse.pulseIndex}
                                pulseConfigVer={pulseConfigVersion}
                                graphRef={graphRef}
                            />
                        )}
                        {activeTab === "2d" && settings.scatter2d&&(
                            <Pulse2DGraph
                                xdata={Object.values(pulseData?.[settings.scatter2d.xChannel] ?? {}).map(
                                    d => d[settings.scatter2d!.xField as keyof PulseInfo]
                                )}
                                ydata={Object.values(pulseData?.[settings.scatter2d.yChannel] ?? {}).map(
                                    d => d[settings.scatter2d!.yField as keyof PulseInfo]
                                )}
                                xaxis={settings.scatter2d.xField}
                                yaxis={settings.scatter2d.yField}
                                graphRef={graphRef}
                            />
                        )}
                    </div>
                </>
            )}

        </div>
    );
};


