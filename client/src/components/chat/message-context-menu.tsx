import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Reply, Copy, Trash2, Edit } from 'lucide-react';

// Интерфейс для сообщения
interface Message {
  id: number;
  content: string | null;
  hasAttachment: boolean;
  attachmentType: string | null;
  attachmentUrl: string | null;
  senderId: number;
  sentAt: string;
  sender: {
    id: number;
    firstName: string;
    lastName: string;
  };
  replyToMessage?: Message;
}

interface MessageContextMenuProps {
  message: Message;
  currentUserId: number;
  onReply: (message: Message) => void;
  onCopy?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  children: React.ReactNode;
}

export function MessageContextMenu({
  message,
  currentUserId,
  onReply,
  onCopy,
  onEdit,
  onDelete,
  children
}: MessageContextMenuProps) {
  const isOwnMessage = message.senderId === currentUserId;
  const hasContent = Boolean(message.content);

  const handleCopy = () => {
    if (message.content && onCopy) {
      onCopy(message);
    }
  };

  const handleEdit = () => {
    if (isOwnMessage && onEdit) {
      onEdit(message);
    }
  };

  const handleDelete = () => {
    if (isOwnMessage && onDelete) {
      onDelete(message);
    }
  };

  const handleReply = () => {
    onReply(message);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {/* Ответить - доступно для всех сообщений */}
        <ContextMenuItem onClick={handleReply} className="flex items-center gap-2">
          <Reply className="h-4 w-4" />
          Ответить
        </ContextMenuItem>

        {/* Копировать - только если есть текст */}
        {hasContent && onCopy && (
          <ContextMenuItem onClick={handleCopy} className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Копировать текст
          </ContextMenuItem>
        )}

        {/* Редактировать - только свои сообщения */}
        {isOwnMessage && onEdit && (
          <ContextMenuItem onClick={handleEdit} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Редактировать
          </ContextMenuItem>
        )}

        {/* Удалить - только свои сообщения */}
        {isOwnMessage && onDelete && (
          <ContextMenuItem 
            onClick={handleDelete} 
            className="flex items-center gap-2 text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            Удалить
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Хук для обработки копирования текста
export function useCopyToClipboard() {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback для старых браузеров
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        return result;
      } catch (fallbackErr) {
        console.error('Failed to copy text:', fallbackErr);
        return false;
      }
    }
  };

  return { copyToClipboard };
}
