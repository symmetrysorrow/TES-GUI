import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TESGraphRef, ExportImageOptions } from "./TESGraph";
import { writeFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { Printer } from "lucide-react";

type PrintModalProps = {
    graphRef: React.RefObject<TESGraphRef>;
};

export default function PrintModal({ graphRef }: PrintModalProps) {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [open, setOpen] = useState(false);

    const [exportOptions, setExportOptions] = useState<ExportImageOptions>({
        format: "png",
        width: 800,
        height: 600,
        transparent: true,
    });

    // ✅ 開いた時にプレビュー生成
    useEffect(() => {
        if (open) {
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
        }
    }, [open, exportOptions, graphRef]);

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
            }
        } catch (e) {
            console.error(e);
            alert("保存に失敗しました");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger>
                <Printer />
            </PopoverTrigger>
            <PopoverContent className="max-w-none w-full bg-white text-gray-800">
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
                <div className="flex-1 border max-w-[50vw] rounded bg-gray-50 flex items-center justify-center">
                    {imageUri ? (
                        <img src={imageUri} alt="Preview" className="max-h-full max-w-full" />
                    ) : (
                        <span className="text-gray-500">生成中...</span>
                    )}
                </div>

                {/* 💾 保存 */}
                <div className="flex justify-end mt-2">
                    <Button size="sm" onClick={handleSave} disabled={!imageUri || saving}>
                        {saving ? "保存中..." : "保存"}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
