import React from 'react';
import { UserRoleEnum, UserWithRoles } from '@shared/schema';
import { useRoleFilter, useAdvancedSearch } from '@/hooks/use-role-filter';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Crown, Shield, GraduationCap, Users, User, BookOpen, UserCheck } from 'lucide-react';

interface EnhancedRoleDisplayProps {
  user: UserWithRoles;
  showDetails?: boolean;
  compact?: boolean;
}

// Role icons mapping
const getRoleIcon = (role: UserRoleEnum) => {
  const iconMap = {
    [UserRoleEnum.SUPER_ADMIN]: Crown,
    [UserRoleEnum.SCHOOL_ADMIN]: Shield,
    [UserRoleEnum.PRINCIPAL]: Crown,
    [UserRoleEnum.VICE_PRINCIPAL]: UserCheck,
    [UserRoleEnum.TEACHER]: GraduationCap,
    [UserRoleEnum.CLASS_TEACHER]: BookOpen,
    [UserRoleEnum.STUDENT]: User,
    [UserRoleEnum.PARENT]: Users,
  };
  
  return iconMap[role] || User;
};

// Role color mapping
const getRoleColor = (role: UserRoleEnum) => {
  const colorMap = {
    [UserRoleEnum.SUPER_ADMIN]: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
    [UserRoleEnum.SCHOOL_ADMIN]: 'bg-red-500/20 text-red-700 border-red-500/30',
    [UserRoleEnum.PRINCIPAL]: 'bg-indigo-500/20 text-indigo-700 border-indigo-500/30',
    [UserRoleEnum.VICE_PRINCIPAL]: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
    [UserRoleEnum.TEACHER]: 'bg-green-500/20 text-green-700 border-green-500/30',
    [UserRoleEnum.CLASS_TEACHER]: 'bg-teal-500/20 text-teal-700 border-teal-500/30',
    [UserRoleEnum.STUDENT]: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
    [UserRoleEnum.PARENT]: 'bg-pink-500/20 text-pink-700 border-pink-500/30',
  };
  
  return colorMap[role] || 'bg-gray-500/20 text-gray-700 border-gray-500/30';
};

export function EnhancedRoleDisplay({ user, showDetails = false, compact = false }: EnhancedRoleDisplayProps) {
  const { getUserAllRoles } = useRoleFilter();
  const { getRoleName } = useAdvancedSearch();
  
  const allRoles = getUserAllRoles(user);
  
  if (allRoles.length === 0) {
    return (
      <Badge variant="outline" className="text-slate-500 border-slate-300">
        Нет ролей
      </Badge>
    );
  }

  if (compact && allRoles.length === 1) {
    const role = allRoles[0];
    const Icon = getRoleIcon(role);
    const isActive = user.activeRole === role;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              className={`${getRoleColor(role)} flex items-center gap-1 ${isActive ? 'ring-2 ring-emerald-500/50' : ''}`}
            >
              <Icon className="h-3 w-3" />
              {getRoleName(role)}
              {isActive && <span className="text-emerald-500">●</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isActive ? 'Активная роль' : 'Роль пользователя'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (compact && allRoles.length > 1) {
    const primaryRole = user.activeRole || allRoles[0];
    const Icon = getRoleIcon(primaryRole);
    const remainingCount = allRoles.length - 1;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <Badge className={`${getRoleColor(primaryRole)} flex items-center gap-1`}>
                <Icon className="h-3 w-3" />
                {getRoleName(primaryRole)}
                {user.activeRole === primaryRole && <span className="text-emerald-500">●</span>}
              </Badge>
              {remainingCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  +{remainingCount}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-semibold">Все роли:</p>
              {allRoles.map((role, index) => {
                const isActive = user.activeRole === role;
                return (
                  <p key={`${role}-${index}`} className={isActive ? 'text-emerald-600 font-medium' : ''}>
                    {getRoleName(role)} {isActive && '(активная)'}
                  </p>
                );
              })}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full display mode
  return (
    <div className="space-y-2">
      {allRoles.map((role, index) => {
        const Icon = getRoleIcon(role);
        const isActive = user.activeRole === role;
        
        return (
          <div key={`${role}-${index}`} className="flex items-center gap-2">
            <Badge 
              className={`${getRoleColor(role)} flex items-center gap-1 ${isActive ? 'ring-2 ring-emerald-500/50' : ''}`}
            >
              <Icon className="h-3 w-3" />
              {getRoleName(role)}
              {isActive && <span className="text-emerald-500 ml-1">●</span>}
            </Badge>
            
            {showDetails && user.roles && (
              <div className="text-xs text-slate-500">
                {/* Show additional role details if available */}
                {user.roles.find(ur => ur.role === role)?.schoolId && (
                  <span>Школа: {user.roles.find(ur => ur.role === role)?.schoolId}</span>
                )}
                {user.roles.find(ur => ur.role === role)?.classId && (
                  <span className="ml-2">Класс: {user.roles.find(ur => ur.role === role)?.classId}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
      
      {showDetails && allRoles.length > 1 && (
        <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">
          <p>
            Активная роль: {user.activeRole ? getRoleName(user.activeRole) : 'Не выбрана'}
          </p>
          <p>
            Всего ролей: {allRoles.length}
          </p>
        </div>
      )}
    </div>
  );
}

// Quick role indicator for table cells
export function QuickRoleIndicator({ user }: { user: UserWithRoles }) {
  return <EnhancedRoleDisplay user={user} compact={true} />;
}

// Detailed role display for dialogs/modals
export function DetailedRoleDisplay({ user }: { user: UserWithRoles }) {
  return <EnhancedRoleDisplay user={user} showDetails={true} />;
}
