import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUserRoles, UserWithRolesCompat } from "@/utils/user-roles";

interface UserCardProps {
  user: UserWithRolesCompat;
  isSelected?: boolean;
  onClick?: () => void;
  showCheckmark?: boolean;
  context?: {
    isGroupChatCreator?: boolean;
    isGroupChatAdmin?: boolean;
  };
}

export function UserCard({ user, isSelected, onClick, showCheckmark = false, context }: UserCardProps) {
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  const rolesText = formatUserRoles(user, 3, ', ', context);
  
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
        <p className="text-xs text-gray-500 truncate" title={rolesText}>
          {rolesText}
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