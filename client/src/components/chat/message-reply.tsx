import React from 'react';
import { cn } from '@/lib/utils';
import { Reply, X } from 'lucide-react';

// Интерфейс для сообщения с информацией об отправителе
interface MessageWithSender {
  id: number;
  content: string | null;
  hasAttachment: boolean;
  attachmentType: string | null;
  attachmentUrl: string | null;
  sentAt: string;
  sender: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface MessageReplyProps {
  replyToMessage: MessageWithSender;
  className?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  variant?: 'preview' | 'inline';
}

export function MessageReply({ 
  replyToMessage, 
  className, 
  showCloseButton = false, 
  onClose,
  variant = 'inline'
}: MessageReplyProps) {
  const isPreview = variant === 'preview';
  
  // Обрезаем длинные сообщения
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Получаем текст для отображения
  const getDisplayText = () => {
    if (replyToMessage.content) {
      return truncateText(replyToMessage.content, isPreview ? 150 : 100);
    }
    if (replyToMessage.hasAttachment) {
      const attachmentText = replyToMessage.attachmentType === 'image' 
        ? '📷 Изображение' 
        : replyToMessage.attachmentType === 'document' 
        ? '📄 Документ' 
        : '📎 Вложение';
      return attachmentText;
    }
    return 'Сообщение';
  };

  return (
    <div className={cn(
      "relative border-l-4 border-blue-400 bg-gray-50 dark:bg-gray-800/50 rounded-r-lg",
      isPreview ? "p-3 mb-2" : "p-2 mb-1",
      className
    )}>
      {/* Кнопка закрытия для превью */}
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="absolute top-1 right-1 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Отменить ответ"
        >
          <X className="h-3 w-3 text-gray-500" />
        </button>
      )}
      
      {/* Иконка ответа */}
      <div className="flex items-start gap-2">
        <Reply className={cn(
          "text-blue-400 flex-shrink-0 mt-0.5",
          isPreview ? "h-4 w-4" : "h-3 w-3"
        )} />
        
        <div className="flex-1 min-w-0">
          {/* Имя отправителя */}
          <div className={cn(
            "font-medium text-blue-600 dark:text-blue-400",
            isPreview ? "text-sm" : "text-xs"
          )}>
            {replyToMessage.sender.firstName} {replyToMessage.sender.lastName}
          </div>
          
          {/* Текст сообщения */}
          <div className={cn(
            "text-gray-600 dark:text-gray-300 break-words",
            isPreview ? "text-sm mt-1" : "text-xs"
          )}>
            {getDisplayText()}
          </div>
        </div>
      </div>
    </div>
  );
}

// Компонент для превью ответа в форме отправки сообщения
export function MessageReplyPreview({ 
  replyToMessage, 
  onClose, 
  className 
}: { 
  replyToMessage: MessageWithSender; 
  onClose: () => void; 
  className?: string; 
}) {
  return (
    <MessageReply
      replyToMessage={replyToMessage}
      variant="preview"
      showCloseButton={true}
      onClose={onClose}
      className={className}
    />
  );
}

// Компонент для отображения ответа внутри сообщения
export function MessageReplyInline({ 
  replyToMessage, 
  className 
}: { 
  replyToMessage: MessageWithSender; 
  className?: string; 
}) {
  return (
    <MessageReply
      replyToMessage={replyToMessage}
      variant="inline"
      className={className}
    />
  );
}
