import {useState ,ReactNode} from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TargetEnum, useTargetState } from "@/TargetContext.tsx";
import { Plus } from "lucide-react";
import SideToolBar, { SideToolBarProvider } from "./SideToolBar";
import { TopToolbar } from "./TopToolBar";
import { Button } from "@/components/ui/button.tsx";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import IVContent from "@/IVContent";
import PulseContent from "@/PulseContent";
import RTContent from "@/RTContent.tsx";

type TabItem = {
    id: string;
    title: string;
    FolderPath: string | null;
    content: ReactNode|null;
    TargetType: TargetEnum | null;
};

// フォルダパスから最後のディレクトリ名を取得
const getFolderName = (path: string) => {
    return path.split("\\").filter(Boolean).pop() || "新しいタブ";
};

const DynamicTabs = () => {
    const { setCurrentTarget } = useTargetState();

    // 初期タブを作成
    const initialTabId = crypto.randomUUID();
    const [tabs, setTabs] = useState<TabItem[]>([
        { id: initialTabId, title: "新しいタブ",FolderPath:null, content: null, TargetType: null }
    ]);
    const [currentTabId, setCurrentTabId] = useState<string>(initialTabId);

    const addTab = () => {
        const newId = crypto.randomUUID();
        const newTabContent = (
            <div className="flex flex-col h-full justify-center items-center">
                <Button onClick={() => handleOpenFolder(newId)}>フォルダを開く:new</Button>
            </div>
        );

        setTabs((prevTabs) => [
            ...prevTabs,
            { id: newId, title: "新しいタブ", FolderPath:null,content: newTabContent, TargetType: null }
        ]);
        setCurrentTabId(newId); // 新しいタブをアクティブにする
    };

    const handleOpenFolder = async (tabId: string) => {
        const selected = await open({ directory: true });
        console.log("選択されたフォルダ:", selected);
        if (selected) {
            const folderPath = selected as string;
            const FolderTitle = getFolderName(folderPath);

            try {
                // Rust側の `FindFolderType` を呼び出してフォルダの種類を取得
                const folderType: string = await invoke("FindFolderType", { folder: folderPath });

                let targetType: TargetEnum | null = null;
                let content = null;
                switch (folderType) {
                    case "IV":
                        targetType = TargetEnum.IV;
                        content = <IVContent folderPath={folderPath} />;
                        await invoke("RegisterProcessor", { tabName: tabId,processorType: "IV" });
                        break;
                    case "RT":
                        targetType = TargetEnum.RT;
                        content = <RTContent folderPath={folderPath} />;
                        await invoke("RegisterProcessor", { tabName: tabId,processorType: "RT" });
                        break;
                    case "Pulse":
                        targetType = TargetEnum.Pulse;
                        content = <PulseContent folderPath={folderPath} />;
                        await invoke("RegisterProcessor", { tabName: tabId,processorType: "Pulse" });
                        break;
                    default:
                        targetType = null;
                }
                await invoke("SetDataPathCommand",{tabName:tabId, path: folderPath});

                setTabs((prevTabs) =>
                    prevTabs.map((tab) =>
                        tab.id === tabId ? { ...tab, title: FolderTitle, TargetType: targetType, content: content } : tab
                    )
                );

                setCurrentTarget(targetType);
            } catch (error) {
                console.error("フォルダ判定エラー:", error);
                alert("フォルダの種類を判定できませんでした。");
            }
        }
    };

    const removeTab = async (id: string) => {
        const tabToRemove = tabs.find((tab) => tab.id === id);
        if (tabToRemove && tabToRemove.TargetType !== null) {
            console.log("TargetType:", tabToRemove.TargetType);
            await invoke("UnregisterProcessor", { tabName: id });
        }

        const newTabs = tabs.filter((tab) => tab.id !== id);
        setTabs(newTabs);

        if (id === currentTabId) {
            const lastTab = newTabs[newTabs.length - 1];
            setCurrentTabId(lastTab ? lastTab.id : "");
        }
    };

    const handleTabChange = (selectedTabId: string) => {
        setCurrentTabId(selectedTabId);
        const selectedTab = tabs.find((tab) => tab.id === selectedTabId);
        if (selectedTab) {
            setCurrentTarget(selectedTab.TargetType ?? null);
        }
    };

    return (
        <div className="w-full mx-auto bg-[#1f1f23] text-white min-h-screen flex flex-col">
            <Tabs value={currentTabId} onValueChange={handleTabChange} className="h-full flex flex-col w-full">
                <TabsList className="flex flex-glow bg-transparent rounded-t-lg w-full justify-start">
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className="min-w-[100px] max-w-[200px] px-4 py-2 appearance-none data-[state=active]:bg-[#343438] data-[state=active]:text-white text-gray-450 hover:bg-gray-700 hover:text-gray-400 last:border-r-0 flex justify-between items-center w-full"
                        >
                            <span className="truncate">{tab.title}</span>
                            <span
                                className="text-white hover:text-red-300 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeTab(tab.id);
                                }}
                            >
                                ×
                            </span>
                        </TabsTrigger>
                    ))}
                    <span className="text-white hover:text-green-300 cursor-pointer flex justify-center items-center" onClick={addTab}>
                        <Plus size={20} />
                    </span>
                </TabsList>

                <TopToolbar />

                <div className="flex flex-grow w-full">
                    <SideToolBarProvider>
                        <SideToolBar />
                    </SideToolBarProvider>

                    <div className="flex-grow p-4 bg-gray-900 text-white rounded-b-lg">
                        {tabs.map((tab) => (
                            <TabsContent key={tab.id} value={tab.id} className="h-full w-full">
                                {tab.content}
                            </TabsContent>
                        ))}
                    </div>
                </div>
            </Tabs>
        </div>
    );
};

export default DynamicTabs;
