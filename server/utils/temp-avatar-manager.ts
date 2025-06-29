import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import path from 'path';

// Интерфейс для временной аватарки
export interface TempAvatar {
  id: string;
  userId: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  dataUrl: string;
  createdAt: Date;
  expiresAt: Date;
}

// Хранилище временных аватарок в памяти
const tempAvatars = new Map<string, TempAvatar>();

// Директория для временных аватарок
const TEMP_AVATARS_DIR = path.join(process.cwd(), 'uploads', 'temp-avatars');

// Время жизни временной аватарки (3 минуты)
const TEMP_AVATAR_LIFETIME = 3 * 60 * 1000; // 3 минуты в миллисекундах

// Инициализация директории для временных аватарок
export async function initTempAvatarManager(): Promise<void> {
  try {
    await fs.mkdir(TEMP_AVATARS_DIR, { recursive: true });
    console.log('Temp avatars directory initialized:', TEMP_AVATARS_DIR);
    
    // Запускаем очистку старых файлов
    startCleanupTimer();
  } catch (error) {
    console.error('Error initializing temp avatars directory:', error);
    throw error;
  }
}

// Генерация уникального ID для временной аватарки
function generateTempAvatarId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Сохранение временной аватарки
export async function saveTempAvatar(
  userId: number,
  file: Express.Multer.File
): Promise<TempAvatar> {
  try {
    const tempId = generateTempAvatarId();
    const fileExtension = path.extname(file.originalname);
    const tempFileName = `${tempId}${fileExtension}`;
    const tempFilePath = path.join(TEMP_AVATARS_DIR, tempFileName);
    
    // Читаем файл и создаем data URL
    const imageData = fsSync.readFileSync(file.path, { encoding: 'base64' });
    const dataUrl = `data:${file.mimetype};base64,${imageData}`;
    
    // Копируем файл в директорию временных аватарок
    await fs.copyFile(file.path, tempFilePath);
    
    // Удаляем оригинальный временный файл
    fsSync.unlinkSync(file.path);
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TEMP_AVATAR_LIFETIME);
    
    const tempAvatar: TempAvatar = {
      id: tempId,
      userId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      filePath: tempFilePath,
      dataUrl,
      createdAt: now,
      expiresAt
    };
    
    // Сохраняем в памяти
    tempAvatars.set(tempId, tempAvatar);
    
    console.log(`Temp avatar saved: ${tempId} for user ${userId}, expires at ${expiresAt}`);
    
    return tempAvatar;
  } catch (error) {
    console.error('Error saving temp avatar:', error);
    throw error;
  }
}

// Получение временной аватарки по ID
export function getTempAvatar(tempId: string): TempAvatar | undefined {
  const tempAvatar = tempAvatars.get(tempId);
  
  if (!tempAvatar) {
    return undefined;
  }
  
  // Проверяем, не истекла ли аватарка
  if (new Date() > tempAvatar.expiresAt) {
    // Удаляем истекшую аватарку
    deleteTempAvatar(tempId);
    return undefined;
  }
  
  return tempAvatar;
}

// Получение всех временных аватарок пользователя
export function getUserTempAvatars(userId: number): TempAvatar[] {
  const userAvatars: TempAvatar[] = [];
  
  for (const [id, avatar] of tempAvatars.entries()) {
    if (avatar.userId === userId) {
      // Проверяем, не истекла ли аватарка
      if (new Date() > avatar.expiresAt) {
        deleteTempAvatar(id);
      } else {
        userAvatars.push(avatar);
      }
    }
  }
  
  return userAvatars;
}

// Удаление временной аватарки
export async function deleteTempAvatar(tempId: string): Promise<boolean> {
  try {
    const tempAvatar = tempAvatars.get(tempId);
    
    if (!tempAvatar) {
      return false;
    }
    
    // Удаляем файл
    try {
      await fs.unlink(tempAvatar.filePath);
    } catch (error) {
      console.warn(`Failed to delete temp avatar file: ${tempAvatar.filePath}`, error);
    }
    
    // Удаляем из памяти
    tempAvatars.delete(tempId);
    
    console.log(`Temp avatar deleted: ${tempId}`);
    return true;
  } catch (error) {
    console.error('Error deleting temp avatar:', error);
    return false;
  }
}

// Перемещение временной аватарки в постоянное хранилище
export async function promoteTempAvatar(tempId: string): Promise<{
  fileName: string;
  mimeType: string;
  fileSize: number;
  imageData: string;
} | null> {
  try {
    const tempAvatar = getTempAvatar(tempId);
    
    if (!tempAvatar) {
      console.log(`Temp avatar not found: ${tempId}`);
      return null;
    }
    
    // Читаем данные файла
    const imageData = await fs.readFile(tempAvatar.filePath, { encoding: 'base64' });
    
    const result = {
      fileName: tempAvatar.fileName,
      mimeType: tempAvatar.mimeType,
      fileSize: tempAvatar.fileSize,
      imageData
    };
    
    // Удаляем временную аватарку
    await deleteTempAvatar(tempId);
    
    console.log(`Temp avatar promoted: ${tempId}`);
    return result;
  } catch (error) {
    console.error('Error promoting temp avatar:', error);
    return null;
  }
}

// Очистка истекших временных аватарок
export async function cleanupExpiredTempAvatars(): Promise<number> {
  let cleanedCount = 0;
  const now = new Date();
  
  for (const [id, avatar] of tempAvatars.entries()) {
    if (now > avatar.expiresAt) {
      await deleteTempAvatar(id);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} expired temp avatars`);
  }
  
  return cleanedCount;
}

// Запуск таймера очистки
function startCleanupTimer(): void {
  // Очистка каждую минуту
  setInterval(async () => {
    try {
      await cleanupExpiredTempAvatars();
    } catch (error) {
      console.error('Error during temp avatars cleanup:', error);
    }
  }, 60 * 1000); // 1 минута
  
  console.log('Temp avatars cleanup timer started');
}

// Получение статистики временных аватарок
export function getTempAvatarStats(): {
  total: number;
  expired: number;
  active: number;
} {
  const now = new Date();
  let expired = 0;
  let active = 0;
  
  for (const avatar of tempAvatars.values()) {
    if (now > avatar.expiresAt) {
      expired++;
    } else {
      active++;
    }
  }
  
  return {
    total: tempAvatars.size,
    expired,
    active
  };
}
