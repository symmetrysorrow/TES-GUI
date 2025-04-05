import {useEffect, useRef} from "react";

type RTContentProps = {
    folderPath: string;
};

const RTContent: React.FC<RTContentProps> = ({ folderPath }) => {
    const mounted = useRef(false);

    useEffect(() => {
        if (mounted.current) {
            console.log("RTContent: フォルダパスが変更されました:", folderPath);
        } else {
            mounted.current = true;
        }
    }, [folderPath]);

    return (
        <div>
            <h2>RT 測定データ</h2>
            <p>選択されたフォルダ: {folderPath}</p>
        </div>
    );
};

export default RTContent;