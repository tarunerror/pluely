import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useCallback, useEffect } from "react";

export const useWindowResize = () => {
  const resizeWindow = useCallback(async (expanded: boolean) => {
    try {
      const window = getCurrentWebviewWindow();
      const newHeight = expanded ? 600 : 54;

      await invoke("set_window_height", {
        window,
        height: newHeight,
      });
    } catch (error) {
      console.error("Failed to resize window:", error);
    }
  }, []);

  return { resizeWindow };
};

export const useAlwaysOnTop = () => {
  const setAlwaysOnTop = useCallback(async (alwaysOnTop: boolean) => {
    try {
      const window = getCurrentWebviewWindow();
      await invoke("set_always_on_top", {
        window,
        alwaysOnTop,
      });
    } catch (error) {
      console.error("Failed to set always on top:", error);
    }
  }, []);

  const bringToFront = useCallback(async () => {
    try {
      const window = getCurrentWebviewWindow();
      await invoke("bring_to_front", { window });
    } catch (error) {
      console.error("Failed to bring window to front:", error);
    }
  }, []);

  const setWindowFocus = useCallback(async (focused: boolean) => {
    try {
      const window = getCurrentWebviewWindow();
      await invoke("set_window_focus", {
        window,
        focused,
      });
    } catch (error) {
      console.error("Failed to set window focus:", error);
    }
  }, []);

  const temporaryDisableAlwaysOnTop = useCallback(async (durationMs: number = 2000) => {
    try {
      const window = getCurrentWebviewWindow();
      await invoke("temporary_disable_always_on_top", {
        window,
        durationMs,
      });
    } catch (error) {
      console.error("Failed to temporarily disable always on top:", error);
    }
  }, []);

  return { setAlwaysOnTop, bringToFront, setWindowFocus, temporaryDisableAlwaysOnTop };
};

interface UseWindowFocusOptions {
  onFocusLost?: () => void;
  onFocusGained?: () => void;
}

export const useWindowFocus = ({
  onFocusLost,
  onFocusGained,
}: UseWindowFocusOptions = {}) => {
  const handleFocusChange = useCallback(
    async (focused: boolean) => {
      if (focused && onFocusGained) {
        onFocusGained();
      } else if (!focused && onFocusLost) {
        onFocusLost();
      }
    },
    [onFocusLost, onFocusGained]
  );

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupFocusListener = async () => {
      try {
        const window = getCurrentWebviewWindow();

        // Listen to focus change events
        unlisten = await window.onFocusChanged(({ payload: focused }) => {
          handleFocusChange(focused);
        });
      } catch (error) {
        console.error("Failed to setup focus listener:", error);
      }
    };

    setupFocusListener();

    // Cleanup
    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [handleFocusChange]);
};
