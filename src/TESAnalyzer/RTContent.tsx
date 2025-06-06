import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import TESAContent, {TESAData} from "./TESAContent";

const rtTabs = [
    { id: "RT", label: "RT", xKey: "Temp", yKey: "R_tes", defaultTitle: "RT Title", defaultXaxis: "Time", defaultYaxis: "Value" },
    { id: "Alpha", label: "Alpha", xKey: "Alpha", yKey: "BiasPoint", defaultTitle: "Alpha Title", defaultXaxis: "Time", defaultYaxis: "Alpha" },
];

const RTContent = ({ tabId }: { tabId: string }) => {
    const [data, setData] = useState<TESAData | null>(null);

    useEffect(() => {
        invoke<TESAData>("GetRTCommand", { tabName: tabId })
            .then((res) => {
                setData(res);
            })
            .catch((e) => console.error(e));
    }, [tabId]);

    return <TESAContent data={data} tabs={rtTabs} />;
};

export default RTContent;