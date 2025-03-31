import { Home, Inbox } from "lucide-react";
import { createContext, useContext, ReactNode, useState } from "react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useTargetState, TargetEnum } from "@/TargetContext.tsx";

export enum SideToolEnum {
    SingleCalib,
    MultiCalib,
}

// Context の定義
interface SideToolbarContextType {
    CurrentTool: SideToolEnum | null;
    setCurrentTool: (tool: SideToolEnum | null) => void;
}

const SideToolbarContext = createContext<SideToolbarContextType | null>(null);

// カスタムフック
export function useSideToolState() {
    const context = useContext(SideToolbarContext);
    if (!context) {
        throw new Error("useToolState must be used within a ToolBarProvider");
    }
    return context;
}

// Provider の実装
export function SideToolBarProvider({ children }: { children: ReactNode }) {
    const [CurrentTool, setCurrentTool] = useState<SideToolEnum | null>(null);
    return (
        <SideToolbarContext.Provider value={{ CurrentTool, setCurrentTool }}>
            {children}
        </SideToolbarContext.Provider>
    );
}

// ツールリスト
const tools = [
    {
        title: "Single Calibration",
        description: "ある点でのフラックスジャンプを前後数点からの線形フィットで補正する。カーブしている部分にも適用可能。",
        icon: Home,
        ToolType: SideToolEnum.SingleCalib,
    },
    {
        title: "Multiple Calibration",
        description: "IVの初めの数点を線形フィットすることで範囲内のすべてのジャンプを補正する。カーブしている部分には適用できない。",
        icon: Inbox,
        ToolType: SideToolEnum.MultiCalib,
    },
];

export default function SideToolBar({}: {}) {
    const { CurrentTool, setCurrentTool } = useSideToolState(); // useState ではなく、useToolState を使う
    const { CurrentTarget } = useTargetState();

    return (
        <TooltipProvider>
            <div className="flex h-screen ">
                {CurrentTarget === TargetEnum.IV && (
                    <aside className="w-12 bg-gray-800 text-white p-4 flex flex-col items-center flex-shrink-0">
                        <nav>
                            <ul>
                                {tools.map((tool) => (
                                    <li
                                        key={tool.title}
                                        className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${
                                            CurrentTool === tool.ToolType ? "bg-gray-600" : "hover:bg-gray-700"
                                        }`}
                                        onClick={() => setCurrentTool(tool.ToolType)}
                                    >
                                        <Tooltip delayDuration={700}>
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
            </div>
        </TooltipProvider>
    );
}
