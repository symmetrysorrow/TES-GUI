import DynamicTabs from "@/FolderTab.tsx";

function AppContent() {
  return (
    <div className="h-screen flex" id="app-container">
        <DynamicTabs/>
    </div>
  );
}

export default function App() {
  return (
      <AppContent />
  );
}
