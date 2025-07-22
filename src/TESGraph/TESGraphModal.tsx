import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { TESGraphRef, ExportImageOptions } from "./TESGraph";
import { writeFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";

type PrintModalProps = {
    isOpen: boolean;
    onClose: () => void;
    graphRef: React.RefObject<TESGraphRef>;
};

export default function PrintModal({ isOpen, onClose, graphRef }: PrintModalProps) {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const [exportOptions, setExportOptions] = useState<ExportImageOptions>({
        format: "png",
        width: 800,
        height: 600,
        transparent: true,
    });

    useEffect(() => {
        const timeout = setTimeout(async () => {
            if (graphRef.current) {
                try {
                    const uri = await graphRef.current.exportImage(exportOptions);
                    setImageUri(uri);
                } catch (e) {
                    console.error("exportImage error:", e);
                }
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [exportOptions, graphRef,isOpen]);

    const handleSave = async () => {
        if (!imageUri) return;
        setSaving(true);
        try {
            const path = await save({
                filters: [{ name: "Images", extensions: [exportOptions.format] }],
                defaultPath: `graph.${exportOptions.format}`,
            });
            if (path) {
                let fileData: Uint8Array;
                if (exportOptions.format === "svg") {
                    const svg = imageUri.split(",")[1];
                    fileData = new TextEncoder().encode(atob(svg));
                } else {
                    const base64 = imageUri.split(",")[1];
                    const binary = atob(base64);
                    fileData = Uint8Array.from(binary, c => c.charCodeAt(0));
                }
                await writeFile(path, fileData);
                onClose();
            }
        } catch (e) {
            console.error(e);
            alert("保存に失敗しました");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-none w-full h-[90vh] bg-white text-gray-800">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold text-gray-900">グラフをエクスポート</DialogTitle>
                </DialogHeader>

                {/* ⚙️ 設定パネル */}
                <div className="flex flex-wrap gap-3 text-sm mb-2">
                    <div className="flex flex-col">
                        <span className="mb-1 text-gray-700">形式</span>
                        <Select
                            value={exportOptions.format}
                            onValueChange={v => setExportOptions(p => ({ ...p, format: v as "png" | "svg" }))}
                        >
                            <SelectTrigger className="w-24 h-8">
                                <SelectValue placeholder="形式" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="png">PNG</SelectItem>
                                <SelectItem value="svg">SVG</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col">
                        <span className="mb-1 text-gray-700">幅</span>
                        <Input
                            className="w-20 h-8"
                            type="number"
                            value={exportOptions.width}
                            onChange={e => setExportOptions(p => ({ ...p, width: +e.target.value }))}
                        />
                    </div>

                    <div className="flex flex-col">
                        <span className="mb-1 text-gray-700">高さ</span>
                        <Input
                            className="w-20 h-8"
                            type="number"
                            value={exportOptions.height}
                            onChange={e => setExportOptions(p => ({ ...p, height: +e.target.value }))}
                        />
                    </div>

                    <div className="flex items-center mt-6">
                        <Checkbox
                            checked={exportOptions.transparent}
                            onCheckedChange={v => setExportOptions(p => ({ ...p, transparent: !!v }))}
                        />
                        <span className="ml-2 text-gray-700">透過</span>
                    </div>
                </div>

                {/* 🖼 プレビュー */}
                <div className="flex-1 border rounded bg-gray-50 flex items-center justify-center">
                    {imageUri ? (
                        <img src={imageUri} alt="Preview" className="max-h-full max-w-full" />
                    ) : (
                        <span className="text-gray-500">生成中...</span>
                    )}
                </div>

                {/* 💾 保存/閉じる */}
                <DialogFooter className="mt-3 flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={!imageUri || saving}>
                        {saving ? "保存中..." : "保存"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={onClose} disabled={saving}>
                        キャンセル
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
