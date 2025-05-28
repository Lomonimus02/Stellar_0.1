import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Edit, Trash2, LogOut } from 'lucide-react';
import { ChatTypeEnum } from '@shared/schema';

interface ChatContextMenuProps {
  children: React.ReactNode;
  chatType: string;
  isCreator: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onLeave?: () => void;
}

export function ChatContextMenu({
  children,
  chatType,
  isCreator,
  onEdit,
  onDelete,
  onLeave
}: ChatContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {/* Редактирование названия группового чата (все участники) */}
        {chatType === ChatTypeEnum.GROUP && onEdit && (
          <ContextMenuItem className="cursor-pointer" onClick={(e) => {
            e.preventDefault();
            onEdit();
          }}>
            <Edit className="h-4 w-4 mr-2" />
            <span>Редактировать название</span>
          </ContextMenuItem>
        )}
        
        {/* Выход из группового чата (все участники, кроме создателя) */}
        {chatType === ChatTypeEnum.GROUP && !isCreator && onLeave && (
          <ContextMenuItem 
            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" 
            onClick={(e) => {
              e.preventDefault();
              onLeave();
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span>Выйти из чата</span>
          </ContextMenuItem>
        )}
        
        {/* Удаление для приватных чатов (всегда) и групповых (только создатель) */}
        {onDelete && (
          <ContextMenuItem 
            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" 
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            <span>Удалить чат</span>
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}