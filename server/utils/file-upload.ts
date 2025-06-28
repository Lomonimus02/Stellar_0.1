import * as path from 'path';
import * as fs from 'fs/promises'; // Используем промисы для асинхронных операций
import { existsSync, mkdirSync } from 'fs'; // Для синхронных операций
import multer from 'multer';
import { Request } from 'express';
import type { FileFilterCallback } from 'multer';
import { encryptFile, decryptFile } from './encryption';

// Создаем директории для загрузок
const uploadDir = path.join(process.cwd(), 'uploads');
const encryptedDir = path.join(uploadDir, 'encrypted');
const tempDir = path.join(uploadDir, 'temp');

// Создаем директории, если они не существуют
console.log('Initializing upload directories...');
console.log('Upload dir:', uploadDir);
console.log('Encrypted dir:', encryptedDir);
console.log('Temp dir:', tempDir);

if (!existsSync(uploadDir)) {
  console.log('Creating upload directory...');
  mkdirSync(uploadDir, { recursive: true });
  console.log('Upload directory created');
} else {
  console.log('Upload directory already exists');
}

if (!existsSync(encryptedDir)) {
  console.log('Creating encrypted directory...');
  mkdirSync(encryptedDir, { recursive: true });
  console.log('Encrypted directory created');
} else {
  console.log('Encrypted directory already exists');
}

if (!existsSync(tempDir)) {
  console.log('Creating temp directory...');
  mkdirSync(tempDir, { recursive: true });
  console.log('Temp directory created');
} else {
  console.log('Temp directory already exists');
}

// Настройка хранилища
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Все файлы изначально сохраняются в uploads/temp
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Получаем расширение файла из оригинального имени
    const fileExt = path.extname(file.originalname);
    // Создаем уникальное имя файла с текущей временной меткой
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;
    cb(null, fileName);
  }
});

// Функция для определения типа файла
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  // Разрешенные типы файлов
  const allowedFileTypes = [
    // Изображения
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Документы
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    // Видео
    'video/mp4', 'video/webm', 'video/ogg',
    // Аудио
    'audio/mpeg', 'audio/ogg', 'audio/wav'
  ];
  
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Неподдерживаемый тип файла'));
  }
};

// Создаем middleware для загрузки
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  }
});

// Функция для определения типа файла на основе MIME
export function getFileType(mimetype: string): 'image' | 'video' | 'document' {
  if (mimetype.startsWith('image/')) {
    return 'image';
  } else if (mimetype.startsWith('video/')) {
    return 'video';
  } else {
    return 'document';
  }
}

// Функция для получения URL файла
export function getFileUrl(filename: string, isEncrypted: boolean = false): string {
  // Используем относительные URL, так как они работают лучше с прокси и разными окружениями
  // Если файл зашифрован, он находится в подпапке encrypted
  if (isEncrypted) {
    return `/uploads/encrypted/${filename}`;
  }
  return `/uploads/${filename}`;
}

// Функция для перемещения загруженного файла из временной директории в постоянную
// с опциональным шифрованием
export async function moveUploadedFile(
  tempFilePath: string,
  encrypt: boolean = false
): Promise<{ filename: string, isEncrypted: boolean }> {
  console.log('=== moveUploadedFile started ===');
  console.log('Temp file path:', tempFilePath);
  console.log('Encrypt:', encrypt);

  try {
    // Проверяем, существует ли временный файл
    try {
      await fs.access(tempFilePath);
      console.log('Temp file exists');
    } catch (accessError) {
      console.error('Temp file does not exist:', tempFilePath);
      throw new Error(`Temp file not found: ${tempFilePath}`);
    }

    const filename = path.basename(tempFilePath);
    console.log('Extracted filename:', filename);

    if (encrypt) {
      console.log('Encrypting file...');
      // Если шифрование включено, сохраняем зашифрованный файл в директорию encrypted
      const encryptedFilePath = path.join(encryptedDir, filename);
      console.log('Encrypted file path:', encryptedFilePath);

      // Проверяем, существует ли директория для зашифрованных файлов
      try {
        await fs.access(encryptedDir);
        console.log('Encrypted directory exists');
      } catch (dirError) {
        console.log('Creating encrypted directory...');
        await fs.mkdir(encryptedDir, { recursive: true });
      }

      await encryptFile(tempFilePath, encryptedFilePath);
      console.log('File encrypted successfully');

      // Удаляем временный файл
      await fs.unlink(tempFilePath);
      console.log('Temp file deleted');

      return {
        filename,
        isEncrypted: true
      };
    } else {
      console.log('Moving file without encryption...');
      // Просто перемещаем файл из временной директории в основную
      const finalFilePath = path.join(uploadDir, filename);
      console.log('Final file path:', finalFilePath);

      await fs.rename(tempFilePath, finalFilePath);
      console.log('File moved successfully');

      return {
        filename,
        isEncrypted: false
      };
    }
  } catch (error) {
    console.error('=== Error in moveUploadedFile ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);

    // Пытаемся очистить временный файл в случае ошибки
    try {
      await fs.access(tempFilePath);
      await fs.unlink(tempFilePath);
      console.log('Cleaned up temp file after error');
    } catch (cleanupError) {
      console.error('Failed to cleanup temp file:', cleanupError);
    }

    throw new Error(`Failed to process uploaded file: ${error.message}`);
  }
}

// Функция для обработки скачивания файла (с расшифровкой при необходимости)
export async function prepareFileForDownload(
  filename: string, 
  isEncrypted: boolean = false
): Promise<{ filePath: string, deleteAfter: boolean }> {
  if (isEncrypted) {
    // Для зашифрованных файлов создаем временную расшифрованную копию
    const encryptedFilePath = path.join(encryptedDir, filename);
    const tempDecryptedFilePath = path.join(tempDir, `decrypted-${filename}`);
    
    await decryptFile(encryptedFilePath, tempDecryptedFilePath);
    
    return {
      filePath: tempDecryptedFilePath,
      deleteAfter: true // Отметка о том, что после скачивания файл нужно удалить
    };
  } else {
    // Для незашифрованных файлов просто возвращаем путь
    return {
      filePath: path.join(uploadDir, filename),
      deleteAfter: false
    };
  }
}