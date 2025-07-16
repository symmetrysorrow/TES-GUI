import  {useEffect, useRef, useState} from "react";
import TESAGraph, { TESAData } from "@/TESGraph/TESAGraph.tsx";
import {invoke} from "@tauri-apps/api/core";
import {TESGraphRef} from "@/TESGraph/TESGraph.tsx";

const rtTabs = [
    { id: "IV", label: "IV", xKey: "Temp", yKey: "R_tes", defaultTitle: "RT", defaultXaxis: "Temp", defaultYaxis: "R_tes" },
    { id: "IR", label: "IR", xKey: "BiasPoint", yKey: "Alpha", defaultTitle: "Alpha", defaultXaxis: "Bias Point", defaultYaxis: "Alpha" },
];

const RTGraph = ({ tabId }: { tabId: string }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const [IVData, setIVData] = useState<TESAData | null>(null);
    //const safeData: TESAData = IVData ?? defaultData;

    const graphRef = useRef<TESGraphRef>(null);

    useEffect(() => {
        invoke<TESAData>("GetRTCommand", { tabName: tabId })
            .then((res) => {
                console.log("Fetched data:", res);
                setIVData(res);
            })
            .catch((e) => console.error(e));
    }, [tabId]);

    // TESAGraphへのprops
    const graphProps = {
        data: IVData??{},
        tabs: rtTabs,
        unitLabel: "microA",
        sidebarOpen,
        onToggleSidebar: () => setSidebarOpen((prev) => !prev),
    };

    return (
        <div className="h-full flex flex-col">
            {IVData === null ? (
                // Loading 表示
                <div className="flex flex-1 flex-col items-center justify-center text-white text-xl">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                    Loading...
                </div>
            ) : (
                <>
                    {/* TESAGraph */}
                    <div className="flex-1 min-h-0">
                        <TESAGraph
                            ref={graphRef}
                            {...graphProps}
                        />
                    </div>
                </>
            )}
        </div>
    );

};

export default RTGraph;
