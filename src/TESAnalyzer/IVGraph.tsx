import  {useEffect, useRef, useState} from "react";
import TESAGraph, { TESAData } from "@/TESGraph/TESAGraph.tsx";
import {invoke} from "@tauri-apps/api/core";
import {TESGraphRef} from "@/TESGraph/TESGraph.tsx";
import {Shape} from "plotly.js"; // TESAGraph本体のimport想定
import {Button,Description, Dialog, DialogPanel, DialogTitle} from '@headlessui/react'

const ivTabs = [
    { id: "IV", label: "IV", xKey: "I_bias", yKey: "V_out", defaultTitle: "IV Title", defaultXaxis: "I_bias", defaultYaxis: "V_out" },
    { id: "IR", label: "IR", xKey: "I_bias", yKey: "R_tes", defaultTitle: "IR Title", defaultXaxis: "I_bias", defaultYaxis: "R_tes" },
];

const IVGraph = ({ tabId }: { tabId: string }) => {
    const [ivSelecting, setIVSelecting] = useState(false);
    const [ivSelectedRange, setIVSelectedRange] = useState<[number, number] | null>(null);
    const [ivSelectedKeyValue, setIVSelectedKeyValue] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [ivModalOpen, setIVModalOpen] = useState(false);

    const [isLoading, setIsLoading] = useState(true);

    const [IVData, setIVData] = useState<TESAData | null>(null);
    //const safeData: TESAData = IVData ?? defaultData;

    const graphRef = useRef<TESGraphRef>(null);

    useEffect(() => {
        setIsLoading(true);
        console.log("Now Loading")
        invoke("AnalyzeIVFolderCommand", { tabName: tabId })
            .then(async () => {
                invoke<TESAData>("GetIVCommand", { tabName: tabId })
                    .then(async (res) => {
                        setIVData(res);
                        setIsLoading(false);
                    })
                    .catch((e) => console.error(e));
            })
    }, [tabId]);

    // モーダルの確定処理
    const handleIVModalConfirm = (selectedKey: string) => {
        setIVSelectedKeyValue(selectedKey);
        setIVSelecting(true);
        setIVSelectedRange(null);
        setIVModalOpen(false);
    };

    // モーダルのキャンセル処理
    const handleIVModalCancel = () => {
        setIVModalOpen(false);
    };

    // 範囲選択イベントハンドラ
    const handleSelected = (event: any) => {
        if (event?.range?.x) {
            setIVSelectedRange([event.range.x[0], event.range.x[1]]);
        }
    };

    // 範囲確定ボタン
    const confirmIVSelect = () => {
        if (ivSelectedRange && ivSelectedKeyValue) {
            console.log("Selected Range:", {
                keyValue: ivSelectedKeyValue,
                range: ivSelectedRange,
            });
            invoke("CalibrateSingleJumpCommand", {tabName:tabId,temp:Number(ivSelectedKeyValue), calibStartIbias:Number(ivSelectedRange[0]), calibEndIbias:Number(ivSelectedRange[1])})
                .then(() => {
                    invoke<TESAData>("GetIVCommand", { tabName: tabId })
                        .then((res) => {
                            setIVData(res);
                        })
                        .catch((e) => console.error(e));
                })
                .catch((e) => {
                    console.error("キャリブレーション中にエラーが発生しました:", e);
                    alert("キャリブレーション中にエラーが発生しました。\n" + e);
                });
        }
        // IV選択モード解除＆全表示復帰
        setIVSelecting(false);
        setIVSelectedKeyValue(null);
        setIVSelectedRange(null);
    };

    const cancelIVSelect = () => {
        setIVSelecting(false);
        setIVSelectedKeyValue(null);
        setIVSelectedRange(null);
    };

    const shapes: Shape[] = (ivSelecting && ivSelectedRange)
        ? [{
            type: "rect",
            xref: "x",
            yref: "paper",
            x0: ivSelectedRange[0],
            x1: ivSelectedRange[1],
            y0: 0,
            y1: 1,
            fillcolor: "rgba(0, 123, 255, 0.3)",
            opacity: 0.5,
            line: { width: 0 },
            layer: "below",
        } as Shape]
        : [];

    // TESAGraphへのprops
    const graphProps = {
        data: IVData??{},
        tabs: ivTabs,
        unitLabel: "microA",
        sidebarOpen,
        onToggleSidebar: () => setSidebarOpen((prev) => !prev),
        dragMode: ivSelecting ? "select" as const : undefined,
        onSelected: ivSelecting ? handleSelected : undefined,
        shapes: shapes,
    };

    // @ts-ignore
    return (
        <div className="h-full flex flex-col">
            {isLoading ? (
                // Loading 表示
                <div className="flex flex-1 flex-col items-center justify-center text-black text-xl">
                    <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
                    Loading...
                </div>
            ) : (
                <>
                    {/* モーダル */}
                    <Dialog
                        open={ivModalOpen}
                        as="div"
                        onClose={() => setIVModalOpen(false)}
                        className="z-10 focus:outline-none"
                    >
                        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm" aria-hidden="true" />
                        <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
                            <DialogPanel className="w-full max-w-md rounded-xl bg-white/5 p-6 backdrop-blur-2xl duration-300 ease-out data-closed:scale-95 data-closed:opacity-0">
                                <DialogTitle className="text-base/7 font-medium text-white mb-2">
                                    温度を選択してください
                                </DialogTitle>
                                <Description className="text-sm/6 text-white/60 mb-4">
                                    使用するカーブ（温度）を1つ選んでください。
                                </Description>

                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        const selected = formData.get("current");
                                        if (typeof selected === "string") handleIVModalConfirm(selected);
                                    }}
                                >
                                    {Object.keys(IVData).map((current) => (
                                        <label
                                            key={current}
                                            className="block mb-1 cursor-pointer hover:bg-white/10 rounded px-2 py-1 text-white"
                                        >
                                            <input
                                                type="radio"
                                                name="current"
                                                value={current}
                                                className="mr-2"
                                                required
                                            />
                                            {current} mK
                                        </label>
                                    ))}
                                    <div className="flex justify-end mt-4 gap-2">
                                        <Button
                                            type="button"
                                            onClick={handleIVModalCancel}
                                            className="bg-gray-400 text-white px-3 py-1.5 rounded-md hover:bg-gray-500"
                                        >
                                            キャンセル
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700"
                                        >
                                            確定
                                        </Button>
                                    </div>
                                </form>
                            </DialogPanel>
                        </div>
                    </Dialog>

                    {/* TESAGraph */}
                    <div className="flex-1 min-h-0">
                        <TESAGraph
                            ref={graphRef}
                            {...graphProps}
                            visibleKeys={
                                ivSelecting && ivSelectedKeyValue
                                    ? [ivSelectedKeyValue]
                                    : Object.keys(IVData)
                            }
                        />
                    </div>

                    {/* TESAGraph の真下・右寄せにボタン */}
                    <div className="flex-shrink-0 flex gap-2 mt-2 mb-2 ml-2 relative z-10">
                        {!ivSelecting && (
                            <Button
                                className="inline-flex w-auto items-center gap-2 rounded-md bg-zinc-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-gray-600"
                                onClick={() => setIVModalOpen(true)}
                            >
                                IV範囲を選択開始
                            </Button>
                        )}

                        {ivSelecting && (
                            <div className="flex gap-1">
                                <Button
                                    className="inline-flex w-auto items-center gap-2 rounded-md bg-zinc-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-gray-600"
                                    onClick={confirmIVSelect}>範囲確定</Button>
                                <Button
                                    className="inline-flex w-auto items-center gap-2 rounded-md bg-red-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-red-600"
                                    onClick={cancelIVSelect}>キャンセル</Button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );

};


export default IVGraph;
