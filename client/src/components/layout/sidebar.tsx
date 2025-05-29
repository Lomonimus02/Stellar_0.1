// client/src/components/layout/sidebar.tsx
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  HomeIcon,
  BookIcon,
  Users2Icon,
  BarChartIcon,
  BellIcon,
  SettingsIcon,
  HelpCircleIcon,
  BuildingIcon,
  CalendarIcon,
  GraduationCapIcon,
  NotebookPenIcon, // Используем для "Предметы"
  MessagesSquareIcon,
  FolderIcon,
  UserCogIcon,
  UserPlusIcon,
  UsersIcon,
  ClipboardListIcon,
  PinIcon,
  PinOffIcon
  // XIcon removed
} from "lucide-react";
import { BurgerIcon } from "@/components/ui"; // Import BurgerIcon
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { UserRoleEnum } from "@shared/schema";
// import { RoleSwitcher } from "@/components/role-switcher"; // REMOVED
import { TeacherClassesMenu } from "./teacher-classes-menu";
import { SchoolAdminScheduleMenu } from "./school-admin-schedule-menu";
// useState, useEffect might be partially unneeded, will adjust if they become fully unused
import { ReactNode, forwardRef, useState, useEffect, useRef } from "react"; // Added useRef
import { useSettings } from "@/contexts/SettingsContext"; // Import useSettings

// const RMB_SIDEBAR_CONTROL_LS_KEY = 'enableRmbSidebarControl'; // REMOVED

interface LinkMenuItem {
  id: string;
  label: string;
  icon: ReactNode;
  href: string;
}

interface ComponentMenuItem {
  id: string;
  component: ReactNode;
}

type NavItem = LinkMenuItem | ComponentMenuItem;

