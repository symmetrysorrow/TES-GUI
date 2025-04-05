import React, { useEffect, useRef } from "react";

// Props型
type RTContentProps = {
    folderPath: string | null;
};

// メモ化されたコンポーネントに変更
const RTContent: React.FC<RTContentProps> = ({ folderPath }) => {
    const mounted = useRef(false);

    useEffect(() => {
        if (!mounted.current) {
            // 初回作成時のみログを出力
            console.log("RTContent: 初回作成時にのみフォルダパスを出力", folderPath);
            mounted.current = true; // 初回マウント後にフラグを立てる
        } else {
            // タブ切り替え時には出力しない
            console.log("RTContent: フォルダパスが変更されました:", folderPath);
        }
    }, [folderPath]);

    return (
        <div>
            <h2>RT 測定データ</h2>
            <p>選択されたフォルダ: {folderPath}</p>
        </div>
    );
};

// React.memo を使用してコンポーネントをメモ化
export default React.memo(RTContent);
