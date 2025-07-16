import  {useEffect, useRef, useState} from "react";
import TESAGraph, { TESAData } from "@/TESGraph/TESAGraph.tsx";
import {invoke} from "@tauri-apps/api/core";
import {TESGraphRef} from "@/TESGraph/TESGraph.tsx";

const rtTabs = [
    { label: "RT", xKey: "Temp", yKey: "R_tes", defaultTitle: "RT", defaultXaxis: "Temp", defaultYaxis: "R_tes" },
    { label: "Alpha", xKey: "BiasPoint", yKey: "Alpha", defaultTitle: "Alpha", defaultXaxis: "Bias Point", defaultYaxis: "Alpha" },
];

const RTGraph = ({ tabId }: { tabId: string }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    const [RTData, setRTData] = useState<TESAData | null>(null);
    //const safeData: TESAData = IVData ?? defaultData;

    const graphRef = useRef<TESGraphRef>(null);

    useEffect(() => {
        setIsLoading(true);
        console.log("Now Loading")
        invoke("AnalyzeRTFolderCommand", { tabName: tabId })
            .then(async () => {
                invoke<TESAData>("GetRTCommand", { tabName: tabId })
                    .then(async (res) => {
                        setRTData(res);
                        setIsLoading(false);
                    })
                    .catch((e) => console.error(e));
            })
    }, [tabId]);

    // TESAGraphへのprops
    const graphProps = {
        data: RTData??{},
        tabs: rtTabs,
        unitLabel: "microA",
        sidebarOpen,
        onToggleSidebar: () => setSidebarOpen((prev) => !prev),
    };

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
