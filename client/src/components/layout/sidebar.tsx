// client/src/components/layout/sidebar.tsx

// throttle function using requestAnimationFrame
function throttle<F extends (...args: any[]) => any>(func: F) {
  let frameId: number | null = null;
  let lastArgs: Parameters<F> | null = null;

  const throttled = (...args: Parameters<F>) => {
    lastArgs = args;
    if (frameId === null) {
      frameId = requestAnimationFrame(() => {
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null;
        }
        frameId = null;
      });
    }
  };

  return throttled as (...args: Parameters<F>) => void;
}

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
  PinOffIcon,
  MenuIcon // Added MenuIcon
  // XIcon removed
} from "lucide-react";
import { BurgerIcon } from "@/components/ui"; // Import BurgerIcon
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { UserRoleEnum } from "@shared/schema";
// import { RoleSwitcher } from "@/components/role-switcher"; // REMOVED
import { TeacherClassesMenu } from "./teacher-classes-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // Added useQuery, useMutation, useQueryClient
import { apiRequest } from "@/lib/queryClient"; // If not already there, for mutations
import { useToast } from "@/hooks/use-toast"; // For mutation feedback
import { SchoolAdminScheduleMenu } from "./school-admin-schedule-menu";
// useState, useEffect might be partially unneeded, will adjust if they become fully unused
import { ReactNode, forwardRef, useState, useEffect, useRef, useMemo } from "react"; // Added useRef and useMemo
import { useSettings } from "@/contexts/SettingsContext"; // Import useSettings
import { MorphingIcon } from '@/components/ui/morphing-icon'; // Import actual MorphingIcon
import { ContextMenu } from './context-menu'; // Adjust path if necessary

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
  justUnpinnedFromMagnetized?: boolean; // For cool-down logic
  onDragStartFromFloating?: () => void; // Callback to reset cool-down flag
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
    isAnimatingPin,
    justUnpinnedFromMagnetized = false, // Default to false if not provided
    onDragStartFromFloating
  }, ref) => {
  // const { isRmbControlEnabled } = useSettings(); // isRmbControlEnabled is now taken from props if needed, or direct from useSettings later
  // Safeguard removed, Sidebar component now always attempts to render its state.
  // Visibility when RBM ON & closed is handled by its own rendering logic returning the MenuIcon stub.

  interface UserRole {
    id: number;
    userId: number;
    role: UserRoleEnum;
    schoolId: number | null;
    classId?: number | null;
    isDefault?: boolean;
    isActive?: boolean;
  }

  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isRmbControlEnabled } = useSettings(); // Get RBM mode status from hook for internal logic

  // Moved roleNames declaration here
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

  const dragStartRef = useRef<{ x: number; y: number; sidebarX: number; sidebarY: number } | null>(null);
  const [showMagnetHint, setShowMagnetHint] = useState<boolean>(false);
  const prevShowMagnetHintRef = useRef(showMagnetHint); // For logging changes
  const [isDragging, setIsDragging] = useState(false); // New state for dragging
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  const { data: userRoles, isLoading: isLoadingRoles } = useQuery<UserRole[]>({
    queryKey: ['/api/my-roles'],
    queryFn: async () => {
      const res = await apiRequest('/api/my-roles', 'GET');
      if (!res.ok) {
        throw new Error('Failed to fetch roles');
      }
      return res.json();
    },
    enabled: !!user, // Only run if user is logged in
  });

  const switchRoleMutation = useMutation({
    mutationFn: async (role: UserRoleEnum) => {
      if (!user || !user.id) throw new Error("User not authenticated");
      const res = await apiRequest("/api/switch-role", "POST", { role });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to switch role");
      }
      return res.json(); // Expects updated user object
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser); // Update user data in cache
      queryClient.invalidateQueries({ queryKey: ["/api/my-roles"] }); // Re-fetch roles to update isActive status

      // The useAuth hook's user data will update due to cache change,
      // which should trigger re-renders where needed.
      // We might also need to refetch user explicitly if useAuth doesn't auto-update activeRole correctly.
      // For now, relying on queryClient.setQueryData and component re-render.

      toast({
        title: "Роль изменена",
        description: `Вы переключились на роль: ${roleNames[updatedUser.activeRole as UserRoleEnum] || updatedUser.activeRole}`,
      });
      closeContextMenu(); // Close menu after successful switch
      // Consider a page reload or redirect if necessary for full UI update, like in RoleSwitcher.tsx
      // setTimeout(() => window.location.reload(), 300); // Or navigate to "/"
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка при смене роли",
        description: error.message,
        variant: "destructive",
      });
      closeContextMenu(); // Close menu even on error
    },
  });

  const handleSelectRole = (role: UserRoleEnum) => {
    if (user?.activeRole === role) {
      console.log("Role already active.");
      closeContextMenu();
      return;
    }
    switchRoleMutation.mutate(role);
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { // Pass undefined if no args needed, or options object
      onSuccess: () => {
        // Optional: any client-side cleanup after successful logout API call if not handled by useAuth
        console.log("Logout successful, redirecting or updating UI might be handled by AuthProvider.");
        closeContextMenu(); // Close the context menu after initiating logout
      },
      onError: (error) => {
        // Optional: handle error specifically for logout initiated from sidebar
        console.error("Logout failed from sidebar:", error);
        closeContextMenu(); // Still close context menu
      }
    });
  };

  const X_MAGNET_THRESHOLD = 50; // Pixels from left edge for magnet hint
  const SIDEBAR_EDGE_MARGIN = '1rem'; // Default margin, e.g., screenEdgePadding as a string

  const availableRolesForMenu = useMemo(() => {
    if (!userRoles) return [];
    return userRoles.map(ur => ({
      value: ur.role,
      label: roleNames[ur.role] || ur.role, // Use existing roleNames map
    }));
  }, [userRoles, roleNames]); // roleNames should be stable or included if it can change

  const currentRoleDisplayName = useMemo(() => {
    if (isLoadingRoles) return "Загрузка...";
    if (!user?.activeRole) return "Роль не выбрана";
    return roleNames[user.activeRole] || user.activeRole;
  }, [user, user?.activeRole, isLoadingRoles, roleNames]);


  useEffect(() => { // Update ref when showMagnetHint changes
    prevShowMagnetHintRef.current = showMagnetHint;
  }, [showMagnetHint]);

  const handleUserMenuToggle = (event: React.MouseEvent) => {
    // If menu is already open at this position, or for this target, consider closing it.
    // For simplicity now, it will always try to open/re-position.
    // Or, to toggle:
    // if (contextMenuOpen) {
    //   setContextMenuOpen(false);
    // } else {
    //   setContextMenuPosition({ x: event.clientX, y: event.clientY });
    //   setContextMenuOpen(true);
    // }
    // For now, let's stick to open/re-position on click, close on outside click.
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuOpen(true);
  };

  const closeContextMenu = () => {
    setContextMenuOpen(false);
  };

  useEffect(() => {
    if (ref && typeof ref === 'object' && ref.current) {
      if (position) {
        ref.current.style.setProperty('--sidebar-x', `${position.x}px`);
        ref.current.style.setProperty('--sidebar-y', `${position.y}px`);
      } else {
        // When position is null (e.g., magnetized or default state)
        if (isMagnetizedToLeft) {
          // If magnetized, explicitly set to edge values or remove to use CSS fallback to edge values
          // Assuming magnetized means it's at the defined edge (e.g., 1rem)
          ref.current.style.setProperty('--sidebar-x', SIDEBAR_EDGE_MARGIN);
          ref.current.style.setProperty('--sidebar-y', SIDEBAR_EDGE_MARGIN); // Adjust if Y can vary when magnetized
        } else {
          // Generic null position, remove properties to let CSS fallbacks in sidebarStyle take over
          ref.current.style.removeProperty('--sidebar-x');
          ref.current.style.removeProperty('--sidebar-y');
        }
      }
    }
  }, [position, isMagnetizedToLeft, ref]);

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

  // const sidebarStyle: React.CSSProperties = {}; // REMOVED this duplicate declaration
  const sidebarNominalWidth = 256; // w-64
  const screenEdgePadding = 16; // 1rem, for keeping sidebar off the very edge

  // Use CSS custom properties for top/left, with fallbacks.
  // The actual values will be set via ref.current.style.setProperty()
  const sidebarStyle: React.CSSProperties = { // This is the correct declaration to keep
    top: `var(--sidebar-y, ${SIDEBAR_EDGE_MARGIN})`,
    left: `var(--sidebar-x, ${SIDEBAR_EDGE_MARGIN})`,
  };

  // The old logic for directly setting sidebarStyle.top/left based on `position` prop is removed.
  // It's now handled by the useEffect that sets CSS custom properties.

  const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    const isDraggable = isRmbControlEnabled && !isSidebarPinned && isOpen;
    // Example: console.log('[Sidebar] MouseDown: Draggable?', { rmb: isRmbControlEnabled, pinned: isSidebarPinned, open: isOpen });
    console.log('[Sidebar] MouseDown: Draggable Check', { rmb: isRmbControlEnabled, pinned: isSidebarPinned, open: isOpen, isDraggable });

    if (e.button !== 0 || !isDraggable) {
      return;
    }

    // REMOVED: onDragStartFromFloating?.(); Call is now in handleMouseMove

    // Prevent dragging if clicking on interactive elements like buttons or links
    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('button, a')) {
        return;
    }

    setIsDragging(true); // Set dragging state to true
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';

    const sidebarRect = (ref as React.RefObject<HTMLElement>)?.current?.getBoundingClientRect();
    
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      sidebarX: sidebarRect?.left || position?.x || screenEdgePadding,
      sidebarY: sidebarRect?.top || position?.y || screenEdgePadding,
    };

    document.addEventListener('mousemove', throttledHandleMouseMove); // MODIFIED
    document.addEventListener('mouseup', handleMouseUp);
    console.log('[Sidebar] MouseDown: Drag Started', { dragStartRefCurrent: dragStartRef.current });
  };

  const handleMouseMoveCallback = (e: MouseEvent) => { // RENAMED from handleMouseMove
    if (!dragStartRef.current || !isOpen || isSidebarPinned) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    let newX = dragStartRef.current.sidebarX + deltaX; // Potential new X (raw)
    let newY = dragStartRef.current.sidebarY + deltaY; // Potential new Y (raw)

    // Proactive boundary clamping
    const sidebarCurrentHeight = (ref && typeof ref === 'object' && ref.current)
                                ? ref.current.offsetHeight
                                : window.innerHeight - 2 * screenEdgePadding; // Fallback like in style calculation

    const clampedX = Math.max(
      screenEdgePadding,
      Math.min(newX, window.innerWidth - sidebarNominalWidth - screenEdgePadding)
    );
    const clampedY = Math.max(
      screenEdgePadding,
      Math.min(newY, window.innerHeight - sidebarCurrentHeight - screenEdgePadding)
    );

    // Cool-down reset logic: if the sidebar was just unpinned from a magnetized state,
    // reset the cool-down flag if user drags it sufficiently away from the snap edge.
    if (justUnpinnedFromMagnetized) {
      const SNAP_RESET_BUFFER = 10; // Pixels to drag away from threshold to reset cool-down
      // Use unclamped `newX` (raw user intent) for this check
      if (newX > X_MAGNET_THRESHOLD + SNAP_RESET_BUFFER) {
        console.log('[Sidebar] MouseMove: Dragged sufficiently away, resetting cool-down flag via callback.', { newX, threshold: X_MAGNET_THRESHOLD, buffer: SNAP_RESET_BUFFER });
        onDragStartFromFloating?.(); // This will call setJustUnpinnedFromMagnetized(false) in parent
        // Note: justUnpinnedFromMagnetized prop will update on next render.
        // The auto-snap check below will still use the current prop value for this event.
      }
    }

    // Automatic snap-to-edge logic during drag
    // Use unclamped `newX` for the trigger condition to reflect user intent towards edge.
    // And check justUnpinnedFromMagnetized status (prop value for current render).
    if ( isRmbControlEnabled && isOpen && !isSidebarPinned && newX < X_MAGNET_THRESHOLD && !justUnpinnedFromMagnetized ) {
      // (dragStartRef.current is implied by the function guard)
      console.log('[Sidebar] MouseMove: Automatic snap condition met (cool-down is false).', { rawNewX: newX, rawNewY: newY, threshold: X_MAGNET_THRESHOLD, justUnpinnedFromMagnetized });
      // Pass raw newX (that triggered snap) and clamped newY to handleRequestMagnetSnap.
      // main-layout will override X to its fixed snap offset anyway.
      handleRequestMagnetSnap({ x: newX, y: clampedY });

      // Terminate current drag sequence as main-layout will now manage pinned state
      dragStartRef.current = null;
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', throttledHandleMouseMove); // MODIFIED
      document.removeEventListener('mouseup', handleMouseUp); // Also remove mouseup listener
      if (showMagnetHint) { // Reset hint if it was shown
        setShowMagnetHint(false);
        console.log('[Sidebar] MouseMove: Reset showMagnetHint to false due to auto-snap.');
      }
      setIsDragging(false); // Reset dragging state on auto-snap
      return; // Stop further processing in this event
    }

    // If auto-snap didn't occur, continue with normal position update using CLAMPED values
    // Update CSS custom properties for smooth animation via CSS transitions
    if (ref && typeof ref === 'object' && ref.current) {
      ref.current.style.setProperty('--sidebar-x', `${clampedX}px`);
      ref.current.style.setProperty('--sidebar-y', `${clampedY}px`);
    }
    setSidebarPosition({ x: clampedX, y: clampedY }); // Inform parent of logical position change

    // Magnet hint logic (still useful if snap-on-mouseup is kept or for visual cue before auto-snap threshold)
    let newHintState = false;
    const canShowHint = isRmbControlEnabled && !isSidebarPinned; // isSidebarPinned might have changed if snap occurred, but we returned
    if (canShowHint) {
      // Use e.clientX for hint, as newX is the sidebar's desired top-left, not cursor position
      if (e.clientX < X_MAGNET_THRESHOLD) {
        newHintState = true;
      }
    }
    if (prevShowMagnetHintRef.current !== newHintState) {
      console.log('[Sidebar] MouseMove: Hint Check (post-autosnap check)', { clientX: e.clientX, threshold: X_MAGNET_THRESHOLD, newHintState: newHintState, oldHintState: prevShowMagnetHintRef.current, pinnedCheck: isSidebarPinned, rmbEnabledCheck: isRmbControlEnabled });
      setShowMagnetHint(newHintState);
    }
  };

  // Store the latest handleMouseMoveCallback in a ref
  const latestMouseMoveHandlerRef = useRef(handleMouseMoveCallback);
  useEffect(() => {
    latestMouseMoveHandlerRef.current = handleMouseMoveCallback;
  }, [handleMouseMoveCallback]);

  // Create the throttled version of handleMouseMove
  const throttledHandleMouseMove = useMemo(() => {
    return throttle((event: MouseEvent) => {
      latestMouseMoveHandlerRef.current(event);
    }); // REMOVE , 10
  }, []); // Empty dependency array ensures this is created once


  const handleMouseUp = (event: MouseEvent) => { 
    const wasDragging = !!dragStartRef.current; // Capture before nulling

    // If auto-snap happened in handleMouseMove, dragStartRef.current would be null here.
    // So, shouldCallSnap would correctly be false.
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
    
    setIsDragging(false); // Reset dragging state on mouse up
    dragStartRef.current = null;
    if (showMagnetHint) { 
      setShowMagnetHint(false); 
      console.log('[Sidebar] MouseUp: Reset showMagnetHint to false');
    }
    document.body.style.userSelect = ''; 
    document.removeEventListener('mousemove', throttledHandleMouseMove); // MODIFIED
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Cleanup global listeners when component unmounts or relevant conditions change
  useEffect(() => {
    return () => {
      if (dragStartRef.current) { // If dragging was in progress
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', throttledHandleMouseMove); // MODIFIED
        document.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [throttledHandleMouseMove]); // MODIFIED: Added throttledHandleMouseMove to dependency array

  return (
    <aside
      ref={ref}
      // MouseDown for dragging is conditional on isOpen AND RBM mode (implicitly, as only RBM ON allows drag)
      onMouseDown={isRmbControlEnabled && isOpen ? handleMouseDown : undefined}
      // Click on collapsed stub: only for RBM ON (MenuIcon). RBM OFF MorphingIcon handles its own click.
      onClick={!isOpen && isRmbControlEnabled ? requestClose : undefined}
      className={cn(
        "fixed z-40 rounded-3xl max-h-[calc(100vh-2rem)]",

        // backdrop-blur-2xl is now unconditional, only transitions change
        isDragging
          ? "transition-all duration-75 ease-linear"
          : "transition-all duration-300 ease-in-out",

        "backdrop-blur-2xl bg-transparent shadow-lg border border-white/15", // backdrop-blur-2xl and bg-transparent are now unconditional here
        "sidebar-glowing-effect",

        // RBM OFF Mode specific overall container styles
        !isRmbControlEnabled && (isOpen ? "w-64" : "w-12 h-12 p-0"),

        // RBM ON Mode specific overall container styles
        isRmbControlEnabled && (
          isOpen
            ? ["w-64 overflow-y-auto", // RBM ON Open
                (!isSidebarPinned && !dragStartRef.current) ? "cursor-grab" : "",
                dragStartRef.current ? "cursor-grabbing" : "",
                (console.log('[Sidebar] Render: Hint Class Check', { hint: showMagnetHint, pinned: isSidebarPinned }), showMagnetHint && !isSidebarPinned ? "outline outline-2 outline-offset-2 outline-blue-500 shadow-2xl" : "")
              ]
            : "w-16 p-3 flex items-center justify-center cursor-pointer overflow-hidden" // RBM ON Collapsed (MenuIcon stub)
        ),
        // New conditional visibility logic:
        !isRmbControlEnabled
          ? "opacity-100 scale-100 pointer-events-auto" // RBM OFF: always visible
          : (isOpen
              ? "opacity-100 scale-100 pointer-events-auto" // RBM ON & Open: visible
              : "opacity-0 scale-95 pointer-events-none" // RBM ON & Closed: hidden for animation
            )
      )}
      style={sidebarStyle}
    >
      {!isRmbControlEnabled ? (
        // RBM OFF Mode: MorphingIcon is fixed, content panel animates
        <>
          <MorphingIcon
            isExpanded={isOpen}
            onClick={requestClose}
            className="h-7 w-7 text-gray-700 absolute top-2.5 left-2.5 z-10" // Standardized icon position slightly from p-2
          />
          <div
            className={cn(
              "w-full h-full overflow-y-auto", // Base structural classes
              "transition-all duration-300 ease-in-out", // Animation base for opacity and transform
              isOpen
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-full pointer-events-none" // Slide out and become non-interactive
            )}
          >
            {/* Content Panel: User Info and Nav. No separate header div for RBM OFF expanded. */}
            {/* Padding needs to account for the fixed MorphingIcon area if not overlaying */}
            <div className="pt-12"> {/* Placeholder padding-top to clear icon */}
              {/* User Info */}
              <div
                className="p-4 cursor-pointer hover:bg-white/20 rounded-xl transition-colors duration-150 ease-in-out"
                onClick={handleUserMenuToggle}
              >
                <div className="flex items-center">
                  <Avatar className="h-7 w-7 border-2 border-slate-600/50">
                    <AvatarFallback className="bg-primary text-white">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                  </div>
                </div>
              </div>
              {/* Navigation */}
              <nav className="py-2 px-2">
                <div className="space-y-1">
                  {allowedItems.map((item) => {
                    if ('component' in item) {
                      return <div key={item.id}>{item.component}</div>;
                    }
                    const linkItem = item as LinkMenuItem;
                    const isActive = location === linkItem.href ||
                                    (linkItem.href !== "/" && location.startsWith(linkItem.href));
                    return (
                      <Link key={linkItem.id} href={linkItem.href} onClick={handleNavLinkClick}>
                        <div className={cn(
                          "group flex items-center px-2 py-1.5 text-sm font-medium rounded-full transition-[color,background-color,border-color,text-decoration-color,fill,stroke,box-shadow] duration-300 ease-in-out",
                          isActive
                            ? "bg-white/20 backdrop-blur-md shadow-md text-[rgb(2,191,122)] border border-white/30"
                            : "text-gray-800 hover:bg-black/5 hover:text-gray-900"
                        )}>
                          <span className={cn(
                            isActive
                              ? "text-[rgb(2,191,122)]"
                              : "text-gray-600 group-hover:text-[rgb(2,191,122)] transition-colors"
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
            </div>
          </div>
        </>
      ) : (
        // RBM ON Mode: Existing logic for open/collapsed states
        isOpen ? (
          <>
            {/* Sidebar Header: Pin and Close buttons OR Toggle button */}
            <div className={cn(
              "flex items-center p-3",
              "justify-between" // RBM ON is always justify-between
            )}>
              <>
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
                <BurgerIcon
                  isOpen={true} // Always an X for RMB enabled mode
                  onClick={requestClose}
                  className="text-gray-700 p-1 h-7 w-7 hover:bg-black/5 rounded-md transition-colors flex items-center justify-center"
                />
              </>
            </div>
            {/* User Info */}
            <div
              className="p-4 cursor-pointer hover:bg-white/20 rounded-xl transition-colors duration-150 ease-in-out"
              onClick={handleUserMenuToggle}
            >
              <div className="flex items-center">
                <Avatar className="h-7 w-7 border-2 border-slate-600/50">
                  <AvatarFallback className="bg-primary text-white">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="py-2 px-2">
              <div className="space-y-1">
                {allowedItems.map((item) => {
                  if ('component' in item) {
                    return <div key={item.id}>{item.component}</div>;
                  }
                  const linkItem = item as LinkMenuItem;
                  const isActive = location === linkItem.href ||
                                  (linkItem.href !== "/" && location.startsWith(linkItem.href));
                  return (
                    <Link key={linkItem.id} href={linkItem.href} onClick={handleNavLinkClick}>
                      <div className={cn(
                        "group flex items-center px-2 py-1.5 text-sm font-medium rounded-full transition-[color,background-color,border-color,text-decoration-color,fill,stroke,box-shadow] duration-300 ease-in-out",
                        isActive
                          ? "bg-white/20 backdrop-blur-md shadow-md text-[rgb(2,191,122)] border border-white/30"
                          : "text-gray-800 hover:bg-black/5 hover:text-gray-900"
                      )}>
                        <span className={cn(
                          isActive
                            ? "text-[rgb(2,191,122)]"
                            : "text-gray-600 group-hover:text-[rgb(2,191,122)] transition-colors"
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
          </>
        ) : (
          // RBM ON Mode, Collapsed View Content: Render nothing inside.
          // The aside element itself is styled as a stub but hidden by opacity/scale.
          null
        )
      )}
      <ContextMenu
        isOpen={contextMenuOpen}
        position={contextMenuPosition}
        onClose={closeContextMenu}
        currentRoleName={currentRoleDisplayName} // Updated
        availableRoles={availableRolesForMenu} // Updated
        onSelectRole={handleSelectRole} // Updated
        onLogout={handleLogout} // Placeholder
      />
    </aside>
  );
});