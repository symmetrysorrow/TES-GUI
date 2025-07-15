import React from "react";

const PulseContent: React.FC<string> = ({ tabId }) => {

    return (
        <div>
            <h2>Pulse 測定データ</h2>
            <h2>tab:{tabId}</h2>
        </div>
    );
};

export default PulseContent;