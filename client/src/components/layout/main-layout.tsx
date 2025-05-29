import { ReactNode, useEffect, useRef, useState } from "react"; // Keep useState for other states
// import { Header } from "./header"; // Header import REMOVED
import { BurgerIcon } from "@/components/ui"; // BurgerIcon import ADDED
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext"; // Import useSettings

// const RMB_SIDEBAR_CONTROL_LS_KEY = 'enableRmbSidebarControl'; // REMOVED - Context handles this key
const SIDEBAR_PINNED_LS_KEY = 'sidebarPinned'; // Key for persisting adapted state

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

  // Initialize isSidebarPinned (content adaptation state)
  const initialIsPinnedFromStorage = getInitialLocalStorageBool(SIDEBAR_PINNED_LS_KEY, false);
  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(initialIsPinnedFromStorage);

  // Initialize sidebarOpen state
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(initialIsPinnedFromStorage); 
  
  const [sidebarPosition, setSidebarPosition] = useState<{ x: number, y: number } | null>(null);
  const [isAnimatingPin, setIsAnimatingPin] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const prevRmbEnabledRef = useRef(isRmbControlEnabled); // Will now track context value

  // Removed burgerWrapperStyle and burgerWrapperClasses

  // useEffect for persisting isSidebarPinned state (adapted state)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIDEBAR_PINNED_LS_KEY, JSON.stringify(isSidebarPinned && sidebarOpen));
    }
  }, [isSidebarPinned, sidebarOpen]);

  // Removed useEffect for 'storage' event listening for RMB_SIDEBAR_CONTROL_LS_KEY
  // Context provider handles localStorage updates and reactivity for isRmbControlEnabled.

  // useEffect for when isRmbControlEnabled (from context) changes
  useEffect(() => {
    // If isRmbControlEnabled has changed from false to true (i.e., was just toggled ON)
    if (isRmbControlEnabled && !prevRmbEnabledRef.current) {
      setSidebarOpen(true);
      setIsSidebarPinned(true);
      setSidebarPosition(null); 
    }
    // If isRmbControlEnabled has changed from true to false (i.e., was just toggled OFF)
    else if (!isRmbControlEnabled && prevRmbEnabledRef.current) {
      setSidebarOpen(false);
      setIsSidebarPinned(false);
    }
    prevRmbEnabledRef.current = isRmbControlEnabled;
  }, [isRmbControlEnabled]); // Dependencies: isRmbControlEnabled (from context)

  const toggleSidebar = () => {
    // If opening: Call setSidebarOpen(true) AND setIsSidebarPinned(true).
    // If closing: Call setSidebarOpen(false) AND setIsSidebarPinned(false).
    if (!sidebarOpen) {
      setSidebarOpen(true);
      setIsSidebarPinned(true); // Content adapts, sidebar uses default pinned position
      setSidebarPosition(null); // Ensure it uses default pinned position
    } else {
      setSidebarOpen(false);
      setIsSidebarPinned(false); // Content un-adapts
    }
  };

  const toggleSidebarPin = () => {
    // This function is called when the pin button *inside* the sidebar is clicked.
    // It should toggle the isSidebarPinned state.
    const newPinState = !isSidebarPinned;
    setIsSidebarPinned(newPinState);
    setIsAnimatingPin(true); // Start animation state

    if (newPinState) { // Pinning
      setSidebarOpen(true); // Ensure it's open
      setSidebarPosition(null); // Use default pinned position
    } else { // Unpinning
      setSidebarOpen(true); // Sidebar remains open but now follows unpinned/floating logic
      // Position might be set by RMB click later, or it defaults if not.
      // If it was previously RMB opened at a position, that position is lost here, which is acceptable.
      // User can re-open with RMB if they want specific floating position.
    }
    
    setTimeout(() => {
      setIsAnimatingPin(false); // End animation state after duration
    }, 300); // Match this duration with Sidebar's transition duration
  };
  
  const handleRequestClose = () => {
    // Called by Sidebar's internal close burger.
    // Should set setSidebarOpen(false) AND setIsSidebarPinned(false).
    setSidebarOpen(false);
    setIsSidebarPinned(false);
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
      
      if (isSidebarPinned && sidebarOpen) {
        // Sidebar is already open and pinned. Do nothing with sidebar. Prevent default menu.
        event.preventDefault();
        return;
      }

      // RMB control is ON, it's a right-click, and sidebar is NOT (open + pinned).
      // This means sidebar is either closed, or open but floating.
      event.preventDefault(); // Now we are definitely handling it.

      if (sidebarOpen) { // Sidebar is open and floating
        // If click is outside the floating sidebar, close it.
        if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
          setSidebarOpen(false);
          setIsSidebarPinned(false); // Should already be false, but good to be sure
        }
        // If click is inside the floating sidebar, do nothing.
      } else { // Sidebar is closed
        // Open sidebar floating at click position
        setSidebarOpen(true);
        setIsSidebarPinned(false); // Ensure it opens as floating
        setSidebarPosition({ x: event.clientX, y: event.clientY });
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isRmbControlEnabled, sidebarOpen, isSidebarPinned, sidebarRef, setSidebarOpen, setIsSidebarPinned, setSidebarPosition]); // Updated dependencies

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event as MouseEvent).button !== 0) { 
        return;
      }
      if (
        sidebarOpen &&
        !isSidebarPinned && // Only close if it's floating (not content-adapted)
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setSidebarOpen(false);
        setIsSidebarPinned(false); // Ensure content un-adapts
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
          (!isRmbControlEnabled && !sidebarOpen) // Condition for visibility
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-90 pointer-events-none" // Hidden state with slight scale down
        )}
      >
        <BurgerIcon
            isOpen={false} // Always a burger, as it's the opener
            onClick={toggleSidebar}
            className="text-slate-600 p-1 h-7 w-7 hover:bg-black/10 rounded-full backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-slate-500/70 flex items-center justify-center"
          />
        </div>
      )}
      <Sidebar 
        isOpen={sidebarOpen} 
        ref={sidebarRef} 
        isSidebarPinned={isSidebarPinned} // This now means "content is adapted"
        toggleSidebarPin={toggleSidebarPin} // For the pin button inside Sidebar
        requestClose={handleRequestClose} // For the close button inside Sidebar
        setSidebarOpen={setSidebarOpen} 
        position={sidebarPosition} 
        isAnimatingPin={isAnimatingPin} 
      />
      
      <div 
        className={cn(
          "h-full flex flex-col overflow-y-auto", 
          "pr-4 pb-4", 
          "transition-all duration-300 ease-in-out", 
          // Content adaptation logic: if isSidebarPinned is true (and sidebarOpen must be true for this state), apply padding.
          isSidebarPinned ? "md:pl-[288px] pl-6" : "md:pl-20 pl-6" 
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
