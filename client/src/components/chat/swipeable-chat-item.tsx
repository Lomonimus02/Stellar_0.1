import React, { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Edit, Trash2, LogOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChatTypeEnum } from '@shared/schema';
import { ChatContextMenu } from './chat-context-menu';

type SwipeableChatItemProps = {
  children: React.ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  onLeave?: () => void;
  chatType: string;
  isCreator: boolean;
  className?: string;
};

export function SwipeableChatItem({ 
  children, 
  onDelete, 
  onEdit, 
  onLeave,
  chatType,
  isCreator,
  className 
}: SwipeableChatItemProps) {
  const [swipedLeft, setSwipedLeft] = useState(false);

  const handlers = useSwipeable({
    onSwipedLeft: () => setSwipedLeft(true),
    onSwipedRight: () => setSwipedLeft(false),
    trackMouse: false,
    delta: 10,
    touchEventOptions: { passive: false },
  });

  // Закрыть меню действий
  const closeActions = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSwipedLeft(false);
  };

  // Определяем доступные действия на основе типа чата и роли пользователя
  const canEdit = chatType === ChatTypeEnum.GROUP && onEdit;
  const canLeave = chatType === ChatTypeEnum.GROUP && !isCreator && onLeave;
  const canDelete = (chatType === ChatTypeEnum.PRIVATE) || 
                  (chatType === ChatTypeEnum.GROUP && isCreator && onDelete);

  return (
    <ChatContextMenu
      chatType={chatType}
      isCreator={isCreator}
      onDelete={canDelete ? onDelete : undefined}
      onEdit={canEdit ? onEdit : undefined}
      onLeave={canLeave ? onLeave : undefined}
    >
      <div className={cn("relative overflow-hidden", className)}>
        <div
          {...handlers}
          className={cn(
            "transition-transform duration-200 ease-out flex items-center",
            {
              "transform -translate-x-32": swipedLeft && chatType === ChatTypeEnum.GROUP && isCreator,
              "transform -translate-x-24": swipedLeft && ((chatType === ChatTypeEnum.PRIVATE) || 
                                          (chatType === ChatTypeEnum.GROUP && !isCreator))
            }
          )}
        >
          {children}
        </div>

        {/* Действия при свайпе (для мобильных устройств) */}
        <div 
          className={cn(
            "absolute top-0 right-0 h-full flex items-center",
            "transition-opacity duration-200",
            swipedLeft ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <div className="flex h-full">
            {/* Выход из группового чата (все участники, кроме создателя) */}
            {chatType === ChatTypeEnum.GROUP && !isCreator && onLeave && (
              <Button 
                variant="destructive" 
                size="sm" 
                className="h-full px-2 rounded-none"
                onClick={(e) => {
                  e.stopPropagation();
                  onLeave();
                }}
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span className="text-xs">Выйти</span>
              </Button>
            )}

            {/* Редактирование названия группового чата */}
            {chatType === ChatTypeEnum.GROUP && onEdit && (
              <Button 
                variant="secondary" 
                size="sm" 
                className="h-full px-2 rounded-none"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}

            {/* Удаление чата */}
            {canDelete && (
              <Button 
                variant="destructive" 
                size="sm" 
                className="h-full px-2 rounded-none"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete && onDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            {/* Кнопка закрытия меню действий */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-full px-2 rounded-none"
              onClick={closeActions}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </ChatContextMenu>
  );
}