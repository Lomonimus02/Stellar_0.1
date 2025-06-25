import { useAuth } from "./use-auth";
import { UserRoleEnum } from "@shared/schema";

/**
 * Хук для проверки текущей активной роли пользователя
 * Используется для условного рендеринга компонентов в зависимости от роли
 */
export function useRoleCheck() {
  const { user } = useAuth();
  
  // Получаем активную роль пользователя
  const activeRole = user?.activeRole || user?.role;
  
  // Функция для проверки, имеет ли пользователь одну из указанных ролей
  const hasRole = (roles: UserRoleEnum[]) => {
    if (!activeRole) return false;
    return roles.includes(activeRole);
  };
  
  // Функция для проверки, является ли пользователь админом (суперадмин или школьный админ)
  const isAdmin = () => {
    if (!activeRole) return false;
    return [UserRoleEnum.SUPER_ADMIN, UserRoleEnum.SCHOOL_ADMIN, UserRoleEnum.PRINCIPAL].includes(activeRole);
  };
  
  // Функция для проверки, может ли пользователь редактировать данные (суперадмин или школьный админ)
  const canEdit = () => {
    if (!activeRole) return false;
    return [UserRoleEnum.SUPER_ADMIN, UserRoleEnum.SCHOOL_ADMIN].includes(activeRole);
  };
  
  // Функция для проверки, является ли пользователь суперадмином
  const isSuperAdmin = () => {
    if (!activeRole) return false;
    return activeRole === UserRoleEnum.SUPER_ADMIN;
  };
  
  // Функция для проверки, является ли пользователь школьным админом
  const isSchoolAdmin = () => {
    if (!activeRole) return false;
    return activeRole === UserRoleEnum.SCHOOL_ADMIN;
  };
  
  // Функция для проверки, является ли пользователь директором
  const isPrincipal = () => {
    if (!activeRole) return false;
    return activeRole === UserRoleEnum.PRINCIPAL;
  };
  
  // Функция для проверки, является ли пользователь завучем
  const isVicePrincipal = () => {
    if (!activeRole) return false;
    return activeRole === UserRoleEnum.VICE_PRINCIPAL;
  };
  
  // Функция для проверки, является ли пользователь учителем
  const isTeacher = () => {
    if (!activeRole) return false;
    return activeRole === UserRoleEnum.TEACHER;
  };
  
  // Функция для проверки, является ли пользователь классным руководителем
  const isClassTeacher = () => {
    if (!activeRole) return false;
    return activeRole === UserRoleEnum.CLASS_TEACHER;
  };
  
  // Функция для проверки, является ли пользователь учеником
  const isStudent = () => {
    if (!activeRole) return false;
    return activeRole === UserRoleEnum.STUDENT;
  };
  
  // Функция для проверки, является ли пользователь родителем
  const isParent = () => {
    if (!activeRole) return false;
    return activeRole === UserRoleEnum.PARENT;
  };
  
  // Функция для проверки, может ли пользователь видеть выпадающий список с расписанием
  const canViewScheduleDropdown = () => {
    if (!activeRole) return false;
    return [UserRoleEnum.SUPER_ADMIN, UserRoleEnum.SCHOOL_ADMIN, UserRoleEnum.PRINCIPAL, UserRoleEnum.VICE_PRINCIPAL].includes(activeRole);
  };
  
  // Получаем текущую активную роль
  const currentRole = () => activeRole;
  
  return {
    hasRole,
    isAdmin,
    canEdit,
    isSuperAdmin,
    isSchoolAdmin,
    isPrincipal,
    isVicePrincipal,
    isTeacher,
    isClassTeacher,
    isStudent,
    isParent,
    canViewScheduleDropdown,
    currentRole
  };
}