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
  PinOffIcon,
  XIcon
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { UserRoleEnum } from "@shared/schema";
// import { RoleSwitcher } from "@/components/role-switcher"; // REMOVED
import { TeacherClassesMenu } from "./teacher-classes-menu";
import { SchoolAdminScheduleMenu } from "./school-admin-schedule-menu";
import { ReactNode, forwardRef } from "react";

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
  toggleSidebarPin: () => void;
  requestClose: () => void;
  setSidebarOpen: (isOpen: boolean) => void; // Added setSidebarOpen
  position?: { x: number, y: number } | null; // New prop
  isAnimatingPin?: boolean; // ADD this prop
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  ({ isOpen, isSidebarPinned, toggleSidebarPin, requestClose, setSidebarOpen, position, isAnimatingPin }, ref) => {
  const [location] = useLocation();
  const { user } = useAuth();

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

  console.log('[Sidebar] Rendering. isOpen:', isOpen, 'isSidebarPinned:', isSidebarPinned, 'position:', position, 'isAnimatingPin:', isAnimatingPin);

  if (position && !isSidebarPinned) { // Condition changed: isOpen removed from here
    let top = position.y;
    let left = position.x;

    // Adjust if too close to the right edge
    if (left + sidebarNominalWidth + screenEdgePadding > window.innerWidth) {
      left = window.innerWidth - sidebarNominalWidth - screenEdgePadding;
    }
    // Adjust if too close to the bottom edge
    const sidebarCurrentHeight = (ref && typeof ref === 'object' && ref.current) 
                                  ? ref.current.offsetHeight 
                                  : (window.innerHeight - 2 * screenEdgePadding);
    if (top + sidebarCurrentHeight + screenEdgePadding > window.innerHeight) {
      top = window.innerHeight - sidebarCurrentHeight - screenEdgePadding;
    }

    // Ensure it's not off the top or left edge
    sidebarStyle.top = Math.max(screenEdgePadding, top) + 'px';
    sidebarStyle.left = Math.max(screenEdgePadding, left) + 'px';
    console.log('[Sidebar] Style: DYNAMIC/UNPINNED. top:', sidebarStyle.top, 'left:', sidebarStyle.left, 'isOpen:', isOpen);
  } else {
    // Default position for pinned state or when not dynamically positioned
    sidebarStyle.top = '1rem';
    sidebarStyle.left = '1rem';
    console.log('[Sidebar] Style: DEFAULT/PINNED. top: 1rem, left: 1rem, isOpen:', isOpen);
  }

  return (
    <aside
      ref={ref}
      className={cn(
        "fixed z-40 w-64 rounded-3xl max-h-[calc(100vh-2rem)]", // top-4, left-4 REMOVED
        "bg-transparent backdrop-blur-2xl shadow-lg border border-white/15", // MODIFIED: bg-white/10 to bg-transparent
        "overflow-y-auto sidebar overflow-hidden sidebar-glowing-effect", // `relative` removed, Scrolling, identifiers, effects
        isAnimatingPin ? "transition-all duration-300 ease-in-out" : "transition-[opacity,transform] duration-300 ease-in-out", // CONDITIONAL TRANSITION
        isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none" // Animation classes changed
      )}
      style={sidebarStyle} // ADDED style attribute
    >
      {/* Sidebar Header: Pin and Close buttons */}
      <div className="flex items-center justify-between p-3"> {/* Removed border-b border-slate-700/50 */}
        <button
          onClick={toggleSidebarPin}
          className="p-1 text-gray-700 hover:text-gray-900 hover:bg-black/5 rounded-md transition-colors" // MODIFIED: p-1.5 to p-1
          aria-label={isSidebarPinned ? "Unpin sidebar" : "Pin sidebar"}
        >
          {isSidebarPinned ? (
            <PinOffIcon className="h-4 w-4" />
          ) : (
            <PinIcon className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={requestClose}
          className="p-1 text-gray-700 hover:text-gray-900 hover:bg-black/5 rounded-md transition-colors" // MODIFIED: p-1.5 to p-1
          aria-label="Close sidebar"
        >
          <XIcon className="h-4 w-4" />
        </button>
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