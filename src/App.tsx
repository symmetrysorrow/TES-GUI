import {TargetProvider} from "@/TargetContext.tsx";
import DynamicTabs from "@/FolderTab.tsx";

function AppContent() {
  return (
    <div className="h-screen flex flex-col">
        <DynamicTabs/>
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
