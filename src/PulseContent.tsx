import {useEffect, useRef} from "react";

type PulseContentProps = {
    folderPath: string;
};

const PulseContent: React.FC<PulseContentProps> = ({ folderPath }) => {
    const mounted = useRef(false);

    useEffect(() => {
        if (mounted.current) {
            console.log("PulseContent: フォルダパスが変更されました:", folderPath);
        } else {
            mounted.current = true;
        }
    }, [folderPath]);

    return (
        <div>
            <h2>Pulse 測定データ</h2>
            <p>選択されたフォルダ: {folderPath}</p>
        </div>
    );
};

export default PulseContent;