interface SidebarProps {
  isOpen: boolean;
  isSidebarPinned: boolean;
  isMagnetizedToLeft: boolean; // New Prop
  toggleSidebarPin: () => void;
  requestClose: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  position?: { x: number, y: number } | null;
  setSidebarPosition: (position: { x: number; y: number } | null) => void;
  handleRequestMagnetSnap: (currentPosition: { x: number; y: number }) => void; // New Prop
  isAnimatingPin?: boolean;
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  ({ 
    isOpen, 
    isSidebarPinned, 
    isMagnetizedToLeft, // Destructure
    toggleSidebarPin, 
    requestClose, 
    setSidebarOpen, 
    position, 
    setSidebarPosition, 
    handleRequestMagnetSnap, // Destructure
    isAnimatingPin 
  }, ref) => {
  const [location] = useLocation();
  const { user } = useAuth();
  const { isRmbControlEnabled } = useSettings(); 
  const dragStartRef = useRef<{ x: number; y: number; sidebarX: number; sidebarY: number } | null>(null);
  const [showMagnetHint, setShowMagnetHint] = useState<boolean>(false);
  const prevShowMagnetHintRef = useRef(showMagnetHint); // For logging changes

  const X_MAGNET_THRESHOLD = 50; // Pixels from left edge for magnet hint

  useEffect(() => { // Update ref when showMagnetHint changes
    prevShowMagnetHintRef.current = showMagnetHint;
  }, [showMagnetHint]);

  const handleNavLinkClick = () => {
    if (!isSidebarPinned && isOpen) {
      setSidebarOpen(false);
    }
  };

  // Maps user roles to which menu items they can see
  const roleAccess = {
    [UserRoleEnum.SUPER_ADMIN]: ["dashboard", "schools", "users", "user-roles", "subgroups", "grading-systems", "analytics", "messages", "notifications", "settings", "support"],
    // Для SCHOOL_ADMIN убираем 'subgroups', 'grades', 'homework'
    [UserRoleEnum.SCHOOL_ADMIN]: ["dashboard", "users", "user-roles", "subjects-management", "school-admin-schedule-menu", "grading-systems", "analytics", "messages", "notifications", "settings", "support"],
    [UserRoleEnum.TEACHER]: ["dashboard", "teacher-classes-menu", "schedule", "homework", "messages", "documents", "support"],
    [UserRoleEnum.CLASS_TEACHER]: ["dashboard", "class-teacher-dashboard", "schedule", "homework", "grades", "messages", "documents", "support"],
    [UserRoleEnum.STUDENT]: ["dashboard", "schedule", "homework", "grades", "messages", "documents", "support"],
    [UserRoleEnum.PARENT]: ["dashboard", "grades", "messages", "documents", "support"],
    [UserRoleEnum.PRINCIPAL]: ["dashboard", "users", "school-admin-schedule-menu", "grades", "grading-systems", "analytics", "messages", "documents", "settings", "support"],
    [UserRoleEnum.VICE_PRINCIPAL]: ["dashboard", "users", "schedule", "grades", "grading-systems", "analytics", "messages", "documents", "settings", "support"]
  };

  // Navigation items - добавляем новый пункт
  const navItems: NavItem[] = [
    { id: "dashboard", label: "Главная", icon: <HomeIcon className="h-4 w-4 mr-3" />, href: "/" },
    { id: "class-teacher-dashboard", label: "Панель классного руководителя", icon: <UsersIcon className="h-4 w-4 mr-3" />, href: "/class-teacher-dashboard" },
    { id: "teacher-classes-menu", component: <TeacherClassesMenu /> },
    { id: "school-admin-schedule-menu", component: <SchoolAdminScheduleMenu /> },
    { id: "schools", label: "Школы", icon: <BuildingIcon className="h-4 w-4 mr-3" />, href: "/schools" },
    { id: "users", label: "Пользователи", icon: <Users2Icon className="h-4 w-4 mr-3" />, href: "/users" },
    { id: "user-roles", label: "Роли пользователей", icon: <UserCogIcon className="h-4 w-4 mr-3" />, href: "/user-roles" },
    // Новый пункт меню "Предметы"
    { id: "subjects-management", label: "Предметы", icon: <NotebookPenIcon className="h-4 w-4 mr-3" />, href: "/subjects-management" },
    { id: "subgroups", label: "Подгруппы", icon: <UserPlusIcon className="h-4 w-4 mr-3" />, href: "/subgroups" }, // Эту страницу, возможно, стоит будет объединить с новой
    { id: "schedule", label: "Расписание", icon: <CalendarIcon className="h-4 w-4 mr-3" />, href: "/schedule" },
    { id: "grades", label: "Оценки", icon: <GraduationCapIcon className="h-4 w-4 mr-3" />, href: "/grades" },
    { id: "grading-systems", label: "Системы оценивания", icon: <ClipboardListIcon className="h-4 w-4 mr-3" />, href: "/grading-systems" },
    { id: "homework", label: "Домашние задания", icon: <BookIcon className="h-4 w-4 mr-3" />, href: "/homework" },
    { id: "messages", label: "Сообщения", icon: <MessagesSquareIcon className="h-4 w-4 mr-3" />, href: "/messages" },
    { id: "documents", label: "Документы", icon: <FolderIcon className="h-4 w-4 mr-3" />, href: "/documents" },
    { id: "analytics", label: "Аналитика", icon: <BarChartIcon className="h-4 w-4 mr-3" />, href: "/analytics" },
    { id: "notifications", label: "Уведомления", icon: <BellIcon className="h-4 w-4 mr-3" />, href: "/notifications" },
    { id: "settings", label: "Настройки", icon: <SettingsIcon className="h-4 w-4 mr-3" />, href: "/settings" },
    { id: "support", label: "Поддержка", icon: <HelpCircleIcon className="h-4 w-4 mr-3" />, href: "/support" }
  ];

  // Filter nav items based on user's active role (or default role if active not set)
  const userRole = user?.activeRole || user?.role || UserRoleEnum.STUDENT;
  const allowedItems = navItems.filter(item =>
    roleAccess[userRole]?.includes(item.id)
  );

  // Role display names in Russian
  const roleNames = {
    [UserRoleEnum.SUPER_ADMIN]: "Супер-админ",
    [UserRoleEnum.SCHOOL_ADMIN]: "Администратор школы",
    [UserRoleEnum.TEACHER]: "Учитель",
    [UserRoleEnum.CLASS_TEACHER]: "Классный руководитель",
    [UserRoleEnum.STUDENT]: "Ученик",
    [UserRoleEnum.PARENT]: "Родитель",
    [UserRoleEnum.PRINCIPAL]: "Директор",
    [UserRoleEnum.VICE_PRINCIPAL]: "Завуч"
  };

  const sidebarStyle: React.CSSProperties = {};
  const sidebarNominalWidth = 256; // w-64
  const screenEdgePadding = 16; // 1rem, for keeping sidebar off the very edge

  // Style decision:
  // 1. If 'position' is provided, use it (applies to floating or pinned-at-custom-location).
  // 2. If 'position' is null, use default pinned styles (top: 1rem, left: 1rem).
  if (position) {
    let newX = position.x;
    let newY = position.y;

    // Boundary checks should only apply if the sidebar is NOT pinned OR if it's actively being dragged.
    const shouldApplyBoundaryChecks = dragStartRef.current || !isSidebarPinned;

    if (shouldApplyBoundaryChecks && typeof window !== 'undefined') { 
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const sidebarCurrentHeight = (ref && typeof ref === 'object' && ref.current)
                                    ? ref.current.offsetHeight
                                    : viewportHeight - 2 * screenEdgePadding; // Estimate

        newX = Math.max(screenEdgePadding, Math.min(newX, viewportWidth - sidebarNominalWidth - screenEdgePadding));
        newY = Math.max(screenEdgePadding, Math.min(newY, viewportHeight - sidebarCurrentHeight - screenEdgePadding));
    }
    
    sidebarStyle.top = `${newY}px`; 
    sidebarStyle.left = `${newX}px`;
  } else {
    // Default position (typically when pinned to the edge without a specific 'position' value)
    sidebarStyle.top = '1rem'; 
    sidebarStyle.left = '1rem'; 
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    const isDraggable = isRmbControlEnabled && !isSidebarPinned && isOpen;
    // Example: console.log('[Sidebar] MouseDown: Draggable?', { rmb: isRmbControlEnabled, pinned: isSidebarPinned, open: isOpen });
    console.log('[Sidebar] MouseDown: Draggable Check', { rmb: isRmbControlEnabled, pinned: isSidebarPinned, open: isOpen, isDraggable });

    if (e.button !== 0 || !isDraggable) {
      return;
    }

    // Prevent dragging if clicking on interactive elements like buttons or links
    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('button, a')) {
        return;
    }

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';

    const sidebarRect = (ref as React.RefObject<HTMLElement>)?.current?.getBoundingClientRect();
    
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      sidebarX: sidebarRect?.left || position?.x || screenEdgePadding,
      sidebarY: sidebarRect?.top || position?.y || screenEdgePadding,
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    console.log('[Sidebar] MouseDown: Drag Started', { dragStartRefCurrent: dragStartRef.current });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragStartRef.current || !isOpen || isSidebarPinned) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    const newX = dragStartRef.current.sidebarX + deltaX;
    const newY = dragStartRef.current.sidebarY + deltaY;

