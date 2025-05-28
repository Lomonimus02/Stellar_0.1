import { useState, ReactNode, useEffect, useRef } from "react";
// import { Header } from "./header"; // Header import removed
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
}

// Helper function to get initial pin state from localStorage
const getInitialPinState = (): boolean => {
  // Ensure localStorage is accessed only on the client-side
  if (typeof window !== 'undefined') {
    const storedPinState = localStorage.getItem('sidebarPinned');
    return storedPinState ? JSON.parse(storedPinState) : false;
  }
  return false;
};

export function MainLayout({ children, className }: MainLayoutProps) {
  const initialPinnedState = getInitialPinState();
  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(initialPinnedState);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(initialPinnedState); // Sidebar is open if it was pinned
  const [sidebarPosition, setSidebarPosition] = useState<{ x: number, y: number } | null>(null);
  const [isAnimatingPin, setIsAnimatingPin] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState(false); // isMobile state remains
  const sidebarRef = useRef<HTMLElement | null>(null);

  // Effect to save pin state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarPinned', JSON.stringify(isSidebarPinned));
    }
  }, [isSidebarPinned]);

  const toggleSidebar = () => {
    if (isSidebarPinned && sidebarOpen) {
      return;
    }
    const newOpenState = !sidebarOpen;
    setSidebarOpen(newOpenState);
    if (!newOpenState) { // If sidebar is being closed
      setSidebarPosition(null);
    }
    // If opening, position is set by handleContextMenu or when pinned
  };

  const toggleSidebarPin = () => {
    setIsAnimatingPin(true); // Start animation state

    const newPinState = !isSidebarPinned;
    setIsSidebarPinned(newPinState);
    setSidebarPosition(null); // Important: for pinned state, position is null to use default styles

    if (newPinState) {
      setSidebarOpen(true);
    }
    // If unpinning a closed sidebar, it remains closed.
    // If unpinning an open sidebar, it remains open (at default 1rem,1rem until next dynamic placement).

    setTimeout(() => {
      setIsAnimatingPin(false); // End animation state after duration
    }, 300); // Match this duration with Sidebar's transition duration
  };
  
  const handleRequestClose = () => {
    if (!isSidebarPinned) {
      setSidebarOpen(false);
      // setSidebarPosition(null); // REMOVED as per instruction
    }
  };

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      console.log('[MainLayout] handleContextMenu: contextmenu event triggered. Button:', (event as MouseEvent).button);
      if ((event as MouseEvent).button !== 2) {
        console.log('[MainLayout] handleContextMenu: Ignored due to not being a right-click (button:', (event as MouseEvent).button, ')');
        return;
      }
      if (isSidebarPinned) { // If pinned, right-click does nothing to position/state
        return;
      }

      if (sidebarOpen) {
        // If sidebar is open, a right click outside of it closes it.
        if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
          console.log('[MainLayout] handleContextMenu: Right-click outside. Closing sidebar.');
          setSidebarOpen(false);
          // setSidebarPosition(null); // REMOVED as per instruction
        }
        // If right-click is inside an already open sidebar, do nothing.
      } else {
        // If sidebar is closed, open it at click position.
        console.log('[MainLayout] handleContextMenu: Right-click. Opening sidebar at', { x: event.clientX, y: event.clientY });
        setSidebarOpen(true);
        setSidebarPosition({ x: event.clientX, y: event.clientY });
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isSidebarPinned, toggleSidebar, sidebarOpen]); // Keep toggleSidebar if it's stable or memoized

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      console.log('[MainLayout] handleClickOutside: mousedown event triggered. Button:', (event as MouseEvent).button);
      if ((event as MouseEvent).button !== 0) { // 0 is the main button, usually left
        console.log('[MainLayout] handleClickOutside: Ignored due to not being a left-click (button:', (event as MouseEvent).button, ')');
        return;
      }
      // Check if the sidebar is open, not pinned, and the click is outside the sidebar
      if (
        sidebarOpen &&
        !isSidebarPinned &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        // Check if the event target is not the context menu trigger itself (if that's relevant)
        // For now, any click outside when unpinned & open will close it.
        console.log('[MainLayout] handleClickOutside: Conditions met (sidebarOpen, !isSidebarPinned, click outside). Closing sidebar.');
        setSidebarOpen(false);
        // Do NOT set sidebarPosition to null here, to allow fade-out at current position.
      }
    };

    // Add event listener for mousedown. Using mousedown as it fires before click 
    // and can prevent other actions if needed, though click should also work.
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup function to remove the event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen, isSidebarPinned, sidebarRef, setSidebarOpen]); // Dependencies
  
  return (
    <div className="w-full h-screen"> {/* relative removed, overflow-hidden removed, bg-gray-50 removed, Ensure positioning context */}
      {/* Sidebar remains a direct child, already styled as a floating island */}
      <Sidebar 
        isOpen={sidebarOpen} 
        ref={sidebarRef} 
        isSidebarPinned={isSidebarPinned}
        toggleSidebarPin={toggleSidebarPin}
        requestClose={handleRequestClose}
        setSidebarOpen={setSidebarOpen} // Added setSidebarOpen prop
        position={sidebarPosition} // MODIFIED: Changed prop name to 'position'
        isAnimatingPin={isAnimatingPin} // ADD this prop
      />
      
      {/* New Main Content Island */}
      <div // Main content island - Reverted to padding-left
        className={cn(
          "h-full flex flex-col overflow-y-auto", // Full height, layout
          "pr-4 pb-4", // Right and bottom padding remain
          "transition-all duration-300 ease-in-out", // Re-added transition classes
          isSidebarPinned && sidebarOpen ? "md:pl-[288px] pl-6" : "md:pl-20 pl-6" // Dynamic left padding classes
        )}
        // Removed inline style attribute
      >
        {/* Header component removed */}
        
        {/* Main scrollable area within the island */}
        <main 
          className={cn(
            "flex-1 isolate", // flex-1 to grow, p-4 removed, isolate for stacking context
            className // Restore className prop from page
          )}
        >
          <div className="h-full"> {/* Restore original children structure */}
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Navigation - position may need review in full app context */}
      <MobileNav />
    </div>
  );
}
