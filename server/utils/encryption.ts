import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Константы для шифрования
const ENCRYPTION_KEY_PATH = path.join(process.cwd(), '.encryption_key');
const ENCRYPTION_IV_PATH = path.join(process.cwd(), '.encryption_iv');
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

// Для E2E шифрования сообщений
const RSA_KEY_SIZE = 2048;
const RSA_PUBLIC_KEY_PATH = path.join(process.cwd(), '.rsa_public_key');
const RSA_PRIVATE_KEY_PATH = path.join(process.cwd(), '.rsa_private_key');

// Используем секретный ключ из переменных окружения или генерируем новый
let encryptionKey: Buffer;
let encryptionIv: Buffer;

/**
 * Инициализирует систему шифрования, создавая или загружая необходимые ключи
 */
export async function initializeEncryption() {
  try {
    // Попытка загрузить существующие ключи
    try {
      encryptionKey = await fs.readFile(ENCRYPTION_KEY_PATH);
      encryptionIv = await fs.readFile(ENCRYPTION_IV_PATH);
      console.log('Encryption keys loaded successfully');
    } catch (error) {
      // Если ключи не существуют, создаем новые
      console.log('Generating new encryption keys...');
      
      // Создаем ключ и вектор инициализации
      encryptionKey = crypto.randomBytes(32); // 256 бит для AES-256
      encryptionIv = crypto.randomBytes(16); // 128 бит для AES
      
      // Сохраняем ключи в файлы
      await fs.writeFile(ENCRYPTION_KEY_PATH, encryptionKey);
      await fs.writeFile(ENCRYPTION_IV_PATH, encryptionIv);
      
      console.log('Encryption keys generated and saved');
    }
    
    // Проверяем существование RSA ключей
    await ensureRSAKeysExist();
    
    return true;
  } catch (error) {
    console.error('Failed to initialize encryption:', error);
    return false;
  }
}

/**
 * Создает пару RSA ключей, если они еще не существуют
 */
async function ensureRSAKeysExist() {
  try {
    // Проверяем, существуют ли ключи
    try {
      await fs.access(RSA_PUBLIC_KEY_PATH);
      await fs.access(RSA_PRIVATE_KEY_PATH);
      console.log('RSA keys already exist');
      return;
    } catch (error) {
      // Ключи не существуют, генерируем новые
      console.log('Generating new RSA key pair...');
      
      // Генерируем пару ключей RSA
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: RSA_KEY_SIZE,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });
      
      // Сохраняем ключи в файлы
      await fs.writeFile(RSA_PUBLIC_KEY_PATH, publicKey);
      await fs.writeFile(RSA_PRIVATE_KEY_PATH, privateKey);
      
      console.log('RSA keys generated and saved');
    }
  } catch (error) {
    console.error('Failed to ensure RSA keys:', error);
    throw error;
  }
}

/**
 * Шифрует данные с использованием симметричного алгоритма AES
 * @param text Текст для шифрования
 * @returns Зашифрованный текст в формате hex
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  try {
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, encryptionKey, encryptionIv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Расшифровывает данные, зашифрованные с помощью функции encrypt
 * @param encryptedText Зашифрованный текст в формате hex
 * @returns Расшифрованный текст
 */
/**
 * Определяет, является ли строка зашифрованной с помощью нашего алгоритма
 * @param text Текст для проверки
 * @returns true, если текст зашифрован
 */
function isEncrypted(text: string): boolean {
  // Зашифрованный текст должен быть hex-строкой
  return /^[0-9a-f]+$/i.test(text);
}

/**
 * Расшифровывает данные, зашифрованные с помощью функции encrypt
 * @param encryptedText Зашифрованный текст в формате hex
 * @returns Расшифрованный текст или исходный текст, если расшифровка не удалась
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  
  // Если текст не похож на зашифрованный, возвращаем как есть
  if (!isEncrypted(encryptedText)) {
    return encryptedText;
  }
  
  try {
    // Проверяем длину текста, чтобы избежать ошибок при расшифровке
    if (encryptedText.length % 2 !== 0) {
      console.warn('Decryption warning: Encrypted text length is not even, might not be a valid hex string');
      return encryptedText;
    }
    
    // Дополнительная проверка на содержимое строки
    if (!/^[0-9a-f]+$/i.test(encryptedText)) {
      console.warn('Decryption warning: Text contains non-hex characters');
      return encryptedText;
    }
    
    // Попытка расшифровать текст
    try {
      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, encryptionKey, encryptionIv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      
      try {
        decrypted += decipher.final('utf8');
        
        // Проверяем результат на валидность UTF-8
        if (decrypted.includes('\uFFFD')) {
          console.warn('Decryption warning: Result contains invalid UTF-8 characters, returning original');
          return encryptedText;
        }
        
        return decrypted;
      } catch (finalError: any) {
        console.warn(`Decryption final error: ${finalError.message || 'Unknown error'}`);
        return encryptedText;
      }
    } catch (cryptoError: any) {
      console.warn(`Crypto decryption error: ${cryptoError.message || 'Unknown error'}, code: ${cryptoError.code || 'none'}`);
      // Возвращаем исходный текст при ошибке
      return encryptedText;
    }
  } catch (error: any) {
    console.error(`Decryption error: ${error.message || 'Unknown error'}`);
    // Возвращаем исходный текст вместо выбрасывания исключения
    return encryptedText;
  }
}

/**
 * Шифрует файл с использованием симметричного алгоритма AES
 * @param sourceFilePath Путь к исходному файлу
 * @param destinationFilePath Путь для сохранения зашифрованного файла
 */
