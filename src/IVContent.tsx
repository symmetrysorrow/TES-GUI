import React, { useRef} from "react";
import { TabContentProps } from "@/FolderTab.tsx";

const IVContent: React.FC<TabContentProps> = ({ folderPath }) => {
    const isFirstRender = useRef(true);

    // 初めてレンダリングされた際に処理を行いたい
    if (isFirstRender.current) {
        console.log("IVContent: 初めてcontentとしてセットされました。フォルダパス:", folderPath);
        isFirstRender.current = false;
    }

    return (
        <div>
            <h2>IV 測定データ</h2>
            <p>選択されたフォルダ: {folderPath}</p>
        </div>
    );
};

export default IVContent;
