import { ReactNode, useEffect, useRef, useState } from "react"; // Keep useState for other states
// import { Header } from "./header"; // Header import REMOVED
import { BurgerIcon } from "@/components/ui"; // BurgerIcon import ADDED
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext"; // Import useSettings

// const RMB_SIDEBAR_CONTROL_LS_KEY = 'enableRmbSidebarControl'; // REMOVED - Context handles this key
const SIDEBAR_PINNED_LS_KEY = 'sidebarPinned'; // Key for persisting general pinned state (content adaptation)
const SIDEBAR_CUSTOM_POSITION_LS_KEY = 'sidebarCustomPosition'; // Key for custom pinned position

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
}

// Helper to read from localStorage
const getInitialLocalStorageBool = (key: string, defaultValue: boolean): boolean => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  }
  return defaultValue;
};

export function MainLayout({ children, className }: MainLayoutProps) {
  const { isRmbControlEnabled } = useSettings(); // Get RMB state from context

  // Initialize states from localStorage
  const initialWasPinnedAndOpen = getInitialLocalStorageBool(SIDEBAR_PINNED_LS_KEY, false);

  const getInitialCustomPosition = (): { x: number; y: number } | null => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(SIDEBAR_CUSTOM_POSITION_LS_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Basic validation for position object
          if (typeof parsed === 'object' && parsed !== null && 'x' in parsed && 'y' in parsed) {
            return parsed;
          } else {
            localStorage.removeItem(SIDEBAR_CUSTOM_POSITION_LS_KEY); // Clear invalid data
          }
        } catch (e) {
          localStorage.removeItem(SIDEBAR_CUSTOM_POSITION_LS_KEY); // Clear corrupted data
        }
      }
    }
    return null;
  };
  const initialCustomPosition = getInitialCustomPosition();

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(initialWasPinnedAndOpen);
  
  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(initialWasPinnedAndOpen);

  const [sidebarPosition, setSidebarPosition] = useState<{ x: number; y: number } | null>(() => {
    // If it was pinned and a custom position was stored, use it.
    // This assumes that if a custom position is stored, RBM mode was active, and it was pinned there.
    if (initialWasPinnedAndOpen && initialCustomPosition) {
      return initialCustomPosition;
    }
    return null; // Otherwise, default to null (magnetized or not open/pinned)
  });

  const [isMagnetizedToLeft, setIsMagnetizedToLeft] = useState<boolean>(() => {
    // Magnetized if it was pinned and open, but NO custom position was stored.
    return initialWasPinnedAndOpen && !initialCustomPosition;
  });
  
  const [isAnimatingPin, setIsAnimatingPin] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const prevRmbEnabledRef = useRef(isRmbControlEnabled); // Will now track context value

  // Removed burgerWrapperStyle and burgerWrapperClasses

  // useEffect for persisting isSidebarPinned state (general pinned state for content adaptation)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // SIDEBAR_PINNED_LS_KEY now tracks if the sidebar was open AND pinned (either magnetized or custom)
      localStorage.setItem(SIDEBAR_PINNED_LS_KEY, JSON.stringify(isSidebarPinned && sidebarOpen));
    }
  }, [isSidebarPinned, sidebarOpen]);

  // useEffect for persisting sidebarCustomPosition state
  useEffect(() => {
    let action = 'idle_or_custom_pos_invalid';
    if (typeof window !== 'undefined') {
      if (sidebarOpen && isSidebarPinned && !isMagnetizedToLeft && sidebarPosition) {
        localStorage.setItem(SIDEBAR_CUSTOM_POSITION_LS_KEY, JSON.stringify(sidebarPosition));
        action = 'saving custom position';
      } else {
        if (localStorage.getItem(SIDEBAR_CUSTOM_POSITION_LS_KEY) !== null) {
            localStorage.removeItem(SIDEBAR_CUSTOM_POSITION_LS_KEY);
            action = 'removing custom position';
        } else {
            action = 'no custom position to remove / already null';
        }
      }
    }
    // Example: console.log('[MainLayout] Persist Custom Pos Effect', { open: sidebarOpen, pinned: isSidebarPinned, magnetized: isMagnetizedToLeft, position: sidebarPosition, action: /* 'saving' or 'removing' */ });
    console.log('[MainLayout] Persist Custom Pos Effect', { open: sidebarOpen, pinned: isSidebarPinned, magnetized: isMagnetizedToLeft, positionVal: sidebarPosition, action });
  }, [sidebarPosition, isSidebarPinned, isMagnetizedToLeft, sidebarOpen]);


  // useEffect for when isRmbControlEnabled (from context) changes - this can override loaded states
  useEffect(() => {
    if (isRmbControlEnabled && !prevRmbEnabledRef.current) { // RMB Toggled ON
      // When RMB is enabled, default to open, pinned, and magnetized state, overriding any loaded custom pin.
      setSidebarOpen(true);
      setIsSidebarPinned(true);
      setSidebarPosition(null); // Null position means it will use default (magnetized)
      setIsMagnetizedToLeft(true);
    } else if (!isRmbControlEnabled && prevRmbEnabledRef.current) { // RMB Toggled OFF
      // When RMB is disabled, sidebar closes by default.
      // If it was custom pinned, that state is lost in favor of the default RBM disabled behavior.
      setSidebarOpen(false);
      setIsSidebarPinned(false);
      setIsMagnetizedToLeft(false);
      // sidebarPosition will be handled by handleRequestClose if user opens it
    }
    prevRmbEnabledRef.current = isRmbControlEnabled;
  }, [isRmbControlEnabled]);

  const toggleSidebar = () => {
    // If opening: Call setSidebarOpen(true) AND setIsSidebarPinned(true).
    // If closing: Call setSidebarOpen(false) AND setIsSidebarPinned(false).
    if (!sidebarOpen) {
      setSidebarOpen(true);
      setIsSidebarPinned(true); 
      setSidebarPosition(null); 
      setIsMagnetizedToLeft(true); // Magnetized when opened to default pinned state
    } else {
      setSidebarOpen(false);
      setIsSidebarPinned(false); 
      setIsMagnetizedToLeft(false);
    }
  };

  const toggleSidebarPin = () => {
    const newPinState = !isSidebarPinned;
    setIsSidebarPinned(newPinState);
    setIsAnimatingPin(true);

    if (newPinState) { // Pinning
      setSidebarOpen(true);
      if (sidebarPosition === null) { // Pinning to default left edge
        setIsMagnetizedToLeft(true);
      } else { // Pinning at a custom position
        setIsMagnetizedToLeft(false);
      }
    } else { // Unpinning
      setSidebarOpen(true); 
      setIsMagnetizedToLeft(false); // Unpinning always removes magnetization
    }
    
    setTimeout(() => {
      setIsAnimatingPin(false); // End animation state after duration
    }, 300); // Match this duration with Sidebar's transition duration
  };
  
  const handleRequestClose = () => { // This is called by the BurgerIcon INSIDE Sidebar
    if (isRmbControlEnabled) {
      // RBM Enabled: 'X' button on sidebar always closes and unpins/unmagnetizes
      setSidebarOpen(false);
      setIsSidebarPinned(false);
      setIsMagnetizedToLeft(false);
      // setSidebarPosition(null); // Optional: reset position if you want it to forget where it was
    } else {
      // RBM Disabled: Burger/X icon on sidebar toggles
      if (sidebarOpen) {
        setSidebarOpen(false);
        setIsSidebarPinned(false); // Content un-adapts
        setIsMagnetizedToLeft(false); // Not magnetized
      } else {
        setSidebarOpen(true);
        setIsSidebarPinned(true);  // Content adapts
        setSidebarPosition(null);  // Pins to default left
        setIsMagnetizedToLeft(true); // Magnetized to default left
      }
    }
  };

  const LEFT_EDGE_OFFSET = 16; // 1rem
  const handleRequestMagnetSnap = (currentPosition: { x: number, y: number }) => {
    // Example: console.log('[MainLayout] handleRequestMagnetSnap: Entry', { currentPosition });
    console.log('[MainLayout] handleRequestMagnetSnap: Entry', { currentPosition });
    
    const newPos = { x: LEFT_EDGE_OFFSET, y: currentPosition.y };
    const newMagnetState = true;
    const newPinState = true;
    const newOpenState = true;

    // Log intended values BEFORE async setState calls
    // Example: console.log('[MainLayout] handleRequestMagnetSnap: States Updated', { newPos: sidebarPosition, newMagnet: isMagnetizedToLeft, newPin: isSidebarPinned, newOpen: sidebarOpen });
    console.log('[MainLayout] handleRequestMagnetSnap: States Update Intent', { 
        currentSidebarPositionState: sidebarPosition, 
        currentIsMagnetizedState: isMagnetizedToLeft,
        currentIsPinnedState: isSidebarPinned,    
        currentIsOpenState: sidebarOpen,          
        newPosToSet: newPos, 
        newMagnetToSet: newMagnetState, 
        newPinToSet: newPinState, 
        newOpenToSet: newOpenState 
    });

    setSidebarPosition(newPos);
    setIsMagnetizedToLeft(newMagnetState);
    setIsSidebarPinned(newPinState);
    setSidebarOpen(newOpenState);
  };

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      if (!isRmbControlEnabled) {
        return; // RMB control not active, do nothing, allow default menu
      }

      if ((event as MouseEvent).button !== 2) { // Not a right-click
        return; // Do nothing, allow default menu for other mouse buttons if any
      }

      // From this point, RMB control is ON, and it IS a right-click
      
      if (isSidebarPinned && sidebarOpen && isMagnetizedToLeft) { // If magnetized, RMB does nothing but prevent menu
        event.preventDefault();
        return;
      }
      // If pinned but not magnetized (i.e., custom position), RMB might still be used to move/unpin later
      // For now, if pinned at custom, also prevent default. This simplifies logic.
      if (isSidebarPinned && sidebarOpen && !isMagnetizedToLeft) {
        event.preventDefault(); 
        // Potentially allow RMB to unpin from custom position in future? For now, no.
        return;
      }

      event.preventDefault(); 

      if (sidebarOpen) { // Sidebar is open and floating (not pinned, not magnetized)
        if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
          setSidebarOpen(false);
          // setIsSidebarPinned(false); // Already false
          // setIsMagnetizedToLeft(false); // Already false
        }
      } else { // Sidebar is closed
        setSidebarOpen(true);
        setIsSidebarPinned(false); 
        setIsMagnetizedToLeft(false);
        setSidebarPosition({ x: event.clientX, y: event.clientY });
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isRmbControlEnabled, sidebarOpen, isSidebarPinned, isMagnetizedToLeft, sidebarRef, setSidebarOpen, setIsSidebarPinned, setSidebarPosition, setIsMagnetizedToLeft]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event as MouseEvent).button !== 0) { 
        return;
      }
      if (
        sidebarOpen &&
        !isSidebarPinned && // Only close if it's floating
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setSidebarOpen(false);
        // setIsSidebarPinned(false); // Already false
        // setIsMagnetizedToLeft(false); // Already false
      }
    };

    // Add event listener for mousedown.
    // and can prevent other actions if needed, though click should also work.
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen, isSidebarPinned, sidebarRef]); // Minimal dependencies
  
  return (
    <div className="w-full h-screen"> 
      {/* Main BurgerIcon wrapper - always rendered, visibility controlled by opacity/scale */}
      <div
        className={cn(
          "fixed z-50 top-2 left-2", // Base position
          "transition-all duration-300 ease-in-out", // Transitions for opacity and transform (scale)
          // New condition: Visible if RMB is DISabled AND sidebar is closed
          (!isRmbControlEnabled && !sidebarOpen)
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-90 pointer-events-none" // Hidden state with slight scale down
        )}
      >
        <BurgerIcon
            isOpen={false} // This global burger is always an opener
            onClick={handleRequestClose} // When RBM is disabled, handleRequestClose toggles the sidebar
            className="text-slate-600 p-1 h-7 w-7 hover:bg-black/10 rounded-full backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-slate-500/70 flex items-center justify-center"
          />
        </div>
      )}
      <Sidebar 
        isOpen={sidebarOpen} 
        ref={sidebarRef} 
        isSidebarPinned={isSidebarPinned}
        isMagnetizedToLeft={isMagnetizedToLeft} // Pass down new state
        toggleSidebarPin={toggleSidebarPin}
        requestClose={handleRequestClose}
        setSidebarOpen={setSidebarOpen} 
        position={sidebarPosition}
        setSidebarPosition={setSidebarPosition}
        handleRequestMagnetSnap={handleRequestMagnetSnap} // Pass down new handler
        isAnimatingPin={isAnimatingPin} 
      />
      
      <div 
        className={cn(
          "h-full flex flex-col overflow-y-auto", 
          "pr-4 pb-4", 
          "transition-all duration-300 ease-in-out", 
          // Content adaptation logic: if magnetized to left and open, apply padding.
          (console.log('[MainLayout] Render: Content Adapt Check', { magnetized: isMagnetizedToLeft, open: sidebarOpen }), isMagnetizedToLeft && sidebarOpen ? "md:pl-[288px] pl-6" : "md:pl-20 pl-6")
        )}
      >
        <main 
          className={cn(
            "flex-1 isolate", 
            className 
          )}
        >
          <div className="h-full"> 
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
