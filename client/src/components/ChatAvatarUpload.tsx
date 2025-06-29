import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Upload, X, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatAvatarUploadProps {
  chatId: number;
  chatName: string;
  hasAvatar: boolean;
  isGroupChat: boolean;
  onAvatarUpdate: (hasAvatar: boolean) => void;
  className?: string;
}

export function ChatAvatarUpload({
  chatId,
  chatName,
  hasAvatar,
  isGroupChat,
  onAvatarUpdate,
  className = "h-20 w-20"
}: ChatAvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now()); // Для принудительного обновления
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите файл изображения",
        variant: "destructive"
      });
      return;
    }

    // Проверяем размер файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Ошибка",
        description: "Размер файла не должен превышать 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`/api/chats/${chatId}/avatar`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка загрузки аватарки');
      }

      // Обновляем ключ для принудительного обновления изображения
      setAvatarKey(Date.now());
      onAvatarUpdate(true);
      toast({
        title: "Успех",
        description: "Аватарка успешно загружена!"
      });
    } catch (error) {
      console.error('Ошибка загрузки аватарки:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : 'Ошибка загрузки аватарки',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Очищаем input для возможности повторной загрузки того же файла
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAvatar = async () => {
    setIsUploading(true);

    try {
      const response = await fetch(`/api/chats/${chatId}/avatar`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка удаления аватарки');
      }

      setAvatarKey(Date.now());
      onAvatarUpdate(false);
      toast({
        title: "Успех",
        description: "Аватарка удалена"
      });
    } catch (error) {
      console.error('Ошибка удаления аватарки:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : 'Ошибка удаления аватарки',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative group">
      <Avatar className={className}>
        <AvatarImage
          src={hasAvatar ? `/api/chats/${chatId}/avatar?t=${avatarKey}` : undefined}
          alt={chatName}
          onError={() => {
            console.error('Ошибка загрузки аватарки для чата', chatId);
          }}
          onLoad={() => {
            console.log('Аватарка успешно загружена для чата', chatId);
          }}
        />
        <AvatarFallback className="bg-gray-200">
          {isGroupChat ? (
            <Users className="h-8 w-8 text-gray-500" />
          ) : (
            <span className="text-lg font-medium text-gray-700">
              {chatName.charAt(0).toUpperCase()}
            </span>
          )}
        </AvatarFallback>
      </Avatar>

      {/* Overlay с кнопками при наведении */}
      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0 rounded-full"
            onClick={triggerFileSelect}
            disabled={isUploading}
          >
            {isUploading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </Button>
          
          {hasAvatar && (
            <Button
              size="sm"
              variant="destructive"
              className="h-8 w-8 p-0 rounded-full"
              onClick={handleDeleteAvatar}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Скрытый input для выбора файла */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
