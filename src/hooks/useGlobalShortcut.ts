import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export const useGlobalShortcut = () => {
  const toggleWindow = async () => {
    try {
      await invoke("toggle_window_visibility");
    } catch (error) {
      console.error("Failed to toggle window visibility:", error);
    }
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        unlisten = await listen("global-shortcut-pressed", () => {
          toggleWindow();
        });
      } catch (error) {
        console.error("Failed to setup global shortcut listener:", error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  return {
    toggleWindow,
  };
};