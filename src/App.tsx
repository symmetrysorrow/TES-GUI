import {TargetProvider} from "@/TargetContext.tsx";
import DynamicTabs from "@/FolderTab.tsx";

function AppContent() {
  return (
    <div className="flex h-full flex-col w-full">

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
