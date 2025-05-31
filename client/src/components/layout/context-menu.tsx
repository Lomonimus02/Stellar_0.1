import React, { useEffect, useRef } from 'react';
import { UserRoleEnum } from '@shared/schema';
import { LogOutIcon, UsersIcon, ChevronDownIcon, CheckIcon } from 'lucide-react';
import { cn } from "@/lib/utils"; // Import cn utility

// Helper to get readable role names
const getRoleName = (role: UserRoleEnum) => {
  const roleMap = {
    [UserRoleEnum.SUPER_ADMIN]: "Супер-Администратор",
    [UserRoleEnum.SCHOOL_ADMIN]: "Администратор школы",
    [UserRoleEnum.TEACHER]: "Учитель",
    [UserRoleEnum.STUDENT]: "Ученик",
    [UserRoleEnum.PARENT]: "Родитель",
    [UserRoleEnum.PRINCIPAL]: "Директор",
    [UserRoleEnum.VICE_PRINCIPAL]: "Завуч",
    [UserRoleEnum.CLASS_TEACHER]: "Классный руководитель"
  };
  return roleMap[role] || role;
};

interface RoleOption {
  value: UserRoleEnum;
  label: string;
}

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  currentRoleName: string;
  availableRoles: RoleOption[];
  onSelectRole: (role: UserRoleEnum) => void;
  onLogout: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  onClose,
  currentRoleName,
  availableRoles,
  onSelectRole,
  onLogout,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showRoleDropdown, setShowRoleDropdown] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);

  useEffect(() => {
    if (isOpen) {
      // Use a timeout to allow the component to mount with initial styles (opacity-0)
      // then switch to final styles (opacity-100) to trigger the transition.
      const timer = setTimeout(() => setIsAnimating(true), 10); // Small delay
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false); // Reset for next open
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false);
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
      setShowRoleDropdown(false);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleRoleItemClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (availableRoles.length <= 1) return;
    setShowRoleDropdown(!showRoleDropdown);
  };

  const handleSelectRole = (roleValue: UserRoleEnum) => {
    onSelectRole(roleValue);
    setShowRoleDropdown(false);
    onClose();
  };

  const handleLogoutClick = () => {
    onLogout();
    setShowRoleDropdown(false);
    onClose();
  }

  const isRoleActive = (roleValue: UserRoleEnum) => {
    return getRoleName(roleValue) === currentRoleName;
  };

  return (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-50 font-sans text-gray-800 rounded-2xl", // Base classes
        // Transition classes
        "transition-all duration-200 ease-out",
        // Initial state (pre-animation)
        isAnimating ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}
      style={{
        top: position.y,
        left: position.x,
        // transformOrigin: 'top left', // Example if scale needs specific origin based on position
        minWidth: '180px', // Keep current size
        backdropFilter: 'blur(40px)', // Updated
        backgroundColor: 'rgba(226, 232, 240, 0.15)', // REVERTED HERE
        border: '1px solid rgba(226, 232, 240, 0.4)', // Updated, derived from bg color
        boxShadow: 'none', // Explicitly remove shadow
        overflow: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <ul className="py-1.5">
        {(availableRoles && availableRoles.length > 0) && (
        <li
          className={`px-3 py-2 hover:bg-slate-400/10 cursor-pointer flex justify-between items-center transition-colors duration-150 ease-in-out ${availableRoles.length <= 1 ? 'opacity-70 cursor-default' : ''}`}
          onClick={handleRoleItemClick}
        >
          <div className="flex items-center">
            <UsersIcon className="h-4 w-4 mr-2.5 text-gray-500" />
            <span className="font-medium">{currentRoleName || "Роль не определена"}</span>
          </div>
          {availableRoles.length > 1 && (
            <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${showRoleDropdown ? 'rotate-180' : ''}`} />
          )}
        </li>
        )}

        {/* Role Dropdown - always in DOM for CSS transitions */}
        <div
          className={cn(
            "mt-1 mx-1.5 rounded-md shadow-inner", // shadow-inner can stay for depth
            "transition-all duration-300 ease-in-out overflow-hidden",
            showRoleDropdown && availableRoles.length > 1
              ? "opacity-100 max-h-48 visible"
              : "opacity-0 max-h-0 invisible"
          )}
          style={{
            backgroundColor: 'rgba(226, 232, 240, 0.25)', // REVERTED HERE
          }}
        >
          <ul className="py-1 max-h-full overflow-y-auto custom-scrollbar">
            {availableRoles.map((role) => (
              <li
                key={role.value}
                className="px-3 py-2 hover:bg-slate-400/20 cursor-pointer flex items-center text-xs transition-colors duration-150 ease-in-out" // Adjusted hover
                onClick={() => handleSelectRole(role.value)}
              >
                {isRoleActive(role.value) ? (
                  <CheckIcon className="h-3.5 w-3.5 mr-2.5 text-blue-600" />
                ) : (
                  <span className="w-3.5 mr-2.5"></span>
                )}
                <span className={isRoleActive(role.value) ? 'font-semibold text-gray-900' : 'text-gray-700'}>
                  {role.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {(availableRoles && availableRoles.length > 0) &&
          <div
            className="my-1.5 h-px mx-2"
            style={{backgroundColor: 'rgba(203, 213, 225, 0.5)'}} // slate-300 with opacity
          ></div>
        }

        <li
          className="px-3 py-2 hover:bg-slate-400/10 cursor-pointer flex items-center transition-colors duration-150 ease-in-out" // Adjusted hover
          onClick={handleLogoutClick}
        >
          <LogOutIcon className="h-4 w-4 mr-2.5 text-gray-500" />
          <span className="font-medium">Выйти</span>
        </li>
      </ul>
      {/* Corrected style jsx global block */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
};
