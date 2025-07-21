import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { PulseHistogram } from "@/TESGraph/PulseHistgram";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import Pulse2DGraph from "@/TESGraph/Pulse2DGraph.tsx";
import PulsePulse from "@/TESGraph/PulsePulseGraph.tsx";
import ConfigPopover from "@/TESAnalyzer/PulseConfig.tsx";
import {Button} from "@headlessui/react";

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

const PulseGraph = ({ tabId }: { tabId: string }) => {
    const [status, setStatus] = useState<ScreenStatus>("Loading");
    const [pulseData, setPulseData] = useState<PulseData | null>(null);
    const [progress, setProgress] = useState(0);
    const [channelsDone, setChannelsDone] = useState(0);
    const [totalChannels, setTotalChannels] = useState(0);

    const [activeTab, setActiveTab] = useState<TabKey | null>(null);
    const [settings, setSettings] = useState<TabSettings>({});

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

    return (
        <div className="flex flex-col h-full">
            {/* 状態表示 */}
            {status === "Loading" && <div>Loading...</div>}
            {status === "Ready" && <button onClick={startAnalyzeFolder}>解析開始</button>}
            {status === "Analyzing" && <div>解析中: {progress}% | チャンネル: {channelsDone}/{totalChannels}</div>}

            {status === "Finished" && (
                <>
                    {/* タブ（Popover付き） */}
                    <div className="flex border-b justify-center relative">
                        <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                            <Button onClick={resetPreresult}>
                                再計算
                            </Button>
                        </div>
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
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                            <ConfigPopover tabId={tabId} />
                        </div>
                    </div>

                    {/* パネル */}
                    <div className="flex-1 relative overflow-auto" id={"Panel"}>
                        {activeTab === "histogram" && settings.histogram && (
                            <PulseHistogram
                                data={Object.values(pulseData?.[settings.histogram.channel] ?? {}).map(
                                    d => d[settings.histogram!.field as keyof PulseInfo]
                                )}
                                xaxis={settings.histogram.field}
                                yaxis="Count"
                                binNum={settings.histogram.binNum}
                            />
                        )}
                        {activeTab === "pulse" && settings.pulse &&(
                            <PulsePulse
                                tabId={tabId}
                                channel={settings.pulse.channel}
                                pulseIndex={settings.pulse.pulseIndex}
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
                            />
                        )}
                    </div>
                </>
            )}

        </div>
    );
};

export default PulseGraph;
