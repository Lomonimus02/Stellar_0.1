import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  value?: string | null;
  onChange: (url: string | null, tempAvatarId?: string) => void;
  fallback?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

export function AvatarUpload({
  value,
  onChange,
  fallback = "?",
  className,
  size = "md",
  disabled = false
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [tempAvatarId, setTempAvatarId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-16 w-16",
    lg: "h-24 w-24"
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите изображение",
        variant: "destructive",
      });
      return;
    }

    // Проверяем размер файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Ошибка",
        description: "Размер файла не должен превышать 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      console.log('Starting file upload:', file.name, file.type, file.size);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/chat', {
        method: 'POST',
        body: formData,
      });

      console.log('Upload response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed with status:', response.status, 'Error:', errorText);
        throw new Error(`Ошибка загрузки файла: ${response.status}`);
      }

      const data = await response.json();
      console.log('Upload response data:', data);

      if (!data.fileUrl || !data.tempAvatarId) {
        console.error('Missing fileUrl or tempAvatarId in response:', data);
        throw new Error('Сервер не вернул необходимые данные');
      }

      // Сохраняем ID временной аватарки
      setTempAvatarId(data.tempAvatarId);

      // Передаем URL и ID временной аватарки
      onChange(data.fileUrl, data.tempAvatarId);

      toast({
        title: "Успешно",
        description: "Аватарка загружена",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось загрузить изображение",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Очищаем input для возможности повторной загрузки того же файла
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setTempAvatarId(null);
    onChange(null);
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <Avatar className={cn(sizeClasses[size], "cursor-pointer border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors")}>
        {value ? (
          <AvatarImage src={value} alt="Avatar" />
        ) : (
          <AvatarFallback className="bg-gray-100 text-gray-500">
            {fallback}
          </AvatarFallback>
        )}
      </Avatar>

      {/* Кнопка загрузки/изменения */}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0 shadow-md"
        onClick={handleClick}
        disabled={disabled || isUploading}
      >
        {isUploading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </Button>

      {/* Кнопка удаления (показывается только если есть изображение) */}
      {value && !disabled && (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 shadow-md"
          onClick={handleRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      {/* Скрытый input для выбора файла */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
