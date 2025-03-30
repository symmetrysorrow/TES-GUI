import { Home, Inbox } from "lucide-react";
import { createContext, useContext, ReactNode, useState } from "react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useTargetState, TargetEnum } from "@/TargetContext.tsx";

export enum ToolEnum {
    SingleCalib,
    MultiCalib,
}

// Context の定義
interface ToolbarContextType {
    CurrentTool: ToolEnum | null;
    setCurrentTool: (tool: ToolEnum | null) => void;
}

const ToolbarContext = createContext<ToolbarContextType | null>(null);

// カスタムフック
export function useToolState() {
    const context = useContext(ToolbarContext);
    if (!context) {
        throw new Error("useToolState must be used within a ToolBarProvider");
    }
    return context;
}

// Provider の実装
export function ToolBarProvider({ children }: { children: ReactNode }) {
    const [CurrentTool, setCurrentTool] = useState<ToolEnum | null>(null);
    return (
        <ToolbarContext.Provider value={{ CurrentTool, setCurrentTool }}>
            {children}
        </ToolbarContext.Provider>
    );
}

// ツールリスト
const tools = [
    {
        title: "Single Calibration",
        description: "ある点でのフラックスジャンプを前後数点からの線形フィットで補正する。カーブしている部分にも適用可能。",
        icon: Home,
        ToolType: ToolEnum.SingleCalib,
    },
    {
        title: "Multiple Calibration",
        description: "IVの初めの数点を線形フィットすることで範囲内のすべてのジャンプを補正する。カーブしている部分には適用できない。",
        icon: Inbox,
        ToolType: ToolEnum.MultiCalib,
    },
];

export default function ToolBar({ children }: { children: React.ReactNode }) {
    const { CurrentTool, setCurrentTool } = useToolState(); // useState ではなく、useToolState を使う
    const { CurrentTarget } = useTargetState();

    return (
        <TooltipProvider>
            <div className="flex h-screen">
                {/* IV ターゲットが選ばれたときのみツールバーを表示 */}
                {CurrentTarget === TargetEnum.IV && (
                    <aside className="w-12 bg-gray-800 text-white p-4 flex flex-col items-center">
                        <nav>
                            <ul>
                                {tools.map((tool) => (
                                    <li
                                        key={tool.title}
                                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                                            CurrentTool === tool.ToolType ? "bg-gray-600" : "hover:bg-gray-700"
                                        }`}
                                        onClick={() => setCurrentTool(tool.ToolType)}
                                    >
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex items-center gap-2">
                                                    <tool.icon />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="right">
                                                {tool.description}
                                            </TooltipContent>
                                        </Tooltip>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </aside>
                )}

                <main className="flex-1 p-4">{children}</main>
            </div>
        </TooltipProvider>
    );
}
