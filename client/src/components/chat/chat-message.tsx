import React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { MessageContextMenu, useCopyToClipboard } from './message-context-menu';
import { MessageReplyInline } from './message-reply';
import { useToast } from '@/hooks/use-toast';

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

interface ChatMessageProps {
  message: Message;
  currentUserId: number;
  onReply: (message: Message) => void;
  className?: string;
}

export function ChatMessage({ 
  message, 
  currentUserId, 
  onReply, 
  className 
}: ChatMessageProps) {
  const { toast } = useToast();
  const { copyToClipboard } = useCopyToClipboard();
  const isOwnMessage = message.senderId === currentUserId;

  // Обработка копирования сообщения
  const handleCopy = async (msg: Message) => {
    if (msg.content) {
      const success = await copyToClipboard(msg.content);
      if (success) {
        toast({
          title: "Скопировано",
          description: "Текст сообщения скопирован в буфер обмена",
        });
      } else {
        toast({
          title: "Ошибка",
          description: "Не удалось скопировать текст",
          variant: "destructive",
        });
      }
    }
  };

  // Форматирование времени
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, 'HH:mm', { locale: ru });
    } else if (diffInHours < 24 * 7) {
      return format(date, 'EEE HH:mm', { locale: ru });
    } else {
      return format(date, 'dd.MM HH:mm', { locale: ru });
    }
  };

  // Рендер вложения
  const renderAttachment = () => {
    if (!message.hasAttachment || !message.attachmentUrl) return null;

    if (message.attachmentType === 'image') {
      return (
        <div className="mt-2">
          <img
            src={message.attachmentUrl}
            alt="Вложение"
            className="max-w-xs max-h-64 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(message.attachmentUrl!, '_blank')}
          />
        </div>
      );
    }

    return (
      <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <a
          href={message.attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
        >
          <span>📎</span>
          <span>
            {message.attachmentType === 'document' ? 'Документ' : 'Файл'}
          </span>
        </a>
      </div>
    );
  };

  return (
    <MessageContextMenu
      message={message}
      currentUserId={currentUserId}
      onReply={onReply}
      onCopy={handleCopy}
    >
      <div className={cn(
        "group flex gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer",
        className
      )}>
        {/* Аватар */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {message.sender.firstName.charAt(0)}{message.sender.lastName.charAt(0)}
          </div>
        </div>

        {/* Содержимое сообщения */}
        <div className="flex-1 min-w-0">
          {/* Заголовок с именем и временем */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {message.sender.firstName} {message.sender.lastName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(message.sentAt)}
            </span>
            {isOwnMessage && (
              <span className="text-xs text-blue-500 dark:text-blue-400">
                (вы)
              </span>
            )}
          </div>

          {/* Ответ на сообщение */}
          {message.replyToMessage && (
            <MessageReplyInline 
              replyToMessage={message.replyToMessage} 
              className="mb-2"
            />
          )}

          {/* Текст сообщения */}
          {message.content && (
            <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}

          {/* Вложения */}
          {renderAttachment()}
        </div>
      </div>
    </MessageContextMenu>
  );
}
