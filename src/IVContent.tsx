import React, { useRef} from "react";

type IVContentProps = {
    folderPath: string;
};

const IVContent: React.FC<IVContentProps> = ({ folderPath }) => {
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
