import  { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type ConfigType = {
    Readout: {
        Sample: number;
        PreSample: number;
        Rate: number;
    };
    Analysis: {
        CutoffFrequency: number;
        BaseLinePreSample: number;
        BaseLinePostSample: number;
        PeakSearchSample: number;
        PeakAveragePreSample: number;
        PeakAveragePostSample: number;
        RiseHighRatio: number;
        RiseLowRatio: number;
        DecayHighRatio: number;
        DecayLowRatio: number;
    };
};

type Props = { tabId: string ,onConfigChange: () => void };

export default function PulseConfig({ tabId,onConfigChange }: Props) {
    const [config, setConfig] = useState<ConfigType | null>(null);

    // Load configuration when the component mounts
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const res = await invoke<ConfigType>("GetConfigCommand", { tabName: tabId });
                setConfig(res);
            } catch (e) {
                alert("設定の取得に失敗: " + e);
            }
        };
        loadConfig();
    }, [tabId]);

    // Update a specific field in the configuration
    const updateField = (section: keyof ConfigType, key: string, value: number) => {
        if (!config) return;
        const updated = {
            ...config,
            [section]: { ...config[section], [key]: value }
        };
        setConfig(updated);
        invoke("SaveConfigCommand", { tabName: tabId, json: updated }).catch((e) =>
            alert("設定の保存に失敗: " + e)
        );

        onConfigChange();
    };

    return (
        <div>
        {config ? (
                <div className="space-y-4 max-h-96 overflow-auto">
                    <h2 className="font-semibold">Readout 設定</h2>
                    {Object.entries(config.Readout).map(([key, value]) => (
                        <div key={key}>
                            <label className="block text-xs font-medium">{key}</label>
                            <input
                                type="number"
                                className="w-full border px-2 py-1 text-sm"
                                value={value}
                                onChange={(e) => updateField("Readout", key, Number(e.target.value))}
                            />
                        </div>
                    ))}

                    <h2 className="font-semibold mt-2">Analysis 設定</h2>
                    {Object.entries(config.Analysis).map(([key, value]) => (
                        <div key={key}>
                            <label className="block text-xs font-medium">{key}</label>
                            <input
                                type="number"
                                className="w-full border px-2 py-1 text-sm"
                                value={value}
                                onChange={(e) => updateField("Analysis", key, Number(e.target.value))}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div>Loading config...</div>
            )}
        </div>
    );
}
