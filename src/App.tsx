import {TargetProvider} from "@/TargetContext.tsx";
import DynamicTabs from "@/FolderTab.tsx";
import {MantineProvider} from "@mantine/core";

function AppContent() {
  return (
    <div className="h-screen flex" id="app-container">
        <DynamicTabs/>
    </div>
  );
}

export default function App() {
  return (
      <MantineProvider>
          <TargetProvider>
              <AppContent />
          </TargetProvider>
      </MantineProvider>
  );
}
