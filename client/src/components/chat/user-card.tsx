import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Простые переводы ролей на русский язык
const getRoleLabel = (role: string): string => {
  const roleLabels: Record<string, string> = {
    'super_admin': 'Супер-администратор',
    'school_admin': 'Администратор школы',
    'teacher': 'Учитель',
    'student': 'Ученик',
    'parent': 'Родитель',
    'principal': 'Директор',
    'vice_principal': 'Завуч',
    'class_teacher': 'Классный руководитель',
  };
  return roleLabels[role] || role;
};

interface UserCardProps {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
    username?: string;
    avatarUrl?: string;
  };
  isSelected?: boolean;
  onClick?: () => void;
  showCheckmark?: boolean;
}

export function UserCard({ user, isSelected, onClick, showCheckmark = false }: UserCardProps) {
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  const roleName = getRoleLabel(user.role);
  
  return (
    <div
      className={cn(
        "flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 border",
        "hover:bg-gray-50 hover:border-gray-300",
        isSelected
          ? "bg-primary/10 border-primary shadow-sm"
          : "bg-white border-gray-200",
        "group"
      )}
      onClick={onClick}
    >
      <Avatar className="h-12 w-12 mr-3">
        {user.avatarUrl ? (
          <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />
        ) : (
          <AvatarFallback className={cn(
            "bg-gray-200 text-gray-700 font-medium",
            isSelected && "bg-primary text-white"
          )}>
            {initials}
          </AvatarFallback>
        )}
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {roleName}
        </p>
      </div>
      {showCheckmark && isSelected && (
        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ml-2">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
}