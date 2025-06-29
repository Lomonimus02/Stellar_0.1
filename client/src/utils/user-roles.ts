import { UserRoleEnum, UserWithRoles, UserRoleModel } from '@shared/schema';

// Простые переводы ролей на русский язык
export const getRoleLabel = (role: string): string => {
  const roleLabels: Record<string, string> = {
    [UserRoleEnum.SUPER_ADMIN]: 'Супер-администратор',
    [UserRoleEnum.SCHOOL_ADMIN]: 'Администратор школы',
    [UserRoleEnum.TEACHER]: 'Учитель',
    [UserRoleEnum.STUDENT]: 'Ученик',
    [UserRoleEnum.PARENT]: 'Родитель',
    [UserRoleEnum.PRINCIPAL]: 'Директор',
    [UserRoleEnum.VICE_PRINCIPAL]: 'Завуч',
    [UserRoleEnum.CLASS_TEACHER]: 'Классный руководитель',
  };
  return roleLabels[role] || role;
};

// Интерфейс для пользователя с ролями (совместимость с существующим кодом)
export interface UserWithRolesCompat {
  id: number;
  firstName: string;
  lastName: string;
  role?: string; // legacy поле для обратной совместимости
  roles?: UserRoleModel[]; // новое поле с множественными ролями
  username?: string;
  avatarUrl?: string;
}

/**
 * Получает все роли пользователя из разных источников
 * Поддерживает как новую систему множественных ролей, так и legacy поле role
 */
export const getUserRoles = (user: UserWithRolesCompat): string[] => {
  const roles = new Set<string>();

  // Добавляем роли из массива roles (новая система)
  if (user.roles && Array.isArray(user.roles)) {
    user.roles.forEach(userRole => {
      if (userRole && userRole.role) {
        roles.add(userRole.role);
      }
    });
  }

  // Добавляем legacy роль если нет ролей в массиве
  if (roles.size === 0 && user.role) {
    roles.add(user.role);
  }

  return Array.from(roles);
};

/**
 * Получает основную (первую) роль пользователя для отображения
 */
export const getPrimaryUserRole = (user: UserWithRolesCompat): string | null => {
  const roles = getUserRoles(user);
  return roles.length > 0 ? roles[0] : null;
};

/**
 * Форматирует список ролей пользователя для отображения
 * @param user - пользователь
 * @param maxRoles - максимальное количество ролей для отображения (по умолчанию 3)
 * @param separator - разделитель между ролями (по умолчанию ', ')
 * @param context - контекст отображения (например, для группового чата)
 */
export const formatUserRoles = (
  user: UserWithRolesCompat,
  maxRoles: number = 3,
  separator: string = ', ',
  context?: {
    isGroupChatCreator?: boolean;
    isGroupChatAdmin?: boolean;
  }
): string => {
  // Если пользователь - создатель группового чата, показываем это
  if (context?.isGroupChatCreator) {
    return 'Администратор группы';
  }

  // Если пользователь - администратор группового чата (но не создатель), показываем это
  if (context?.isGroupChatAdmin) {
    return 'Администратор группы';
  }

  const roles = getUserRoles(user);

  if (roles.length === 0) {
    return 'Нет ролей';
  }

  if (roles.length === 1) {
    return getRoleLabel(roles[0]);
  }

  const roleLabels = roles.map(role => getRoleLabel(role));

  if (roles.length <= maxRoles) {
    return roleLabels.join(separator);
  }

  // Если ролей больше чем maxRoles, показываем первые maxRoles-1 и добавляем "и еще X"
  const visibleRoles = roleLabels.slice(0, maxRoles - 1);
  const remainingCount = roles.length - (maxRoles - 1);

  return `${visibleRoles.join(separator)} и еще ${remainingCount}`;
};

/**
 * Проверяет, есть ли у пользователя определенная роль
 */
export const userHasRole = (user: UserWithRolesCompat, targetRole: string): boolean => {
  const roles = getUserRoles(user);
  return roles.includes(targetRole);
};

/**
 * Проверяет, есть ли у пользователя любая из указанных ролей
 */
export const userHasAnyRole = (user: UserWithRolesCompat, targetRoles: string[]): boolean => {
  const roles = getUserRoles(user);
  return targetRoles.some(targetRole => roles.includes(targetRole));
};

/**
 * Получает все уникальные роли из массива пользователей для фильтрации
 */
export const getAvailableRoles = (users: UserWithRolesCompat[], excludeUserId?: number): string[] => {
  const allRoles = new Set<string>();

  users.forEach(user => {
    // Исключаем указанного пользователя (например, текущего)
    if (excludeUserId && user.id === excludeUserId) {
      return;
    }

    const userRoles = getUserRoles(user);
    userRoles.forEach(role => allRoles.add(role));
  });

  return Array.from(allRoles).sort();
};

/**
 * Фильтрует пользователей по выбранным ролям
 */
export const filterUsersByRoles = (
  users: UserWithRolesCompat[], 
  selectedRoles: string[], 
  excludeUserId?: number
): UserWithRolesCompat[] => {
  return users.filter(user => {
    // Исключаем указанного пользователя
    if (excludeUserId && user.id === excludeUserId) {
      return false;
    }

    // Если роли не выбраны, показываем всех
    if (selectedRoles.length === 0) {
      return true;
    }

    // Проверяем, есть ли у пользователя любая из выбранных ролей
    return userHasAnyRole(user, selectedRoles);
  });
};
