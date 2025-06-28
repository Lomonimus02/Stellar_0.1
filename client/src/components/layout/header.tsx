import { BurgerIcon } from "@/components/ui";

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function Header({ toggleSidebar, isSidebarOpen }: HeaderProps) {
  return (
    <>
      {!isSidebarOpen && (
        <div className="fixed top-0 left-0 z-50 p-2">
          <BurgerIcon
            isOpen={isSidebarOpen} // This will be false here, so it shows as a burger
            onClick={toggleSidebar}
            // className for the BurgerIcon itself, defining its appearance and interaction
            className="text-slate-600 p-1.5 h-9 w-9 hover:bg-black/10 rounded-full backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-slate-500/70 flex items-center justify-center"
          />
          {/* All other elements (title, user menu, notifications) are removed */}
        </div>
      )}
    </>
  );
}
