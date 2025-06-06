import React, { useState, useEffect, useRef, ReactNode } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { Plus } from "lucide-react";
import { TopToolbar } from "./TopToolBar";
import { Button } from "@/components/ui/button.tsx";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import IVContent from "@/TESAnalyzer/IVContent.tsx";
import PulseContent from "@/PulseContent";
import RTContent from "@/TESAnalyzer/RTContent.tsx";
import { TargetEnum, useTargetState } from "@/TargetContext.tsx";

type TabItem = {
    id: string;
    title: string;
    FolderPath: string | null;
    content: () => ReactNode | null;
    TargetType: TargetEnum | null;
};

const getFolderName = (path: string) =>
    path.split("\\").filter(Boolean).pop() || "新しいタブ";

const DynamicTabs = () => {
    const { setCurrentTarget } = useTargetState();
    const InitialID = crypto.randomUUID();

    const [tabs, setTabs] = useState<TabItem[]>([
        {
            id: InitialID,
            title: "新しいタブ",
            FolderPath: null,
            content: () => <NewTabContent id={InitialID} />,
            TargetType: null,
        },
    ]);
    const [currentTabId, setCurrentTabId] = useState<string>(InitialID);
    const currentTabIdRef = useRef(currentTabId);

    useEffect(() => {
        currentTabIdRef.current = currentTabId;
    }, [currentTabId]);

    // 新規タブの中身（フォルダ開くエリア）
    const NewTabContent: React.FC<{ id: string }> = () => (
        <div className="flex flex-col h-full">
            <FolderDropArea>
                <Button onClick={handleDialog}>
                    フォルダを開く
                </Button>
            </FolderDropArea>
        </div>
    );

    // フォルダドロップ領域
    const FolderDropArea: React.FC<{ children?: ReactNode }> = ({ children }) => {
        const [backgroundClass, setBackgroundClass] = useState("bg-transparent");
        const [message, setMessage] = useState("");

        useEffect(() => {
            const unlistenDrop = listen("tauri://drag-drop", async (e: any) => {
                const paths: string[] = e.payload.paths;
                let opened = false;
                for (const path of paths) {
                    try {
                        await handleOpenFolder(path);
                        opened = true;
                        break;
                    } catch (err) {
                        console.error("lstat error:", err);
                    }
                }
                setBackgroundClass("bg-transparent");
                setMessage(opened ? "1 件のフォルダを開きました" : "フォルダ以外の項目は無視されました");
            });

            const unlistenEnter = listen("tauri://drag-enter", () => setBackgroundClass("bg-amber-200/60"));
            const unlistenLeave = listen("tauri://drag-leave", () => setBackgroundClass("bg-transparent"));

            return () => {
                unlistenDrop.then((fn) => fn());
                unlistenEnter.then((fn) => fn());
                unlistenLeave.then((fn) => fn());
            };
        }, []);

        return (
            <div className={`flex flex-col justify-center items-center w-full h-full relative ${backgroundClass}`}>
                <div className="z-10">{children}</div>
                <div className="absolute bottom-1 w-full text-center text-sm text-black z-20">{message}</div>
                <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none" />
            </div>
        );
    };

    // タブ追加
    const addTab = () => {
        const newId = crypto.randomUUID();
        setTabs((prev) => [
            ...prev,
            {
                id: newId,
                title: "新しいタブ",
                FolderPath: null,
                content: () => <NewTabContent id={newId} />,
                TargetType: null,
            },
        ]);
        setCurrentTabId(newId);
    };

    // フォルダ開くダイアログ
    const handleDialog = async () => {
        const selected = await open({ directory: true });
        if (selected) await handleOpenFolder(selected as string);
    };

    // フォルダ開く処理
    const handleOpenFolder = async (folderPath: string) => {
        const tabId = currentTabIdRef.current;
        const FolderTitle = getFolderName(folderPath);
        try {
            const folderType: string = await invoke("FindFolderType", { folder: folderPath });
            let targetType: TargetEnum | null = null;
            let content = () => <></>;

            switch (folderType) {
                case "IV":
                    targetType = TargetEnum.IV;
                    content = () => <IVContent tabId={tabId} />;
                    break;
                case "RT":
                    targetType = TargetEnum.RT;
                    content = () => <RTContent tabId={tabId} />;
                    break;
                case "Pulse":
                    targetType = TargetEnum.Pulse;
                    content = () => <PulseContent folderPath={folderPath} tabId={tabId} />;
                    break;
            }

            await invoke("RegisterProcessor", { tabName: tabId, processorType: folderType });
            await invoke("SetDataPathCommand", { tabName: tabId, path: folderPath });
            await invoke("AnalyzeFolderCommand", { tabName: tabId });

            setTabs((prev) =>
                prev.map((tab) =>
                    tab.id === tabId
                        ? {
                            ...tab,
                            title: FolderTitle,
                            TargetType: targetType,
                            content,
                        }
                        : tab,
                ),
            );
            setCurrentTarget(targetType);
        } catch (e) {
            console.error("フォルダ判定エラー:", e);
            alert("フォルダの種類を判定できませんでした。\n" + e);
        }
    };

    // タブ削除
    const removeTab = async (id: string) => {
        const tabToRemove = tabs.find((t) => t.id === id);
        if (tabToRemove?.TargetType !== null) {
            await invoke("UnregisterProcessor", { tabName: id });
        }
        const newTabs = tabs.filter((t) => t.id !== id);
        setTabs(newTabs);
        if (id === currentTabId) {
            setCurrentTabId(newTabs[newTabs.length - 1]?.id || "");
        }
    };

    return (

        <TabGroup
            selectedIndex={tabs.findIndex((t) => t.id === currentTabId)}
            onChange={(index) => {
                const newTabId = tabs[index]?.id;
                if (newTabId) {
                    setCurrentTabId(newTabId);
                    const targetTab = tabs.find((t) => t.id === newTabId);
                    if (targetTab) {
                        setCurrentTarget(targetTab.TargetType ?? null);
                    }
                }
            }}
            className="flex flex-1 flex-col  w-full mx-auto text-white" id="dynamic-tabs-container"
        >
            <TabList className="flex flex-shrink-0 items-center p-0.5 bg-zinc-900">
                {tabs.map((tab) => (
                    <Tab
                        key={tab.id}
                        className={({ selected }) =>
                            `flex justify-between items-center gap-2 px-1 py-1 rounded-md cursor-pointer hover:bg-zinc-800
                        ${selected ? "bg-zinc-700" : "bg-transparent"}`
                        }
                    >
                        <span className="truncate text-sm ml-1 mr-1">{tab.title}</span>
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTab(tab.id);
                            }}
                            className="text-white hover:text-red-400 mr-1"
                        >
                            ×
                        </div>
                    </Tab>
                ))}
                <div
                    className="text-white hover:bg-zinc-800 ml-1 p-1 rounded-md items-center justify-center"
                    onClick={addTab}
                >
                    <Plus size={20} />
                </div>
            </TabList>


            <TopToolbar />


            <TabPanels className="text-black flex-grow flex flex-col h-full min-h-0" id={"tab-panels"}>
                {tabs.map((tab) => (
                    <TabPanel unmount={false} key={tab.id} className="w-full flex-grow flex flex-col" id="tab-panel">
                        {tab.content()}
                    </TabPanel>
                ))}
            </TabPanels>

        </TabGroup>
    );
};

export default DynamicTabs;
