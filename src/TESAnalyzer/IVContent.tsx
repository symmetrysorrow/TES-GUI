import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import TESAContent, {TESAData} from "./TESAContent";

const rtTabs = [
    { id: "IV", label: "IV", xKey: "I_bias", yKey: "V_out", defaultTitle: "IV Title", defaultXaxis: "I_bias", defaultYaxis: "V_out" },
    { id: "IR", label: "IR", xKey: "I_bias", yKey: "R_tes", defaultTitle: "IR Title", defaultXaxis: "I_bias", defaultYaxis: "R_tes" },
];

const IVContent = ({ tabId }: { tabId: string }) => {
    const [data, setData] = useState<TESAData | null>(null);

    useEffect(() => {
        invoke<TESAData>("GetIVCommand", { tabName: tabId })
            .then((res) => {
                setData(res);
            })
            .catch((e) => console.error(e));
    }, [tabId]);

    return <TESAContent data={data} tabs={rtTabs} />;
};

export default IVContent;
