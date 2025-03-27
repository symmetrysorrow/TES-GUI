"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen">
      {/* サイドバー */}
      <div
        className={cn(
          "transition-all bg-gray-800 text-white p-4",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        <Button
          variant="ghost"
          className="w-full mb-4"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? "閉じる" : "開く"}
        </Button>
        <div className="space-y-2">
          <Button variant="ghost" className="w-full">
            Home
          </Button>
          <Button variant="ghost" className="w-full">
            Settings
          </Button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex flex-col flex-1">
        {/* メニューバー */}
        <div className="bg-gray-900 text-white p-3 flex justify-between">
          <div>File</div>
          <div>Help</div>
        </div>

        {/* タブ */}
        <Tabs defaultValue="tab1" className="p-4">
          <TabsList>
            <TabsTrigger value="tab1">タブ1</TabsTrigger>
            <TabsTrigger value="tab2">タブ2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">
            <p>タブ1の内容</p>
          </TabsContent>
          <TabsContent value="tab2">
            <p>タブ2の内容</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
