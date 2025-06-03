import React, {useState, ReactNode, useEffect, useRef} from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TargetEnum, useTargetState } from "@/TargetContext.tsx";
import { Plus } from "lucide-react";
import SideToolBar, { SideToolBarProvider } from "./SideToolBar";
import { TopToolbar } from "./TopToolBar";
import { Button } from "@/components/ui/button.tsx";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import IVContent from "@/IVContent";
import PulseContent from "@/PulseContent";
import RTContent from "@/RTContent.tsx";

type TabItem = {
    id: string;
    title: string;
    FolderPath: string | null;
    content: () => ReactNode|null;
    TargetType: TargetEnum | null;
};

export interface TabContentProps {
    folderPath: string;
    tabId: string;  // または processorId
}

// フォルダパスから最後のディレクトリ名を取得
const getFolderName = (path: string) => {
    return path.split("\\").filter(Boolean).pop() || "新しいタブ";
};

const DynamicTabs = () => {
    const { setCurrentTarget } = useTargetState();

    const NewTabContent: React.FC<{ id: string }> = () => {
        return (
            <FolderDropArea>
                <Button onClick={() => handleDialog()}>フォルダを開く</Button>
            </FolderDropArea>
        );
    };

    // 初期タブを作成
    const InitialID = crypto.randomUUID();
    const newTabContent = () => <NewTabContent id={InitialID} />;
    const [tabs, setTabs] = useState<TabItem[]>([
        { id: InitialID, title: "新しいタブ",FolderPath:null, content: newTabContent, TargetType: null }
    ]);
    const [currentTabId, setCurrentTabId] = useState<string>(InitialID);
    const currentTabIdRef = useRef(currentTabId);
    useEffect(() => {
        currentTabIdRef.current = currentTabId;
    }, [currentTabId]);

    const addTab = () => {
        const newId = crypto.randomUUID();
        const newTabContent = () => <NewTabContent id={newId} />;
        setCurrentTabId(newId); // 新しいタブをアクティブにする
        setTabs((prevTabs) => [
            ...prevTabs,
            { id: newId, title: "新しいタブ", FolderPath:null,content: newTabContent, TargetType: null }
            //{ id: newId, title: newId, FolderPath:null,content: newTabContent, TargetType: null }
        ]);
        console.log("NewId:", newId);
        console.log("CurrentId:", currentTabId);
    };

    const handleDialog=async ()=>{
        const selected = await open({ directory: true });
        console.log("選択されたフォルダ:", selected);
        if(selected){
            const folderPath = selected as string;
            await handleOpenFolder(folderPath);
        }
    }

    const FolderDropArea: React.FC<{ children?: ReactNode }> = ({ children }) => {
        const [backgroundClass, setBackgroundClass] = useState("bg-transparent");
        const [message, setMessage] = useState("");

        useEffect(() => {
            const unlistenDrop = listen('tauri://drag-drop', async (e: any) => {
                const paths: string[] = e.payload.paths;
                let opened = false;
                for (const path of paths) {
                    try {
                        await handleOpenFolder(path);
                        opened = true;
                        break; // 1つだけ処理して終了

                    } catch (err) {
                        console.error("lstat error:", err);
                    }
                }

                setBackgroundClass("bg-transparent");
                setMessage(opened ? "1 件のフォルダを開きました" : "フォルダ以外の項目は無視されました");
            });

            const unlistenEnter = listen('tauri://drag-enter', () => {
                setBackgroundClass("bg-amber-200/60");
            });

            const unlistenLeave = listen('tauri://drag-leave', () => {
                setBackgroundClass("bg-transparent");
            });

            return () => {
                unlistenDrop.then((fn) => fn());
                unlistenEnter.then((fn) => fn());
                unlistenLeave.then((fn) => fn());
            };
        }, []);

        return (
            <div className={`flex flex-col justify-center items-center w-full h-full relative ${backgroundClass}`}>
                <div className="z-10">{children}</div>
                <div className="absolute bottom-1 w-full text-center text-sm text-black z-20">
                    {message}
                </div>
                <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none" />
            </div>
        );
    };

    const handleOpenFolder = async (folderPath:string) => {
        const tabId = currentTabIdRef.current;
        const FolderTitle = getFolderName(folderPath);
        try {
            // Rust側の `FindFolderType` を呼び出してフォルダの種類を取得
            const folderType: string = await invoke("FindFolderType", { folder: folderPath });

            let targetType: TargetEnum | null = null;
            let content = ()=><></>; // 初期値として空のコンポーネントを設定
            switch (folderType) {
                case "IV":
                    targetType = TargetEnum.IV;
                    content = () => <IVContent folderPath={folderPath} tabId={tabId} />;
                    await invoke("RegisterProcessor", { tabName: tabId,processorType: "IV" });
                    await invoke("SetDataPathCommand",{tabName:tabId, path: folderPath});
                    await invoke("AnalyzeFolderCommand", { tabName: tabId});
                    break;
                case "RT":
                    targetType = TargetEnum.RT;
                    content = () => <RTContent folderPath={folderPath} tabId={tabId} />;
                    await invoke("RegisterProcessor", { tabName: tabId,processorType: "RT" });
                    await invoke("SetDataPathCommand",{tabName:tabId, path: folderPath});
                    await invoke("AnalyzeFolderCommand", { tabName: tabId});
                    const rt = await invoke("GetRTCommand", { tabName: tabId });
                    console.log("RTデータ:", rt);

                    break;
                case "Pulse":
                    targetType = TargetEnum.Pulse;
                    content = () => <PulseContent folderPath={folderPath} tabId={tabId} />;
                    await invoke("RegisterProcessor", { tabName: tabId,processorType: "Pulse" });
                    await invoke("SetDataPathCommand",{tabName:tabId, path: folderPath});
                    break;
                default:
                    targetType = null;
            }


            setTabs((prevTabs) =>
                prevTabs.map((tab) =>
                    tab.id === tabId ? { ...tab, title: FolderTitle, TargetType: targetType, content: content } : tab
                )
            );
            setCurrentTarget(targetType);
            console.log("フォルダの種類:", folderType);
        } catch (error) {
            console.error("フォルダ判定エラー:", error);
            alert("フォルダの種類を判定できませんでした。");
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

                    <div className="flex-grow bg-gray-900 text-white rounded-b-lg">
                        {tabs.map((tab) => (
                            <TabsContent key={tab.id} value={tab.id} className="h-full w-full">
                                {tab.content()}
                            </TabsContent>
                        ))}
                    </div>
                </div>
            </Tabs>
        </div>
    );
};

export default DynamicTabs;