    setSidebarPosition({ x: newX, y: newY });

    // Magnet hint logic
    let newHintState = false;
    const canShowHint = isRmbControlEnabled && !isSidebarPinned;
    if (canShowHint) {
      if (e.clientX < X_MAGNET_THRESHOLD) {
        newHintState = true;
      }
    }
    if (prevShowMagnetHintRef.current !== newHintState) {
      // Example: console.log('[Sidebar] MouseMove: Hint Check', { clientX: e.clientX, threshold: X_MAGNET_THRESHOLD, newHintState: /* new showMagnetHint value */, pinned: isSidebarPinned });
      console.log('[Sidebar] MouseMove: Hint Check', { clientX: e.clientX, threshold: X_MAGNET_THRESHOLD, newHintState: newHintState, oldHintState: prevShowMagnetHintRef.current, pinnedCheck: isSidebarPinned, rmbEnabledCheck: isRmbControlEnabled });
      setShowMagnetHint(newHintState);
    }
  };

  const handleMouseUp = (event: MouseEvent) => { 
    const wasDragging = !!dragStartRef.current; // Capture before nulling
    const shouldCallSnap = wasDragging && showMagnetHint && position;
    
    // Example: console.log('[Sidebar] MouseUp: Magnet Snap Call Check', { wasDragging: !!dragStartRef.current, hint: showMagnetHint, position: position, shouldCallSnap: /* boolean result of condition */ });
    console.log('[Sidebar] MouseUp: Magnet Snap Call Check', { 
      wasDraggingAtStartOfMouseUp: wasDragging, 
      currentShowMagnetHint: showMagnetHint, 
      currentPositionProp: position, 
      shouldCallSnapLogic: shouldCallSnap 
    });

    if (shouldCallSnap) {
      console.log('[Sidebar] MouseUp: Calling handleRequestMagnetSnap', { position });
      handleRequestMagnetSnap(position!); // position is checked in shouldCallSnap
    }
    
    dragStartRef.current = null;
    if (showMagnetHint) { 
      setShowMagnetHint(false); 
      console.log('[Sidebar] MouseUp: Reset showMagnetHint to false');
    }
    document.body.style.userSelect = ''; 
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Cleanup global listeners when component unmounts or relevant conditions change
  useEffect(() => {
    return () => {
      if (dragStartRef.current) { // If dragging was in progress
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, []); // Empty dependency array for unmount cleanup

  return (
    <aside
      ref={ref}
      onMouseDown={handleMouseDown} // Attach mouse down handler
      className={cn(
        "fixed z-40 w-64 rounded-3xl max-h-[calc(100vh-2rem)]",
        "bg-transparent backdrop-blur-2xl shadow-lg border border-white/15",
        "overflow-y-auto sidebar overflow-hidden sidebar-glowing-effect",
        // Transition logic:
        // During drag: Only opacity, transform, and hint properties transition. Top/left changes are immediate.
        // During pin animation: All properties transition.
        // Default idle state: All relevant properties transition.
        dragStartRef.current
          ? "transition-[opacity,transform,outline,outline-color,outline-offset,box-shadow] duration-300 ease-in-out"
          : isAnimatingPin
            ? "transition-all duration-300 ease-in-out"
            : "transition-[opacity,transform,top,left,outline,outline-color,outline-offset,box-shadow] duration-300 ease-in-out",
        isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none",
        (!isSidebarPinned && isRmbControlEnabled && isOpen && !dragStartRef.current) ? "cursor-grab" : "", 
        dragStartRef.current ? "cursor-grabbing" : "",
        (console.log('[Sidebar] Render: Hint Class Check', { hint: showMagnetHint, pinned: isSidebarPinned }), showMagnetHint && !isSidebarPinned ? "outline outline-2 outline-offset-2 outline-blue-500 shadow-2xl" : "")
      )}
      style={sidebarStyle}
    >
      {/* Sidebar Header: Pin and Close buttons OR Toggle button */}
      <div className={cn(
        "flex items-center p-3",
        isRmbControlEnabled ? "justify-between" : "justify-end"
      )}>
        {isRmbControlEnabled ? (
          <>
            {/* Pin button - visible only if RMB control is enabled */}
            <button
              onClick={toggleSidebarPin}
              className="p-1 text-gray-700 hover:text-gray-900 hover:bg-black/5 rounded-md transition-colors"
              aria-label={isSidebarPinned ? "Unpin sidebar" : "Pin sidebar"}
            >
              {isSidebarPinned ? (
                <PinOffIcon className="h-4 w-4" />
              ) : (
                <PinIcon className="h-4 w-4" />
              )}
            </button>
            {/* Close ('X') button - visible only if RMB control is enabled */}
            <BurgerIcon
              isOpen={true} // Always an X for RMB enabled mode, as sidebar is open
              onClick={requestClose} // requestClose will just close it
              className="text-gray-700 p-1 h-7 w-7 hover:bg-black/5 rounded-md transition-colors flex items-center justify-center"
            />
          </>
        ) : (
          <>
            {/* Burger/X toggle button - visible only if RMB control is DISabled */}
            {/* This button is only shown if the sidebar itself is open, due to the sidebar's own visibility.
                Its state (burger or X) depends on the sidebar's isOpen prop.
                Its onClick (requestClose) will toggle the sidebar via main-layout's modified logic. */}
            <BurgerIcon
              isOpen={isOpen} // Dynamic: burger if sidebar closed, X if open
              onClick={requestClose} // requestClose will toggle it in RBM disabled mode
              className="text-gray-700 p-1 h-7 w-7 hover:bg-black/5 rounded-md transition-colors flex items-center justify-center"
            />
          </>
        )}
      </div>
      {/* User Info */}
      <div className="p-4"> {/* Removed border-b and border-slate-700/50 */}
        <div className="flex items-center">
          <Avatar className="h-7 w-7 border-2 border-slate-600/50"> {/* Avatar border color adjusted */}
            <AvatarFallback className="bg-primary text-white">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
            {/* User role display removed */}
          </div>
        </div>

        {/* Переключатель ролей - отображается только для пользователей с несколькими ролями */}
        {/* <div className="mt-3"> */}
        {/*   <RoleSwitcher /> */}
        {/* </div> */}
        {/* Pin Button was here, now moved to the header */}
      </div>

      {/* Navigation */}
      <nav className="py-2 px-2"> {/* MODIFIED: py-4 to py-2 */}
        <div className="space-y-1">
          {allowedItems.map((item) => {
            // Если у пункта есть компонент, отображаем его
            if ('component' in item) {
              return <div key={item.id}>{item.component}</div>;
            }

            // Иначе отображаем обычный пункт меню со ссылкой
            const linkItem = item as LinkMenuItem;
            const isActive = location === linkItem.href ||
                            (linkItem.href !== "/" && location.startsWith(linkItem.href));

            return (
              <Link key={linkItem.id} href={linkItem.href} onClick={handleNavLinkClick}>
                <div className={cn(
                  "group flex items-center px-2 py-1.5 text-sm font-medium rounded-full transition-[color,background-color,border-color,text-decoration-color,fill,stroke,box-shadow] duration-300 ease-in-out", // MODIFIED: py-2 to py-1.5
                  isActive
                    ? "bg-white/20 backdrop-blur-md shadow-md text-[rgb(2,191,122)] border border-white/30" // MODIFIED active state style
                    : "text-gray-800 hover:bg-black/5 hover:text-gray-900" // Inactive state specific
                )}>
                  <span className={cn(
                    isActive
                      ? "text-[rgb(2,191,122)]" // Active icon color
                      : "text-gray-600 group-hover:text-[rgb(2,191,122)] transition-colors" // Default icon color: darker, green on hover
                  )}>
                    {linkItem.icon}
                  </span>
                  {linkItem.label}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
});