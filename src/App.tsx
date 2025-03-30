import {TargetEnum, TargetProvider, useTargetState} from "@/TargetContext.tsx";
import SideToolBar, {SideToolBarProvider} from "@/SideToolBar.tsx";
import {Button} from "@/components/ui/button.tsx";

function AppContent() {
    const {setCurrentTarget} = useTargetState();
  return (
    <div className="flex h-screen">
        <SideToolBarProvider>
        <SideToolBar>
        <div className="flex-1 p-4">
          <h1 className="text-2xl font-bold">Main Content Area</h1>
          <p>This is where the main content will go.</p>
            <Button onClick={()=>setCurrentTarget(TargetEnum.IV)}>
                IV
            </Button>
            <Button onClick={()=>setCurrentTarget(TargetEnum.RT)}>
                RT
            </Button>
        </div>
        </SideToolBar>
        </SideToolBarProvider>
    </div>

  );
}

export default function App() {
  return (
      <TargetProvider>
          <AppContent />
      </TargetProvider>
  );
}
