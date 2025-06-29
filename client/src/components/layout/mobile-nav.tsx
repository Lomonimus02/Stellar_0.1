// client/src/components/layout/mobile-nav.tsx
import { Link, useLocation } from "wouter";
import {
  HomeIcon,
  BookIcon,
  Users2Icon,
  BarChartIcon,
  BuildingIcon,
  MoreHorizontalIcon,
  CalendarIcon,
  GraduationCapIcon,
  MessagesSquareIcon // Импортируем иконку для сообщений
} from "lucide-react";
import { UserRoleEnum } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  // Maps user roles to which menu items they can see in the mobile nav
  const roleAccess = {
    [UserRoleEnum.SUPER_ADMIN]: ["dashboard", "schools", "users", "analytics", "more"],
    [UserRoleEnum.SCHOOL_ADMIN]: ["dashboard", "users", "schedule", "grades", "more"],
    [UserRoleEnum.TEACHER]: ["dashboard", "schedule", "homework", "grades", "more"],
    [UserRoleEnum.STUDENT]: ["dashboard", "schedule", "homework", "grades", "more"],
    [UserRoleEnum.PARENT]: ["dashboard", "grades", "messages", "more"], // Добавим "messages" для родителя
    [UserRoleEnum.PRINCIPAL]: ["dashboard", "users", "grades", "analytics", "more"],
    [UserRoleEnum.VICE_PRINCIPAL]: ["dashboard", "users", "grades", "analytics", "more"],
    [UserRoleEnum.CLASS_TEACHER]: ["dashboard", "schedule", "homework", "grades", "more"], // Добавим для классного руководителя
  };

  // Mobile navigation items (limited to 5 for the bottom bar)
  const navItems = [
    { id: "dashboard", label: "Главная", icon: <HomeIcon className="h-5 w-5" />, href: "/" },
    { id: "schools", label: "Школы", icon: <BuildingIcon className="h-5 w-5" />, href: "/schools" },
    { id: "users", label: "Пользователи", icon: <Users2Icon className="h-5 w-5" />, href: "/users" },
    { id: "schedule", label: "Расписание", icon: <CalendarIcon className="h-5 w-5" />, href: "/schedule"}, // Добавим расписание
    { id: "grades", label: "Оценки", icon: <GraduationCapIcon className="h-5 w-5" />, href: "/grades"}, // Добавим оценки
    { id: "homework", label: "Дз", icon: <BookIcon className="h-5 w-5" />, href: "/homework" },
    { id: "messages", label: "Сообщения", icon: <MessagesSquareIcon className="h-5 w-5" />, href: "/messages" }, // Добавим сообщения
    { id: "analytics", label: "Аналитика", icon: <BarChartIcon className="h-5 w-5" />, href: "/analytics" },
    // { id: "more", label: "Ещё", icon: <MoreHorizontalIcon className="h-5 w-5" />, href: "/more" } // Убрали "Ещё" пока нет такой страницы
  ];

  // Filter nav items based on user role (keep max 5 items for mobile)
  const userRole = user?.activeRole || user?.role || UserRoleEnum.STUDENT; // Используем activeRole
  const allowedItems = navItems.filter(item =>
    roleAccess[userRole]?.includes(item.id)
  ).slice(0, 5);

  return (
    <nav className="md:hidden bg-white border-t border-gray-200 px-4 py-3 fixed bottom-0 left-0 right-0 flex justify-around">
      {allowedItems.map((item) => {
        const isActive = location === item.href ||
                        (item.href !== "/" && location.startsWith(item.href));

        return (
          // Применяем стили и обработчики прямо к Link, убираем вложенный <a>
          <Link
            key={item.id}
            href={item.href}
            className="flex flex-col items-center" // Переносим классы сюда
          >
            <span className={cn(
              isActive ? "text-primary" : "text-gray-500"
            )}>
              {item.icon}
            </span>
            <span className={cn(
              "text-xs mt-1",
              isActive ? "text-primary" : "text-gray-500"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}