// client/src/components/layout/context-menu.tsx
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { UserRoleEnum } from '@shared/schema';
import { LogOutIcon, UsersIcon, ChevronDownIcon, CheckIcon } from 'lucide-react';
import { cn } from "@/lib/utils";

// ... (getRoleName and interfaces remain the same)
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
  const [portalNode, setPortalNode] = React.useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.document && window.document.body) {
      setPortalNode(window.document.body);
    }
  }, []);


  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const clickedElement = event.target as HTMLElement;
        if (clickedElement.closest('[data-radix-popper-content-wrapper]')) {
            return;
        }
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


  if (!isOpen || !portalNode) {
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

  const menuContent = (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-50 font-sans rounded-2xl border", // border class is generic
        "transition-all duration-200 ease-out",
        isAnimating ? "opacity-100 scale-100" : "opacity-0 scale-95",
        // Styles to match sidebar's glass
        "backdrop-blur-2xl bg-transparent border-white/15 text-slate-800 shadow-lg"
      )}
      style={{
        top: position.y,
        left: position.x,
        minWidth: '240px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <ul className="py-2">
        {(availableRoles && availableRoles.length > 0) && (
        <li
          className={cn(
            "mx-2 rounded-xl cursor-pointer flex justify-between items-center transition-colors duration-150 ease-in-out",
            "px-5 py-[14px]",
            "hover:bg-white/10", // Adjusted hover for bg-transparent: very light white hover
            availableRoles.length <= 1 ? 'opacity-70 cursor-default' : ''
          )}
          onClick={handleRoleItemClick}
        >
          <div className="flex items-center">
            <UsersIcon className="h-5 w-5 mr-3 text-slate-700" />
            <span className="font-medium text-base text-slate-800">{currentRoleName || "Роль не определена"}</span>
          </div>
          {availableRoles.length > 1 && (
            <ChevronDownIcon className={`h-5 w-5 text-slate-600 transition-transform duration-200 ${showRoleDropdown ? 'rotate-180' : ''}`} />
          )}
        </li>
        )}

        <div
          className={cn(
            "mt-1 mx-2 rounded-xl", // Main rounding
            "transition-all duration-300 ease-in-out overflow-hidden",
            // Nested dropdown also gets transparent bg, but maybe slightly different border/shadow for hierarchy
            "border-white/10", // Subtler border for nested
            showRoleDropdown && availableRoles.length > 0
              ? "opacity-100 max-h-48 visible backdrop-blur-xl bg-transparent shadow-md" // bg-transparent, smaller shadow
              : "opacity-0 max-h-0 invisible"
          )}
        >
          <ul className="py-1 max-h-full overflow-y-auto custom-scrollbar">
            {availableRoles.map((role) => (
              <li
                key={role.value}
                className="px-4 py-[10px] hover:bg-white/15 rounded-lg mx-1.5 my-1 cursor-pointer flex items-center transition-colors duration-150 ease-in-out" // Adjusted hover
                onClick={() => handleSelectRole(role.value)}
              >
                {isRoleActive(role.value) ? (
                  <CheckIcon className="h-4 w-4 mr-3 text-blue-600" />
                ) : (
                  <span className="w-4 mr-3"></span>
                )}
                <span className={cn(
                  "text-sm",
                  isRoleActive(role.value) ? 'font-semibold text-slate-800' : 'text-slate-800'
                )}>
                  {role.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {(availableRoles && availableRoles.length > 0) &&
          <div
            className="my-2 h-px mx-2.5 bg-white/20" // Separator for transparent bg
          ></div>
        }

        <li
          className={cn(
            "mx-2 rounded-xl cursor-pointer flex items-center transition-colors duration-150 ease-in-out",
            "px-5 py-[14px]",
            "hover:bg-white/10" // Adjusted hover
          )}
          onClick={handleLogoutClick}
        >
          <LogOutIcon className="h-5 w-5 mr-3 text-slate-700" />
          <span className="font-medium text-base text-slate-800">Выйти</span>
        </li>
      </ul>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.25);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.35);
        }
      `}</style>
    </div>
  );

  return createPortal(menuContent, portalNode);
};
