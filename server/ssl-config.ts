import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// Определяем директорию текущего модуля
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к SSL-сертификатам
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || path.join(process.cwd(), 'ssl', 'cert.pem');
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || path.join(process.cwd(), 'ssl', 'key.pem');

/**
 * Проверяет наличие SSL-сертификатов
 * @returns {Promise<boolean>} true, если сертификаты доступны
 */
export async function checkSSLCertificates(): Promise<boolean> {
  try {
    await Promise.all([
      fs.access(SSL_CERT_PATH),
      fs.access(SSL_KEY_PATH)
    ]);
    console.log('SSL certificates found successfully');
    return true;
  } catch (error: any) {
    console.error(`SSL certificates not found or not accessible: ${error.message}`);
    return false;
  }
}

/**
 * Загружает SSL-сертификаты
 * @returns {Promise<{key: Buffer, cert: Buffer} | null>} SSL-сертификаты или null, если произошла ошибка
 */
export async function loadSSLCertificates(): Promise<{key: Buffer, cert: Buffer} | null> {
  try {
    const [key, cert] = await Promise.all([
      fs.readFile(SSL_KEY_PATH),
      fs.readFile(SSL_CERT_PATH)
    ]);
    return { key, cert };
  } catch (error: any) {
    console.error(`Error loading SSL certificates: ${error.message}`);
    return null;
  }
}

export { SSL_CERT_PATH, SSL_KEY_PATH };