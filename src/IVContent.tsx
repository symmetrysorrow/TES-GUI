import { useEffect } from "react";

type IVContentProps = {
    folderPath: string;
};

const IVContent: React.FC<IVContentProps> = ({ folderPath }) => {
    useEffect(() => {
        console.log("IVContent: フォルダパスが変更されました:", folderPath);
        // ここでフォルダパスに基づいた処理を実装
    }, [folderPath]);

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold">IV 測定データ</h2>
            <p>選択されたフォルダ: {folderPath}</p>
            {/* ここに IV 測定データの表示コンポーネントを追加 */}
        </div>
    );
};

export default IVContent;
