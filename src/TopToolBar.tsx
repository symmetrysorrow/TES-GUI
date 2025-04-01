import {Printer,Settings} from "lucide-react";
import {useTargetState,TargetEnum} from "@/TargetContext.tsx";
import {Button} from "@/components/ui/button";

export const TopToolbar=()=> {
    const {CurrentTarget} = useTargetState();
    const handlePrint = () => {
        switch(CurrentTarget){
            case TargetEnum.IV:
                console.log("IV Print");
                break;
            case TargetEnum.RT:
                console.log("RT Print");
                break;
            case TargetEnum.Pulse:
                console.log("Pulse Print");
                break;
            default:
                console.log("No target selected");
                break;
        }
    }

    const handleSettings = () => {
        switch(CurrentTarget){
            case TargetEnum.IV:
                console.log("IV Settings");
                break;
            case TargetEnum.RT:
                console.log("RT Settings");
                break;
            case TargetEnum.Pulse:
                console.log("Pulse Settings");
                break;
            default:
                console.log("No target selected");
                break;
        }
    }

    return (
        <div className="flex justify-between items-center bg-[#3b3b3f] text-white shadow-md">
            <div className="text-xl font-semibold flex-1 text-center">{CurrentTarget}</div>
            <div className="flex">
                <Button variant="ghost" onClick={handlePrint}>
                    <Printer className="w-6 h-6" />
                </Button>
                <Button variant="ghost" onClick={handleSettings}>
                    <Settings className="w-6 h-6" />
                </Button>
            </div>
        </div>
    );
}