export async function encryptFile(sourceFilePath: string, destinationFilePath: string): Promise<void> {
  try {
    const fileData = await fs.readFile(sourceFilePath);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, encryptionKey, encryptionIv);
    const encryptedData = Buffer.concat([cipher.update(fileData), cipher.final()]);
    
    await fs.writeFile(destinationFilePath, encryptedData);
  } catch (error: any) {
    console.error(`File encryption error: ${error.message || 'Unknown error'}`);
    throw new Error('Failed to encrypt file');
  }
}

/**
 * Расшифровывает файл, зашифрованный с помощью функции encryptFile
 * @param sourceFilePath Путь к зашифрованному файлу
 * @param destinationFilePath Путь для сохранения расшифрованного файла
 */
export async function decryptFile(sourceFilePath: string, destinationFilePath: string): Promise<void> {
  try {
    // Проверяем существование исходного файла
    try {
      await fs.access(sourceFilePath);
    } catch (accessError) {
      console.error(`Source file not found: ${sourceFilePath}`);
      throw new Error(`Source file not found: ${sourceFilePath}`);
    }
    
    // Читаем зашифрованные данные
    const encryptedData = await fs.readFile(sourceFilePath);
    
    // Проверяем размер файла
    if (encryptedData.length === 0) {
      console.error('File decryption error: Empty file');
      throw new Error('Failed to decrypt file: Empty file');
    }
    
    // Создаем расшифровщик и пробуем расшифровать данные
    try {
      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, encryptionKey, encryptionIv);
      let decryptedData;
      
      try {
        // Расшифровываем данные
        const updatedData = decipher.update(encryptedData);
        const finalData = decipher.final();
        decryptedData = Buffer.concat([updatedData, finalData]);
        
        // Записываем расшифрованные данные в файл
        await fs.writeFile(destinationFilePath, decryptedData);
      } catch (decipherError: any) {
        console.error(`File decryption error during final: ${decipherError.message || 'Unknown error'}`);
        
        // Если файл не может быть расшифрован (возможно не зашифрован),
        // просто копируем исходный файл
        console.warn('Copying original file instead of decryption due to error');
        await fs.copyFile(sourceFilePath, destinationFilePath);
      }
    } catch (cryptoError: any) {
      console.error(`Crypto error during file decryption: ${cryptoError.message || 'Unknown error'}`);
      
      // Если криптографическая операция не удалась, копируем исходный файл
      console.warn('Copying original file instead of decryption due to crypto error');
      await fs.copyFile(sourceFilePath, destinationFilePath);
    }
  } catch (error: any) {
    console.error(`File decryption error: ${error.message || 'Unknown error'}`);
    throw new Error(`Failed to decrypt file: ${error.message || 'Unknown error'}`);
  }
}

// Функции для E2E шифрования сообщений
// Шифрует сообщение с помощью публичного ключа получателя
export async function encryptMessage(message: string, recipientPublicKey: string): Promise<string> {
  try {
    const encryptedData = crypto.publicEncrypt(
      {
        key: recipientPublicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      Buffer.from(message, 'utf8')
    );
    
    return encryptedData.toString('base64');
  } catch (error: any) {
    console.error(`Message encryption error: ${error.message || 'Unknown error'}`);
    throw new Error('Failed to encrypt message');
  }
}

// Расшифровывает сообщение с помощью приватного ключа получателя
export async function decryptMessage(encryptedMessage: string): Promise<string> {
  try {
    const privateKey = await fs.readFile(RSA_PRIVATE_KEY_PATH, 'utf8');
    const decryptedData = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      Buffer.from(encryptedMessage, 'base64')
    );
    
    return decryptedData.toString('utf8');
  } catch (error: any) {
    console.error(`Message decryption error: ${error.message || 'Unknown error'}`);
    throw new Error(`Failed to decrypt message: ${error.message || 'Unknown error'}`);
  }
}

// Получение публичного ключа сервера
export async function getServerPublicKey(): Promise<string> {
  try {
    return await fs.readFile(RSA_PUBLIC_KEY_PATH, 'utf8');
  } catch (error: any) {
    console.error(`Failed to get server public key: ${error.message || 'Unknown error'}`);
    throw new Error('Failed to get server public key');
  }
}

// Генерация пары ключей для пользователя
export function generateUserKeyPair(): { publicKey: string, privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: RSA_KEY_SIZE,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  return {
    publicKey,
    privateKey
  };
}