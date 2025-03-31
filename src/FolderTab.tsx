import { ReactNode, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TargetEnum, useTargetState } from "@/TargetContext.tsx";
import { Plus } from "lucide-react"; // アイコンを追加
import SideToolBar, { SideToolBarProvider } from "./SideToolBar";

type TabItem = {
    id: string;
    title: string;
    content: ReactNode;
    TargetType: TargetEnum | null;
};

const DynamicTabs = () => {
    const { setCurrentTarget } = useTargetState();

    const [tabs, setTabs] = useState<TabItem[]>([
        {
            id: "account",
            title: "Account",
            TargetType: TargetEnum.IV,
            content: <p>Make changes to your account here.</p>,
        },
        {
            id: "password",
            title: "Password",
            TargetType: TargetEnum.RT,
            content: (
                <div>
                    <h2 className="text-xl font-bold">Change your password</h2>
                    <input type="password" className="border mt-2" placeholder="Enter new password" />
                </div>
            ),
        },
    ]);

    const addTab = () => {
        const newId = `tab-${tabs.length}`;
        setTabs([
            ...tabs,
            {
                id: newId,
                title: `Tab ${tabs.length + 1}`,
                content: (
                    <div>
                        <h2 className="text-lg font-semibold">Content for Tab {tabs.length + 1}</h2>
                        <p>This is dynamically added content.</p>
                    </div>
                ),
                TargetType: null,
            },
        ]);
    };

    const removeTab = (id: string) => {
        setTabs(tabs.filter((tab) => tab.id !== id));
    };

    const handleTabChange = (selectedTabId: string) => {
        const selectedTab = tabs.find((tab) => tab.id === selectedTabId);
        if (selectedTab) {
            setCurrentTarget(selectedTab.TargetType ?? null);
        }
    };

    return (
        <div className="w-full  mx-auto bg-[#1f1f23] text-white min-h-screen flex flex-col">
            {/* タブ全体 */}
            <Tabs defaultValue={tabs[0]?.id} onValueChange={handleTabChange} className="h-full flex flex-col w-full">

                {/* タブバー */}
                <TabsList className="flex flex-glow bg-transparent rounded-t-lg w-full justify-start">
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className="min-w-[100px] max-w-[200px] px-4 py-2 appearance-none data-[state=active]:bg-[#343438] data-[state=active]:text-white text-gray-450 hover:bg-gray-700 hover:text-gray-400 last:border-r-0"
                        >
                            {tab.title}
                            <span
                                className="ml-2 text-white hover:text-red-300 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeTab(tab.id);
                                }}
                            >
                        ×
                        </span>
                        </TabsTrigger>
                    ))}
                    <Plus size={20} onClick={addTab}/>
                </TabsList>

                {/* サイドバーとコンテンツを横並びに配置 */}
                <div className="flex flex-grow w-full">
                    {/* サイドバー */}
                    <SideToolBarProvider>
                        <SideToolBar/>
                    </SideToolBarProvider>

                    {/* タブのコンテンツ */}
                    <div className="flex-grow p-4 bg-gray-900 text-white rounded-b-lg">
                        {tabs.map((tab) => (
                            <TabsContent
                                key={tab.id}
                                value={tab.id}
                                className="h-full w-full"
                            >
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
