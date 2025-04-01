import { ReactNode, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TargetEnum, useTargetState } from "@/TargetContext.tsx";
import { Plus } from "lucide-react";
import SideToolBar, { SideToolBarProvider } from "./SideToolBar";
import { TopToolbar } from "./TopToolBar";
import { Button } from "@/components/ui/button.tsx";
import { open } from "@tauri-apps/plugin-dialog";

type TabItem = {
    id: string;
    title: string;
    content: ReactNode;
    TargetType: TargetEnum | null;
};

// フォルダパスから最後のディレクトリ名を取得
const getFolderName = (path: string) => {
    return path.split("/").filter(Boolean).pop() || "新しいタブ";
};

const DynamicTabs = () => {
    const { setCurrentTarget } = useTargetState();
    const [tabs, setTabs] = useState<TabItem[]>([]);
    const [folderPaths, setFolderPaths] = useState<{ [id: string]: string | null }>({});

    const addTab = () => {
        const newId = `tab-${tabs.length+1}`;
        const initialFolderPath = `folders/${newId}`;

        setTabs([
            ...tabs,
            {
                id: newId,
                title: getFolderName(initialFolderPath), // 初期フォルダ名をセット
                content: null, // 後で state を利用するので null
                TargetType: null,
            },
        ]);

        setFolderPaths((prev) => ({ ...prev, [newId]: initialFolderPath }));
    };

    const handleOpenFolder = async (tabId: string) => {
        const selected = await open({ directory: true });
        if (selected) {
            const folderPath = selected as string;
            const folderName = getFolderName(folderPath);

            // タイトル（フォルダ名）とフォルダパスを更新
            setFolderPaths((prev) => ({ ...prev, [tabId]: folderPath }));
            setTabs((prevTabs) =>
                prevTabs.map((tab) =>
                    tab.id === tabId ? { ...tab, title: folderName } : tab
                )
            );

            console.log("選択されたフォルダ:", folderPath);
        }
    };

    const removeTab = (id: string) => {
        setTabs(tabs.filter((tab) => tab.id !== id));
        setFolderPaths((prev) => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
        });
    };

    const handleTabChange = (selectedTabId: string) => {
        const selectedTab = tabs.find((tab) => tab.id === selectedTabId);
        if (selectedTab) {
            setCurrentTarget(selectedTab.TargetType ?? null);
        }
    };

    return (
        <div className="w-full mx-auto bg-[#1f1f23] text-white min-h-screen flex flex-col">
            <Tabs defaultValue={tabs[0]?.id} onValueChange={handleTabChange} className="h-full flex flex-col w-full">
                {/* タブバー */}
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

                {/* サイドバーとコンテンツを横並びに配置 */}
                <div className="flex flex-grow w-full">
                    <SideToolBarProvider>
                        <SideToolBar />
                    </SideToolBarProvider>

                    {/* タブのコンテンツ */}
                    <div className="flex-grow p-4 bg-gray-900 text-white rounded-b-lg">
                        {tabs.map((tab) => (
                            <TabsContent key={tab.id} value={tab.id} className="h-full w-full">
                                <div className="flex flex-col h-full justify-center items-center">
                                    <h2 className="text-lg">フォルダをドロップ</h2>
                                    <Button onClick={() => handleOpenFolder(tab.id)}>フォルダを開く</Button>
                                    {folderPaths[tab.id] && <p className="mt-2">選択されたフォルダ: {folderPaths[tab.id]}</p>}
                                </div>
                            </TabsContent>
                        ))}
                    </div>
                </div>
            </Tabs>
        </div>
    );
};

export default DynamicTabs;
