import { useMemo } from 'react';
import { UserRoleEnum, UserWithRoles } from '@shared/schema';

/**
 * Advanced role filtering hook with enhanced capabilities
 * Provides optimized filtering functions for user roles
 */
export function useRoleFilter() {
  
  // Check if user has a specific role with comprehensive fallback logic
  const checkUserRole = (user: UserWithRoles, targetRole: UserRoleEnum): boolean => {
    try {
      if (!user || !targetRole) return false;

      // Priority 1: Check roles array (new multi-role system)
      if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
        const hasRole = user.roles.some(userRole => {
          return userRole && 
                 userRole.role === targetRole && 
                 userRole.userId === user.id;
        });
        if (hasRole) return true;
      }

      // Priority 2: Check active role
      if (user.activeRole === targetRole) return true;

      // Priority 3: Fallback to legacy role field
      if (user.role === targetRole) return true;

      return false;
    } catch (error) {
      console.error('Error in checkUserRole:', error, { 
        userId: user?.id, 
        targetRole,
        userRoles: user?.roles?.length || 0
      });
      return false;
    }
  };

  // Get all unique roles for a user
  const getUserAllRoles = (user: UserWithRoles): UserRoleEnum[] => {
    try {
      const roles = new Set<UserRoleEnum>();

      // Add roles from roles array
      if (user.roles && Array.isArray(user.roles)) {
        user.roles.forEach(userRole => {
          if (userRole && userRole.role) {
            roles.add(userRole.role);
          }
        });
      }

      // Add active role if not already included
      if (user.activeRole) {
        roles.add(user.activeRole);
      }

      // Add legacy role if not already included
      if (user.role) {
        roles.add(user.role);
      }

      return Array.from(roles);
    } catch (error) {
      console.error('Error getting user roles:', error, { userId: user?.id });
      return user?.role ? [user.role] : [];
    }
  };

  // Create a role filter function
  const createRoleFilter = (filterRole: UserRoleEnum | "all") => {
    return (user: UserWithRoles): boolean => {
      try {
        if (filterRole === "all") return true;
        return checkUserRole(user, filterRole);
      } catch (error) {
        console.error('Error in createRoleFilter:', error, { 
          userId: user?.id, 
          filterRole 
        });
        return false;
      }
    };
  };

  // Get user's primary role (for display purposes)
  const getUserPrimaryRole = (user: UserWithRoles): UserRoleEnum | null => {
    try {
      if (!user) return null;

      // Try to find active role first
      if (user.activeRole) {
        // Check if active role exists in roles array
        if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
          const activeRoleExists = user.roles.some(ur => ur && ur.role === user.activeRole);
          if (activeRoleExists) return user.activeRole;
        } else {
          // If no roles array, return active role directly
          return user.activeRole;
        }
      }

      // Check roles array
      if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
        const firstRole = user.roles[0];
        if (firstRole && firstRole.role) {
          return firstRole.role;
        }
      }

      // Fallback to old role field
      if (user.role) {
        return user.role;
      }

      return null;
    } catch (error) {
      console.error('Error getting user primary role:', error, { userId: user?.id });
      return user?.role || null;
    }
  };

  // Check if user has any of the specified roles
  const userHasAnyRole = (user: UserWithRoles, roles: UserRoleEnum[]): boolean => {
    try {
      if (!user || !roles || roles.length === 0) return false;
      
      return roles.some(role => checkUserRole(user, role));
    } catch (error) {
      console.error('Error in userHasAnyRole:', error, { 
        userId: user?.id, 
        roles 
      });
      return false;
    }
  };

  // Check if user has all of the specified roles
  const userHasAllRoles = (user: UserWithRoles, roles: UserRoleEnum[]): boolean => {
    try {
      if (!user || !roles || roles.length === 0) return false;
      
      return roles.every(role => checkUserRole(user, role));
    } catch (error) {
      console.error('Error in userHasAllRoles:', error, { 
        userId: user?.id, 
        roles 
      });
      return false;
    }
  };

  // Get role statistics for a list of users
  const getRoleStatistics = (users: UserWithRoles[]) => {
    try {
      const stats = new Map<UserRoleEnum, number>();
      
      users.forEach(user => {
        const userRoles = getUserAllRoles(user);
        userRoles.forEach(role => {
          stats.set(role, (stats.get(role) || 0) + 1);
        });
      });

      return Object.fromEntries(stats);
    } catch (error) {
      console.error('Error calculating role statistics:', error);
      return {};
    }
  };

  // Filter users by multiple roles
  const filterUsersByRoles = (users: UserWithRoles[], roles: UserRoleEnum[], matchAll = false) => {
    try {
      if (!users || !Array.isArray(users)) return [];
      if (!roles || roles.length === 0) return users;

      return users.filter(user => {
        return matchAll 
          ? userHasAllRoles(user, roles)
          : userHasAnyRole(user, roles);
      });
    } catch (error) {
      console.error('Error filtering users by roles:', error, { roles, matchAll });
      return [];
    }
  };

  return {
    checkUserRole,
    getUserAllRoles,
    createRoleFilter,
    getUserPrimaryRole,
    userHasAnyRole,
    userHasAllRoles,
    getRoleStatistics,
    filterUsersByRoles
  };
}

/**
 * Hook for creating memoized filter functions
 */
export function useMemoizedRoleFilter(roleFilter: UserRoleEnum | "all") {
  const { createRoleFilter } = useRoleFilter();
  
  return useMemo(() => {
    return createRoleFilter(roleFilter);
  }, [roleFilter, createRoleFilter]);
}

/**
 * Hook for advanced search functionality
 */
export function useAdvancedSearch() {
  const { getUserAllRoles } = useRoleFilter();

  // Get role display name
  const getRoleName = (role: UserRoleEnum): string => {
    const roleNames = {
      [UserRoleEnum.SUPER_ADMIN]: "Супер-администратор",
      [UserRoleEnum.SCHOOL_ADMIN]: "Администратор школы",
      [UserRoleEnum.TEACHER]: "Учитель",
      [UserRoleEnum.STUDENT]: "Ученик",
      [UserRoleEnum.PARENT]: "Родитель",
      [UserRoleEnum.PRINCIPAL]: "Директор",
      [UserRoleEnum.VICE_PRINCIPAL]: "Завуч",
      [UserRoleEnum.CLASS_TEACHER]: "Классный руководитель"
    };

    return roleNames[role] || role;
  };

  // Create advanced search filter
  const createSearchFilter = (query: string) => {
    if (!query || query.trim() === '') return () => true;
    
    const searchTerms = query.toLowerCase().trim().split(/\s+/);
    
    return (user: UserWithRoles): boolean => {
      try {
        const searchableFields = [
          user.username,
          user.firstName,
          user.lastName,
          user.email,
          user.phone,
          // Include role names in search
          ...getUserAllRoles(user).map(role => getRoleName(role))
        ].filter(Boolean).map(field => field.toLowerCase());

        const searchText = searchableFields.join(' ');
        
        return searchTerms.every(term => 
          searchableFields.some(field => field.includes(term)) ||
          searchText.includes(term)
        );
      } catch (error) {
        console.error('Error in search filter:', error, { userId: user?.id, query });
        return false;
      }
    };
  };

  return {
    createSearchFilter,
    getRoleName
  };
}
