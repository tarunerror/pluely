import { Card, Settings, Updater } from "./components";
import { Completion } from "./components/completion";
import { ChatHistory } from "./components/history";
import { useWindowBehavior, useGlobalShortcut } from "./hooks";

const App = () => {
  // Initialize smart window behavior that respects system interactions
  useWindowBehavior({
    maintainAlwaysOnTop: true,
    respectSystemInteractions: true,
    autoHideOnSystemInteraction: true,
    focusCheckInterval: 2000,
    onFocusLost: () => {
      // Don't log every focus loss to avoid spam
    },
    onFocusGained: () => {
      // Window regained focus naturally
    },
  });

  // Initialize global shortcut for Ctrl/Cmd + /
  useGlobalShortcut();
  const handleSelectConversation = (conversation: any) => {
    // Use localStorage to communicate the selected conversation to Completion component
    localStorage.setItem("selectedConversation", JSON.stringify(conversation));
    // Trigger a custom event to notify Completion component
    window.dispatchEvent(
      new CustomEvent("conversationSelected", {
        detail: conversation,
      })
    );
  };

  const handleNewConversation = () => {
    // Clear any selected conversation and trigger new conversation
    localStorage.removeItem("selectedConversation");
    window.dispatchEvent(new CustomEvent("newConversation"));
  };

  return (
    <div className="w-screen h-screen flex overflow-hidden justify-center items-start">
      <Card className="w-full flex flex-row items-center gap-2 p-2 relative">
        {/* Drag region for window movement - like Cluely's dot bar */}
        <div 
          data-tauri-drag-region 
          className="absolute top-0 left-0 right-0 h-3 bg-transparent cursor-move z-10"
          title="Drag to move window"
        />
        <Completion />
        <ChatHistory
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          currentConversationId={null}
        />
        <Settings />
        <Updater />
      </Card>
    </div>
  );
};

export default App;
