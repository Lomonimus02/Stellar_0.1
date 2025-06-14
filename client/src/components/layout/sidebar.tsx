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
  NotebookPenIcon,
  MessagesSquareIcon,
  FolderIcon,
  UserCogIcon,
  UserPlusIcon,
  UsersIcon,
  ClipboardListIcon,
  PinIcon,
  PinOffIcon,
  MenuIcon // Убедитесь, что MenuIcon используется или удалите, если нет
} from "lucide-react";
import { BurgerIcon } from "@/components/ui"; // BurgerIcon используется, MenuIcon - нет.
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { UserRoleEnum } from "@shared/schema";
import { TeacherClassesMenu } from "./teacher-classes-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SchoolAdminScheduleMenu } from "./school-admin-schedule-menu";
import { ReactNode, forwardRef, useState, useEffect, useRef, useMemo } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { MorphingIcon } from '@/components/ui/morphing-icon';
import { ContextMenu } from './context-menu';
import { motion } from "framer-motion"; // <-- Добавлен импорт Framer Motion

// throttle function using requestAnimationFrame (оставляем как есть)
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
  isMagnetizedToLeft: boolean;
  toggleSidebarPin: () => void;
  requestClose: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  position?: { x: number, y: number } | null;
  setSidebarPosition: (position: { x: number; y: number } | null) => void;
  handleRequestMagnetSnap: (currentPosition: { x: number; y: number }) => void;
  isAnimatingPin?: boolean;
  justUnpinnedFromMagnetized?: boolean;
  onDragStartFromFloating?: () => void;
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  ({
    isOpen,
    isSidebarPinned,
    isMagnetizedToLeft,
    toggleSidebarPin,
    requestClose,
    setSidebarOpen,
    position,
    setSidebarPosition,
    handleRequestMagnetSnap,
    isAnimatingPin,
    justUnpinnedFromMagnetized = false,
    onDragStartFromFloating
  }, ref) => {

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
  const { isRmbControlEnabled } = useSettings();

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
  const prevShowMagnetHintRef = useRef(showMagnetHint);
  const [isDragging, setIsDragging] = useState(false);
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
    enabled: !!user,
  });

  const switchRoleMutation = useMutation({
    mutationFn: async (role: UserRoleEnum) => {
      if (!user || !user.id) throw new Error("User not authenticated");
      const res = await apiRequest("/api/switch-role", "POST", { role });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to switch role");
      }
      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      queryClient.invalidateQueries({ queryKey: ["/api/my-roles"] });
      toast({
        title: "Роль изменена",
        description: `Вы переключились на роль: ${roleNames[updatedUser.activeRole as UserRoleEnum] || updatedUser.activeRole}`,
      });
      closeContextMenu();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка при смене роли",
        description: error.message,
        variant: "destructive",
      });
      closeContextMenu();
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
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        console.log("Logout successful, redirecting or updating UI might be handled by AuthProvider.");
        closeContextMenu();
      },
      onError: (error) => {
        console.error("Logout failed from sidebar:", error);
        closeContextMenu();
      }
    });
  };

  const X_MAGNET_THRESHOLD = 60;
  const SIDEBAR_EDGE_MARGIN = '1rem';

  const availableRolesForMenu = useMemo(() => {
    if (!userRoles) return [];
    return userRoles.map(ur => ({
      value: ur.role,
      label: roleNames[ur.role] || ur.role,
    }));
  }, [userRoles, roleNames]);

  const currentRoleDisplayName = useMemo(() => {
    if (isLoadingRoles) return "Загрузка...";
    if (!user?.activeRole) return "Роль не выбрана";
    return roleNames[user.activeRole] || user.activeRole;
  }, [user, user?.activeRole, isLoadingRoles, roleNames]);


  useEffect(() => {
    prevShowMagnetHintRef.current = showMagnetHint;
  }, [showMagnetHint]);

  const handleUserMenuToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuOpen(true);
  };

  const closeContextMenu = () => {
    setContextMenuOpen(false);
  };

  useEffect(() => {
    if (!isOpen && contextMenuOpen) {
      closeContextMenu();
    }
  }, [isOpen, contextMenuOpen]);

  useEffect(() => {
    if (ref && typeof ref === 'object' && ref.current) {
      if (position) {
        ref.current.style.setProperty('--sidebar-x', `${position.x}px`);
        ref.current.style.setProperty('--sidebar-y', `${position.y}px`);
      } else {
        if (isMagnetizedToLeft) {
          ref.current.style.setProperty('--sidebar-x', SIDEBAR_EDGE_MARGIN);
          ref.current.style.setProperty('--sidebar-y', SIDEBAR_EDGE_MARGIN);
        } else {
          ref.current.style.removeProperty('--sidebar-x');
          ref.current.style.removeProperty('--sidebar-y');
        }
      }
    }
  }, [position, isMagnetizedToLeft, ref]);

  const handleNavLinkClick = () => {
    if (!isSidebarPinned && isOpen && !isRmbControlEnabled) { // Добавлено !isRmbControlEnabled для стандартного поведения
        setSidebarOpen(false);
    }
  };

  const roleAccess = {
    [UserRoleEnum.SUPER_ADMIN]: ["dashboard", "schools", "users", "user-roles", "subgroups", "grading-systems", "analytics", "messages", "notifications", "settings", "support"],
    [UserRoleEnum.SCHOOL_ADMIN]: ["dashboard", "users", "subjects-management", "school-admin-schedule-menu", "grading-systems", "analytics", "messages", "notifications", "settings", "support"],
    [UserRoleEnum.TEACHER]: ["dashboard", "teacher-classes-menu", "schedule", "homework", "messages", "documents", "support"],
    [UserRoleEnum.CLASS_TEACHER]: ["dashboard", "class-teacher-dashboard", "schedule", "homework", "grades", "messages", "documents", "support"],
    [UserRoleEnum.STUDENT]: ["dashboard", "schedule", "homework", "grades", "messages", "documents", "settings", "support"],
    [UserRoleEnum.PARENT]: ["dashboard", "grades", "messages", "documents", "support"],
    [UserRoleEnum.PRINCIPAL]: ["dashboard", "users", "school-admin-schedule-menu", "grades", "grading-systems", "analytics", "messages", "documents", "settings", "support"],
    [UserRoleEnum.VICE_PRINCIPAL]: ["dashboard", "users", "schedule", "grades", "grading-systems", "analytics", "messages", "documents", "settings", "support"]
  };

  const navItems: NavItem[] = [
    { id: "dashboard", label: "Главная", icon: <HomeIcon className="h-[22px] w-[22px] mr-4" />, href: "/" },
    { id: "class-teacher-dashboard", label: "Панель классного руководителя", icon: <UsersIcon className="h-[22px] w-[22px] mr-4" />, href: "/class-teacher-dashboard" },
    { id: "teacher-classes-menu", component: <TeacherClassesMenu /> },
    { id: "school-admin-schedule-menu", component: <SchoolAdminScheduleMenu /> },
    { id: "schools", label: "Школы", icon: <BuildingIcon className="h-[22px] w-[22px] mr-4" />, href: "/schools" },
    { id: "users", label: "Пользователи", icon: <Users2Icon className="h-[22px] w-[22px] mr-4" />, href: "/users" },
    { id: "user-roles", label: "Роли пользователей", icon: <UserCogIcon className="h-[22px] w-[22px] mr-4" />, href: "/user-roles" },
    { id: "subjects-management", label: "Предметы", icon: <NotebookPenIcon className="h-[22px] w-[22px] mr-4" />, href: "/subjects-management" },
    { id: "subgroups", label: "Подгруппы", icon: <UserPlusIcon className="h-[22px] w-[22px] mr-4" />, href: "/subgroups" },
    { id: "schedule", label: "Расписание", icon: <CalendarIcon className="h-[22px] w-[22px] mr-4" />, href: "/schedule" },
    { id: "grades", label: "Оценки", icon: <GraduationCapIcon className="h-[22px] w-[22px] mr-4" />, href: "/grades" },
    { id: "grading-systems", label: "Системы оценивания", icon: <ClipboardListIcon className="h-[22px] w-[22px] mr-4" />, href: "/grading-systems" },
    { id: "homework", label: "Домашние задания", icon: <BookIcon className="h-[22px] w-[22px] mr-4" />, href: "/homework" },
    { id: "messages", label: "Сообщения", icon: <MessagesSquareIcon className="h-[22px] w-[22px] mr-4" />, href: "/messages" },
    { id: "documents", label: "Документы", icon: <FolderIcon className="h-[22px] w-[22px] mr-4" />, href: "/documents" },
    { id: "analytics", label: "Аналитика", icon: <BarChartIcon className="h-[22px] w-[22px] mr-4" />, href: "/analytics" },
    { id: "notifications", label: "Уведомления", icon: <BellIcon className="h-[22px] w-[22px] mr-4" />, href: "/notifications" },
    { id: "settings", label: "Настройки", icon: <SettingsIcon className="h-[22px] w-[22px] mr-4" />, href: "/settings" },
    { id: "support", label: "Поддержка", icon: <HelpCircleIcon className="h-[22px] w-[22px] mr-4" />, href: "/support" }
  ];

  const userRole = user?.activeRole || user?.role || UserRoleEnum.STUDENT;
  const allowedItems = navItems.filter(item =>
    roleAccess[userRole]?.includes(item.id)
  );

  const sidebarNominalWidth = 308;
  const screenEdgePadding = 16;

  const sidebarStyle: React.CSSProperties = {
    top: `var(--sidebar-y, ${SIDEBAR_EDGE_MARGIN})`,
    left: `var(--sidebar-x, ${SIDEBAR_EDGE_MARGIN})`,
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    const isDraggable = isRmbControlEnabled && !isSidebarPinned && isOpen;
    if (e.button !== 0 || !isDraggable) return;

    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('button, a') || targetElement.closest('[role="button"], [role="link"], [data-radix-collection-item]')) return;
    
    e.stopPropagation();
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    const sidebarRect = (ref as React.RefObject<HTMLElement>)?.current?.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      sidebarX: sidebarRect?.left || position?.x || screenEdgePadding,
      sidebarY: sidebarRect?.top || position?.y || screenEdgePadding,
    };
    document.addEventListener('mousemove', throttledHandleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMoveCallback = (e: MouseEvent) => {
    if (!dragStartRef.current || !isOpen || isSidebarPinned) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    let newX = dragStartRef.current.sidebarX + deltaX;
    let newY = dragStartRef.current.sidebarY + deltaY;
    const sidebarCurrentHeight = (ref && typeof ref === 'object' && ref.current) ? ref.current.offsetHeight : window.innerHeight - 2 * screenEdgePadding;
    const clampedX = Math.max(screenEdgePadding, Math.min(newX, window.innerWidth - sidebarNominalWidth - screenEdgePadding));
    const clampedY = Math.max(screenEdgePadding, Math.min(newY, window.innerHeight - sidebarCurrentHeight - screenEdgePadding));

    if (justUnpinnedFromMagnetized) {
      const SNAP_RESET_BUFFER = 10;
      if (newX > X_MAGNET_THRESHOLD + SNAP_RESET_BUFFER) {
        onDragStartFromFloating?.();
      }
    }

    if (isRmbControlEnabled && isOpen && !isSidebarPinned && newX < X_MAGNET_THRESHOLD && !justUnpinnedFromMagnetized) {
      handleRequestMagnetSnap({ x: newX, y: clampedY });
      dragStartRef.current = null;
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', throttledHandleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (showMagnetHint) setShowMagnetHint(false);
      setIsDragging(false);
      return;
    }

    if (ref && typeof ref === 'object' && ref.current) {
      ref.current.style.setProperty('--sidebar-x', `${clampedX}px`);
      ref.current.style.setProperty('--sidebar-y', `${clampedY}px`);
    }
    setSidebarPosition({ x: clampedX, y: clampedY });

    let newHintState = false;
    const canShowHint = isRmbControlEnabled && !isSidebarPinned;
    if (canShowHint) {
      if (e.clientX < X_MAGNET_THRESHOLD) newHintState = true;
    }
    if (prevShowMagnetHintRef.current !== newHintState) {
      setShowMagnetHint(newHintState);
    }
  };

  const latestMouseMoveHandlerRef = useRef(handleMouseMoveCallback);
  useEffect(() => {
    latestMouseMoveHandlerRef.current = handleMouseMoveCallback;
  }, [handleMouseMoveCallback]);

  const throttledHandleMouseMove = useMemo(() => {
    return throttle((event: MouseEvent) => {
      latestMouseMoveHandlerRef.current(event);
    });
  }, []);

  const handleMouseUp = (event: MouseEvent) => {
    const wasDragging = !!dragStartRef.current;
    const shouldCallSnap = wasDragging && showMagnetHint && position;
    if (shouldCallSnap) {
      handleRequestMagnetSnap(position!);
    }
    setIsDragging(false);
    dragStartRef.current = null;
    if (showMagnetHint) setShowMagnetHint(false);
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', throttledHandleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      if (dragStartRef.current) {
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', throttledHandleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [throttledHandleMouseMove]);
  
  const renderNavItems = () => (
    <div className="space-y-[5px]"> {/* Этот div был space-y-[5px] */}
      {allowedItems.map((item) => {
        if ('component' in item) {
          // Для кастомных компонентов меню (TeacherClassesMenu, SchoolAdminScheduleMenu)
          // анимация не будет применяться этим общим методом.
          // Их нужно будет адаптировать отдельно, если потребуется.
          return <div key={item.id}>{item.component}</div>;
        }
        const linkItem = item as LinkMenuItem;
        const isActive = location === linkItem.href ||
                        (linkItem.href !== "/" && location.startsWith(linkItem.href));
        return (
          // Оборачиваем каждый элемент в div для relative positioning
          // и чтобы motion.div корректно позиционировался
          <div key={linkItem.id} className="relative">
            <Link href={linkItem.href} onClick={handleNavLinkClick}>
              <div
                className={cn(
                  "group flex items-center px-2 py-2 text-xl font-medium rounded-full transition-colors duration-150 ease-in-out", // Убрали transition для background-color
                  isActive
                    ? "text-[rgb(2,191,122)]" // Только текст активный
                    : "text-gray-800 hover:bg-black/5 hover:text-gray-900"
                )}
              >
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
            {isActive && (
              <motion.div
                layoutId="activeSidebarItemBackground" // Общий ID для анимации
                className="absolute inset-0 rounded-full bg-white/20 backdrop-blur-md shadow-md border border-white/30 -z-10"
                initial={false}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <aside
      ref={ref}
      onMouseDown={isRmbControlEnabled && isOpen ? handleMouseDown : undefined}
      onClick={!isOpen && isRmbControlEnabled ? requestClose : undefined}
      className={cn(
        "fixed z-40 rounded-3xl max-h-[calc(100vh-2rem)]",
        isDragging
          ? "transition-all duration-75 ease-linear" // Быстрее при перетаскивании
          : isAnimatingPin 
            ? "transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)" // Стандартная для закрепления
            : "transition-all duration-300 ease-out", // Плавное затухание для других случаев
        "backdrop-blur-2xl bg-transparent shadow-lg border border-white/15",
        "sidebar-glowing-effect",
        !isRmbControlEnabled && (isOpen ? "w-full sm:w-70 md:w-72 lg:w-[308px]" : "w-14 h-14 p-0"),
        isRmbControlEnabled && (
          isOpen
            ? ["w-full sm:w-70 md:w-72 lg:w-[308px] overflow-y-auto", // Убрал overflow-y-auto отсюда, чтобы не было двойного скролла
                (!isSidebarPinned && !dragStartRef.current) ? "cursor-grab" : "",
                dragStartRef.current ? "cursor-grabbing" : "",
                (showMagnetHint && !isSidebarPinned ? "outline outline-2 outline-offset-2 outline-blue-500 shadow-2xl" : "")
              ]
            : "w-14 p-3 flex items-center justify-center cursor-pointer overflow-hidden"
        ),
        !isRmbControlEnabled
          ? "opacity-100 scale-100 pointer-events-auto"
          : (isOpen
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-95 pointer-events-none"
            )
      )}
      style={sidebarStyle}
    >
      {!isRmbControlEnabled ? (
        <>
          <MorphingIcon
            isExpanded={isOpen}
            onClick={requestClose}
            className="h-10 w-10 text-gray-700 absolute top-3 left-3 z-10"
          />
          <div
            className={cn(
              "w-full h-full overflow-y-auto", // Скролл для контента если не RMB режим
              "transition-all duration-300 ease-in-out",
              isOpen
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-full pointer-events-none"
            )}
          >
            <div className="pt-14">
              <div
                className="p-5 cursor-pointer hover:bg-white/20 rounded-2xl transition-colors duration-150 ease-in-out"
                onClick={handleUserMenuToggle}
              >
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 border-2 border-slate-600/50">
                    <AvatarFallback className="bg-primary text-white">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3">
                    <p className="text-xl font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                  </div>
                </div>
              </div>
              <nav className="px-2 py-[10px]">
                {renderNavItems()}
              </nav>
            </div>
          </div>
        </>
      ) : (
        isOpen ? (
          // Для RMB режима скролл на основном aside если нужно
          <div className="h-full overflow-y-auto"> 
            <div className={cn(
              "flex items-center p-[14px]",
              "justify-between"
            )}>
              <>
                <button
                  onClick={toggleSidebarPin}
                  className="p-1 text-gray-700 hover:text-gray-900 hover:bg-black/5 rounded-md transition-colors"
                  aria-label={isSidebarPinned ? "Unpin sidebar" : "Pin sidebar"}
                >
                  {isSidebarPinned ? (
                    <PinOffIcon className="h-[22px] w-[22px]" />
                  ) : (
                    <PinIcon className="h-[22px] w-[22px]" />
                  )}
                </button>
                <BurgerIcon
                  isOpen={true}
                  onClick={requestClose}
                  className="text-gray-700 p-1 h-10 w-10 hover:bg-black/5 rounded-md transition-colors flex items-center justify-center"
                />
              </>
            </div>
            <div
              className="p-5 cursor-pointer hover:bg-white/20 rounded-2xl transition-colors duration-150 ease-in-out mx-2" // добавил mx-2 для соответствия nav
              onClick={handleUserMenuToggle}
            >
              <div className="flex items-center">
                <Avatar className="h-10 w-10 border-2 border-slate-600/50">
                  <AvatarFallback className="bg-primary text-white">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="text-xl font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                </div>
              </div>
            </div>

            <nav className="px-2 py-[10px]">
             {renderNavItems()}
            </nav>
          </div>
        ) : (
          null // В RMB режиме, если закрыт, ничего не рендерим внутри (кроме иконки открытия, если она снаружи)
        )
      )}
      <ContextMenu
        isOpen={contextMenuOpen}
        position={contextMenuPosition}
        onClose={closeContextMenu}
        currentRoleName={currentRoleDisplayName}
        availableRoles={availableRolesForMenu}
        onSelectRole={handleSelectRole}
        onLogout={handleLogout}
      />
    </aside>
  );
});