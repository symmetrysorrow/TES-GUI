import React, {  useState, useEffect } from "react";
import { Dialog, DialogTitle, Button } from "@headlessui/react";
import { TESGraphRef,ExportImageOptions } from "./TESGraph";
import { writeFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";

type PrintModalProps = {
    isOpen: boolean;
    onClose: () => void;
    graphRef:React.RefObject<TESGraphRef>;
};

export default function PrintModal({ isOpen, onClose ,graphRef}: PrintModalProps) {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const [exportOptions, setExportOptions] = useState<ExportImageOptions>({
        format: "png",
        width: 800,
        height: 600,
        transparent: true,
    });

    // ⚡ 設定変更時に自動再生成（300msデバウンス付き）
    useEffect(() => {
        const timeout = setTimeout(async () => {
            if (graphRef.current) {
                console.log("graphRef.current:", graphRef.current);
                const uri = await graphRef.current.exportImage(exportOptions);
                setImageUri(uri);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [exportOptions]);

    useEffect(() => {
        async function generateImage() {
            if (graphRef.current) {
                console.log("graphRef.current:", graphRef.current);
                try {
                    const uri = await graphRef.current.exportImage(exportOptions);
                    setImageUri(uri);
                } catch (e) {
                    console.error("exportImage error:", e);
                }
            }
        }
        generateImage();
    }, [graphRef.current]);


    const handleSave = async () => {
        if (!imageUri) {
            alert("まず画像を生成してください");
            return;
        }
        setSaving(true);
        try {
            const path = await save({
                filters: [
                    { name: "PNG Images", extensions: ["png"] },
                    { name: "SVG Images", extensions: ["svg"] },
                ],
                defaultPath: `graph.${exportOptions.format}`,
            });

            if (path) {
                let fileData: Uint8Array;

                if (exportOptions.format === "svg") {
                    const svgUri = imageUri;

                    if (svgUri.startsWith("data:image/svg+xml;base64,")) {
                        const base64 = svgUri.split(",")[1];
                        const decoded = atob(base64);
                        fileData = new TextEncoder().encode(decoded);
                    } else if (
                        svgUri.startsWith("data:image/svg+xml;utf8,") ||
                        svgUri.startsWith("data:image/svg+xml,")
                    ) {
                        const encoded = svgUri.split(",")[1];
                        const decoded = decodeURIComponent(encoded);
                        fileData = new TextEncoder().encode(decoded);
                    } else {
                        throw new Error("未対応のSVG URI形式: " + svgUri.slice(0, 50));
                    }
                } else {
                    const base64Data = imageUri.split(",")[1];
                    const binaryString = atob(base64Data);
                    const len = binaryString.length;
                    fileData = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        fileData[i] = binaryString.charCodeAt(i);
                    }
                }

                await writeFile(path, fileData);
                //alert(`ファイルを保存しました: ${path}`);
                onClose(); // 保存後に閉じる
            } else {
                console.log("保存がキャンセルされました");
            }
        } catch (error) {
            console.error("ファイル保存でエラー", error);
            alert("ファイル保存に失敗しました");
        } finally {
            setSaving(false);
        }
    };



    return (
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center text-black">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="bg-white p-6 rounded-xl shadow-lg z-10 max-w-4xl w-full">
                <DialogTitle className="text-lg font-bold mb-4">エクスポート</DialogTitle>

                {/* ⚙️ 設定パネル */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <label className="flex items-center gap-2">
                        形式:
                        <select
                            value={exportOptions.format}
                            onChange={(e) =>
                                setExportOptions((prev) => ({ ...prev, format: e.target.value as "png" | "svg" }))
                            }
                            className="border rounded px-2 py-1"
                        >
                            <option value="png">PNG</option>
                            <option value="svg">SVG</option>
                        </select>
                    </label>

                    <label className="flex items-center gap-2">
                        透過背景:
                        <input
                            type="checkbox"
                            checked={exportOptions.transparent ?? false}
                            onChange={(e) =>
                                setExportOptions((prev) => ({ ...prev, transparent: e.target.checked }))
                            }
                        />
                    </label>

                    <label className="flex items-center gap-2">
                        幅:
                        <input
                            type="number"
                            value={exportOptions.width ?? 800}
                            onChange={(e) =>
                                setExportOptions((prev) => ({ ...prev, width: Number(e.target.value) }))
                            }
                            className="w-24 border rounded px-2 py-1"
                        />
                    </label>

                    <label className="flex items-center gap-2">
                        高さ:
                        <input
                            type="number"
                            value={exportOptions.height ?? 600}
                            onChange={(e) =>
                                setExportOptions((prev) => ({ ...prev, height: Number(e.target.value) }))
                            }
                            className="w-24 border rounded px-2 py-1"
                        />
                    </label>
                </div>

                {/* 🖼 プレビュー表示 */}
                <div className="border border-gray-300 mb-4 overflow-auto h-64 flex items-center justify-center">
                    {imageUri ? (
                        <img src={imageUri} alt="Exported Graph" className="max-h-full max-w-full" />
                    ) : (
                        <span className="text-gray-500">画像を生成中...</span>
                    )}
                </div>

                {/* 💾 保存・閉じる */}
                <div className="flex gap-2 justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={!imageUri || saving}
                        className="inline-flex w-auto items-center gap-2 rounded-md bg-zinc-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-gray-600"
                    >
                        {saving ? "保存中..." : "ファイルに保存"}
                    </Button>
                    <Button
                        onClick={onClose}
                        disabled={saving}
                        className="inline-flex w-auto items-center gap-2 rounded-md bg-red-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-red-600"
                    >
                        キャンセル
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
