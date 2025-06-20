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
  const [justUnpinnedFromMagnetized, setJustUnpinnedFromMagnetized] = useState<boolean>(false); // For cool-down
  
  const [isAnimatingPin, setIsAnimatingPin] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const prevRmbEnabledRef = useRef(isRmbControlEnabled); // Will now track context value

  // Removed burgerWrapperStyle and burgerWrapperClasses

  // useEffect for logging initial state loaded from localStorage and context
  useEffect(() => {
    // initialWasPinnedAndOpen and initialCustomPosition are available from outer scope
    console.log('[MainLayout] Initial State Loaded:', {
      localStorageRawInitialWasPinnedAndOpen: initialWasPinnedAndOpen,
      localStorageRawInitialCustomPosition: initialCustomPosition,
      initialContextRmbControlEnabled: isRmbControlEnabled,
      // Actual initial states of the component after useState initialization:
      initialSidebarOpenState: sidebarOpen,
      initialIsSidebarPinnedState: isSidebarPinned,
      initialSidebarPositionState: sidebarPosition,
      initialIsMagnetizedToLeftState: isMagnetizedToLeft
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount

  // useEffect for persisting isSidebarPinned state (general pinned state for content adaptation)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const valueToStore = isSidebarPinned && sidebarOpen;
      // SIDEBAR_PINNED_LS_KEY now tracks if the sidebar was open AND pinned (either magnetized or custom)
      localStorage.setItem(SIDEBAR_PINNED_LS_KEY, JSON.stringify(valueToStore));
      console.log('[MainLayout] Persisted Pinned State (SIDEBAR_PINNED_LS_KEY):', {
        isSidebarPinned,
        sidebarOpen,
        storedValue: valueToStore
      });
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
      // Default to open, pinned, and magnetized state.
      setSidebarOpen(true);
      setIsSidebarPinned(true);
      setSidebarPosition(null);
      setIsMagnetizedToLeft(true);
      setJustUnpinnedFromMagnetized(false); // Clear any cool-down
    } else if (!isRmbControlEnabled && prevRmbEnabledRef.current) { // RMB Toggled OFF
      // Default to collapsed, but conceptually pinned to the left (non-RMB mode default).
      setSidebarOpen(false);
      setIsSidebarPinned(true); // Default for non-RMB is pinned
      setIsMagnetizedToLeft(true); // Default for non-RMB is magnetized
      setSidebarPosition(null); // Default for non-RMB is at the edge
      setJustUnpinnedFromMagnetized(false); // Clear any cool-down
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
    const wasMagnetizedBeforeToggle = isMagnetizedToLeft; // Capture state before it's changed
    const newPinState = !isSidebarPinned;

    setIsSidebarPinned(newPinState);
    setSidebarOpen(true); // Sidebar remains open whether pinning or unpinning.
    setIsMagnetizedToLeft(false); // Pinning action always results in a custom pin or float, not auto-magnetized.

    if (!newPinState && wasMagnetizedBeforeToggle) { // If UNPINNING from a magnetized state
      setSidebarPosition({ x: LEFT_EDGE_OFFSET, y: LEFT_EDGE_OFFSET }); // Set to default top-left to float from there
      setJustUnpinnedFromMagnetized(true);
      console.log('[MainLayout] toggleSidebarPin: Unpinned from magnetized state, setting position and cool-down.');
    } else if (newPinState) { // If PINNING action (creating a custom pin)
      // If pinning and current position state is null (e.g., it was magnetized or default positioned from RBM toggle),
      // capture its current visual position from the ref to pin it there.
      // This is crucial for RBM ON mode when pinning a sidebar that was opened to default (null position).
      if (sidebarPosition === null && sidebarRef.current) {
        const rect = sidebarRef.current.getBoundingClientRect();
        setSidebarPosition({ x: rect.left, y: rect.top });
        console.log('[MainLayout] toggleSidebarPin: Pinning at current visual rect', { x: rect.left, y: rect.top });
      }
      // If sidebarPosition already exists (i.e., it was floating and dragged), it will pin at that existing state value.

      setJustUnpinnedFromMagnetized(false); // Clear cool-down, as this is a new deliberate state
      console.log('[MainLayout] toggleSidebarPin: Pinning action, clearing cool-down.');
    }
    // If unpinning from a non-magnetized state, justUnpinnedFromMagnetized remains as it was (likely false).
    
    setIsAnimatingPin(true);
    setTimeout(() => {
      setIsAnimatingPin(false); // End animation state after duration
    }, 300); // Match this duration with Sidebar's transition duration
  };

  const handleDragStartFromFloating = () => {
    if (justUnpinnedFromMagnetized) {
      console.log('[MainLayout] handleDragStartFromFloating: Resetting justUnpinnedFromMagnetized flag.');
      setJustUnpinnedFromMagnetized(false);
    }
  };
  
  const handleRequestClose = () => { // Called by Sidebar's internal close button or by clicking collapsed stub
    if (sidebarOpen) { // Action is to CLOSE the sidebar
      setSidebarOpen(false);
      if (isRmbControlEnabled) {
        // RBM ON: Closing makes it float (but closed). Position is retained.
        setIsSidebarPinned(false);
        setIsMagnetizedToLeft(false);
        // setJustUnpinnedFromMagnetized(false); // Closing a floating RBM sidebar doesn't trigger cool-down by itself
      } else {
        // RBM OFF: Closing keeps it conceptually pinned and magnetized to left.
        // States for isSidebarPinned, isMagnetizedToLeft, sidebarPosition should already be correct
        // (true, true, null respectively) from initial load or RBM toggle OFF.
        // No change needed to these for RBM OFF close.
      }
    } else { // Action is to OPEN the sidebar (from collapsed stub)
      setSidebarOpen(true);
      if (isRmbControlEnabled) {
        // RBM ON: Opening from stub snaps it to default magnetized pinned state
        setIsSidebarPinned(true);
        setIsMagnetizedToLeft(true);
        setSidebarPosition(null);
      } else {
        // RBM OFF: Opening from stub ensures it's in default magnetized pinned state
        setIsSidebarPinned(true);
        setIsMagnetizedToLeft(true);
        setSidebarPosition(null);
      }
      setJustUnpinnedFromMagnetized(false); // Opening always clears cool-down
    }
  };

  const LEFT_EDGE_OFFSET = 16; // 1rem
  const handleRequestMagnetSnap = (currentPosition: { x: number, y: number }) => {
    // Example: console.log('[MainLayout] handleRequestMagnetSnap: Entry', { currentPosition });
    console.log('[MainLayout] handleRequestMagnetSnap: Entry', { currentPosition });
    
    const newPos = { x: LEFT_EDGE_OFFSET, y: LEFT_EDGE_OFFSET }; // Standardized Y position
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
      {/* Global BurgerIcon REMOVED */}
      {/* Sidebar is now always rendered; its internal logic handles visibility/state */}
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
        justUnpinnedFromMagnetized={justUnpinnedFromMagnetized} // Pass down cool-down flag
        onDragStartFromFloating={handleDragStartFromFloating} // Pass down callback to reset flag
      />
      
      <div 
        className={cn(
          "h-full flex flex-col overflow-y-auto", 
          "pr-4 pb-4", 
          "transition-all duration-300 ease-in-out", 
          // Content adaptation logic: if magnetized to left and open, apply padding.
          (console.log('[MainLayout] Render: Content Adapt Check', { magnetized: isMagnetizedToLeft, open: sidebarOpen }), isMagnetizedToLeft && sidebarOpen ? "sm:pl-[296px] md:pl-[304px] lg:pl-[324px] pl-6" : "md:pl-20 pl-6")
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
