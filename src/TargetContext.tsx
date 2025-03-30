import { createContext, useContext, ReactNode, useState } from "react";

export enum TargetEnum {
    IV,RT,Pulse
}

interface TargetContextType{
    CurrentTarget: TargetEnum|null;
    setCurrentTarget: (target: TargetEnum|null) => void;
}

const TargetContext = createContext<TargetContextType | undefined>(undefined);

export function useTargetState() {
    const context = useContext(TargetContext);
    if (!context) {
        throw new Error("useTargetState must be used within a TargetProvider");
    }
    return context;
}

export function TargetProvider({ children }: { children: ReactNode }) {
    const [CurrentTarget, setCurrentTarget] = useState<TargetEnum|null>(null);
    return (
        <TargetContext.Provider value={{ CurrentTarget, setCurrentTarget }}>
            {children}
        </TargetContext.Provider>
    );
}