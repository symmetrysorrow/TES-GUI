import React, { useState, useEffect, useRef, ReactNode } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import IVContent from "@/Content/IVContent.tsx";
import RTContent from "@/Content/RTContent.tsx";
import {PulseContent} from "@/Content/PulseContent.tsx";

enum TargetEnum {
    IV,RT,Pulse
}

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

    const NewTabContent: React.FC<{ id: string }> = () => (
        <div className="flex flex-col h-full">
            <FolderDropArea>
                <Button onClick={handleDialog}>
                    フォルダを開く
                </Button>
            </FolderDropArea>
        </div>
    );

    const FolderDropArea: React.FC<{ children?: ReactNode }> = ({ children }) => {
        const [backgroundClass, setBackgroundClass] = useState("bg-transparent");
        const [message, setMessage] = useState("");

        useEffect(() => {
            // unlisten 用の変数を用意
            let unlistenDrop: (() => void) | null = null;
            let unlistenEnter: (() => void) | null = null;
            let unlistenLeave: (() => void) | null = null;

            // 即時実行 async 関数で setup
            (async () => {
                try {
                    unlistenDrop = await listen("tauri://drag-drop", async (e: any) => {
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

                    unlistenEnter = await listen("tauri://drag-enter", () => {
                        setBackgroundClass("bg-amber-200/60");
                    });

                    unlistenLeave = await listen("tauri://drag-leave", () => {
                        setBackgroundClass("bg-transparent");
                    });
                } catch (error) {
                    console.error("Failed to set up listeners:", error);
                }
            })();

            // クリーンアップ関数
            return () => {
                if (unlistenDrop) unlistenDrop();
                if (unlistenEnter) unlistenEnter();
                if (unlistenLeave) unlistenLeave();
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

    const handleDialog = async () => {
        const selected = await open({ directory: true });
        if (selected) await handleOpenFolder(selected as string);
    };

    const handleOpenFolder = async (folderPath: string) => {
        const tabId = currentTabIdRef.current;
        const FolderTitle = getFolderName(folderPath);
        try {
            const folderType: string = await invoke("FindFolderType", { folder: folderPath });
            let targetType: TargetEnum | null = null;
            let content = () => <></>;

            await invoke("RegisterProcessor", { tabName: tabId, processorType: folderType });
            await invoke("SetDataPathCommand", { tabName: tabId, path: folderPath });

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
                    content = () => <PulseContent tabId={tabId} />;
                    break;
            }

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
        } catch (e) {
            console.error("フォルダ判定エラー:", e);
            alert("フォルダの種類を判定できませんでした。\n" + e);
        }
    };

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
                    //const targetTab = tabs.find((t) => t.id === newTabId);
                }
            }}
            className="flex flex-1 flex-col h-full w-full mx-auto text-black" id="dynamic-tabs-container"
        >
            <TabList className="
                flex flex-shrink-0 items-center p-0.5 bg-zinc-300
                overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-zinc-400 scrollbar-track-transparent"
            >
                {tabs.map((tab) => (
                    <Tab
                        key={tab.id}
                        className={({ selected }) =>
                            `flex justify-between items-center gap-2 px-1 py-1 rounded-md cursor-pointer hover:bg-zinc-200
                        ${selected ? "bg-zinc-100" : "bg-transparent"}`
                        }
                    >
                        <span className="truncate text-sm ml-1 mr-1">{tab.title}</span>
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTab(tab.id);
                            }}
                            className="text-black hover:text-red-400 mr-1 "
                        >
                            ×
                        </div>
                    </Tab>
                ))}
                <div
                    className="text-black hover:bg-zinc-200 ml-1 p-1 rounded-md items-center justify-center"
                    onClick={addTab}
                >
                    <Plus size={20} />
                </div>
            </TabList>

            <TabPanels className="text-black bg-zinc-100 flex-grow flex flex-col min-h-0" id={"tab-panels"}>
                {tabs.map((tab) => (
                    <TabPanel unmount={false} key={tab.id} className="w-full h-full flex-grow flex flex-col" id="tab-panel">
                        {tab.content()}
                    </TabPanel>
                ))}
            </TabPanels>

        </TabGroup>
    );
};

export default DynamicTabs;
