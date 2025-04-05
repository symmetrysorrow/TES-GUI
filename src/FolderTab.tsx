import { ReactNode, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TargetEnum, useTargetState } from "@/TargetContext.tsx";
import { Plus } from "lucide-react";
import SideToolBar, { SideToolBarProvider } from "./SideToolBar";
import { TopToolbar } from "./TopToolBar";
import { Button } from "@/components/ui/button.tsx";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import IVContent from "@/IVContent";

type TabItem = {
    id: string;
    title: string;
    content: ReactNode;
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
        { id: initialTabId, title: "新しいタブ", content: null, TargetType: null }
    ]);
    const [folderPaths, setFolderPaths] = useState<{ [id: string]: string | null }>({ [initialTabId]: null });
    const [currentTabId, setCurrentTabId] = useState<string>(initialTabId);

    const addTab = () => {
        const newId = crypto.randomUUID();
        setTabs([...tabs, { id: newId, title: "新しいタブ", content: null, TargetType: null }]);
        setFolderPaths((prev) => ({ ...prev, [newId]: null }));
        setCurrentTabId(newId); // 新しいタブをアクティブにする
    };

    const handleOpenFolder = async (tabId: string) => {
        const selected = await open({ directory: true });
        if (selected) {
            const folderPath = selected as string;
            const folderName = getFolderName(folderPath);

            try {
                // Rust側の `FindFolderType` を呼び出してフォルダの種類を取得
                const folderType: string = await invoke("FindFolderType", { folderName: folderPath });
                await invoke("greet", { name: folderPath });

                let targetType: TargetEnum | null = null;
                switch (folderType) {
                    case "IV":
                        targetType = TargetEnum.IV;
                        break;
                    case "RT":
                        targetType = TargetEnum.RT;
                        break;
                    case "Pulse":
                        targetType = TargetEnum.Pulse;
                        break;
                    default:
                        targetType = null;
                }

                setFolderPaths((prev) => ({ ...prev, [tabId]: folderPath }));
                setTabs((prevTabs) =>
                    prevTabs.map((tab) =>
                        tab.id === tabId ? { ...tab, title: folderName, TargetType: targetType } : tab
                    )
                );

                setCurrentTarget(targetType);
            } catch (error) {
                console.error("フォルダ判定エラー:", error);
                alert("フォルダの種類を判定できませんでした。");
            }
        }
    };

    const removeTab = (id: string) => {
        const newTabs = tabs.filter((tab) => tab.id !== id);
        setTabs(newTabs);
        setFolderPaths((prev) => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
        });

        if (id === currentTabId) {
            setCurrentTabId(newTabs.length > 0 ? newTabs[0].id : "");
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
                                {tab.TargetType === TargetEnum.IV && folderPaths[tab.id] ? (
                                    <IVContent folderPath={folderPaths[tab.id]!} />
                                ) : (
                                    <div className="flex flex-col h-full justify-center items-center">
                                        <Button onClick={() => handleOpenFolder(tab.id)}>フォルダを開く</Button>
                                        {folderPaths[tab.id] && <p className="mt-2">選択されたフォルダ: {folderPaths[tab.id]}</p>}
                                    </div>
                                )}
                            </TabsContent>
                        ))}
                    </div>
                </div>
            </Tabs>
        </div>
    );
};

export default DynamicTabs;
