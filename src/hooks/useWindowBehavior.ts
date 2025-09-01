import { useEffect, useCallback, useRef } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { useAlwaysOnTop } from "./useWindow";

interface UseWindowBehaviorOptions {
  maintainAlwaysOnTop?: boolean;
  respectSystemInteractions?: boolean;
  autoHideOnSystemInteraction?: boolean;
  focusCheckInterval?: number;
  onFocusLost?: () => void;
  onFocusGained?: () => void;
}

export const useWindowBehavior = ({
  maintainAlwaysOnTop = true,
  respectSystemInteractions = true,
  autoHideOnSystemInteraction = false,
  focusCheckInterval = 2000,
  onFocusLost,
  onFocusGained,
}: UseWindowBehaviorOptions = {}) => {
  const focusCheckRef = useRef<NodeJS.Timeout | null>(null);
  const currentlyFocused = useRef<boolean>(false);
  const userInteracting = useRef<boolean>(false);
  const lastUserInteraction = useRef<number>(Date.now());
  const systemInteractionDetected = useRef<boolean>(false);
  
  const { temporaryDisableAlwaysOnTop } = useAlwaysOnTop();

  const bringToFront = useCallback(async () => {
    try {
      const window = getCurrentWebviewWindow();
      
      // Only enforce always on top if we're not detecting system interactions
      if (maintainAlwaysOnTop && !systemInteractionDetected.current) {
        await invoke("set_always_on_top", {
          window,
          alwaysOnTop: true,
        });
      }
      
      // Bring to front only if user is actively interacting with our app
      if (userInteracting.current) {
        await invoke("bring_to_front", { window });
        await invoke("set_window_focus", {
          window,
          focused: true,
        });
      }
    } catch (error) {
      console.error("Failed to bring window to front:", error);
    }
  }, [maintainAlwaysOnTop]);

  const checkWindowFocus = useCallback(async () => {
    try {
      const window = getCurrentWebviewWindow();
      const isFocused = await window.isFocused();
      
      if (isFocused !== currentlyFocused.current) {
        currentlyFocused.current = isFocused;
        
        if (isFocused) {
          onFocusGained?.();
          userInteracting.current = true;
          lastUserInteraction.current = Date.now();
          systemInteractionDetected.current = false;
        } else {
          onFocusLost?.();
          userInteracting.current = false;
        }
      }
      
      // Check if user interaction has timed out
      const timeSinceLastInteraction = Date.now() - lastUserInteraction.current;
      if (timeSinceLastInteraction > 3000) { // 3 seconds timeout
        userInteracting.current = false;
      }
      
      // Maintain always on top behavior, but be less aggressive
      if (maintainAlwaysOnTop && !systemInteractionDetected.current && timeSinceLastInteraction < 5000) {
        await invoke("set_always_on_top", {
          window,
          alwaysOnTop: true,
        });
      }
    } catch (error) {
      console.error("Failed to check window focus:", error);
    }
  }, [maintainAlwaysOnTop, onFocusLost, onFocusGained]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Detect Alt+Tab and other system shortcuts
    if (respectSystemInteractions) {
      if (
        (event.altKey && event.key === 'Tab') ||
        (event.metaKey && event.key === 'Tab') ||
        (event.ctrlKey && event.altKey && event.key === 'Delete') ||
        (event.metaKey && event.key === ' ') // Mac Spotlight
      ) {
        systemInteractionDetected.current = true;
        userInteracting.current = false;
        
        // Temporarily disable always on top to allow system interactions
        if (autoHideOnSystemInteraction) {
          temporaryDisableAlwaysOnTop(3000); // Disable for 3 seconds
        }
      }
    }
  }, [respectSystemInteractions, autoHideOnSystemInteraction]);

  const handleUserInteraction = useCallback(() => {
    lastUserInteraction.current = Date.now();
    userInteracting.current = true;
    systemInteractionDetected.current = false;
  }, []);

  const handleWindowBlur = useCallback(() => {
    // Only react to blur if it's not a system interaction
    if (!systemInteractionDetected.current && respectSystemInteractions) {
      setTimeout(() => {
        userInteracting.current = false;
      }, 500);
    }
  }, [respectSystemInteractions]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      systemInteractionDetected.current = true;
      userInteracting.current = false;
    } else {
      setTimeout(() => {
        systemInteractionDetected.current = false;
      }, 1000);
    }
  }, []);

  const startFocusMonitoring = useCallback(() => {
    if (focusCheckRef.current) {
      clearInterval(focusCheckRef.current);
    }
    
    focusCheckRef.current = setInterval(checkWindowFocus, focusCheckInterval);
  }, [checkWindowFocus, focusCheckInterval]);

  const stopFocusMonitoring = useCallback(() => {
    if (focusCheckRef.current) {
      clearInterval(focusCheckRef.current);
      focusCheckRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Initialize behavior
    if (maintainAlwaysOnTop) {
      bringToFront();
    }

    // Start monitoring
    startFocusMonitoring();

    // Add event listeners for smart behavior
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    
    // Add interaction listeners
    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("keydown", handleUserInteraction);
    document.addEventListener("mousemove", handleUserInteraction);

    // Cleanup
    return () => {
      stopFocusMonitoring();
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
      document.removeEventListener("mousemove", handleUserInteraction);
    };
  }, [
    maintainAlwaysOnTop,
    bringToFront,
    startFocusMonitoring,
    stopFocusMonitoring,
    handleKeyDown,
    handleVisibilityChange,
    handleWindowBlur,
    handleUserInteraction,
  ]);

  return {
    bringToFront,
    startFocusMonitoring,
    stopFocusMonitoring,
    checkWindowFocus,
  };
};