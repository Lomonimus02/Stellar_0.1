// Тест функций шифрования
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testEncryption() {
  console.log('=== Testing encryption functionality ===');
  
  try {
    // Импортируем функции шифрования
    const { encryptFile, decryptFile, initializeEncryption } = await import('./server/utils/encryption.ts');
    
    // Инициализируем шифрование
    console.log('Initializing encryption...');
    await initializeEncryption();
    console.log('Encryption initialized');
    
    // Создаем тестовый файл
    const testFilePath = path.join(__dirname, 'test-encrypt.txt');
    const encryptedFilePath = path.join(__dirname, 'test-encrypt.enc');
    const decryptedFilePath = path.join(__dirname, 'test-decrypt.txt');
    
    const testContent = 'This is a test file for encryption testing';
    fs.writeFileSync(testFilePath, testContent);
    
    console.log('Original file created');
    
    // Тестируем шифрование
    await encryptFile(testFilePath, encryptedFilePath);
    console.log('File encrypted successfully');
    
    // Проверяем, что зашифрованный файл создан
    if (fs.existsSync(encryptedFilePath)) {
      console.log('Encrypted file exists');
      const encryptedSize = fs.statSync(encryptedFilePath).size;
      console.log('Encrypted file size:', encryptedSize, 'bytes');
    } else {
      throw new Error('Encrypted file was not created');
    }
    
    // Тестируем расшифровку
    await decryptFile(encryptedFilePath, decryptedFilePath);
    console.log('File decrypted successfully');
    
    // Проверяем содержимое расшифрованного файла
    if (fs.existsSync(decryptedFilePath)) {
      const decryptedContent = fs.readFileSync(decryptedFilePath, 'utf8');
      console.log('Decrypted content:', decryptedContent);
      
      if (decryptedContent === testContent) {
        console.log('✅ Encryption/Decryption test PASSED');
      } else {
        console.log('❌ Encryption/Decryption test FAILED - content mismatch');
        console.log('Expected:', testContent);
        console.log('Got:', decryptedContent);
      }
    } else {
      throw new Error('Decrypted file was not created');
    }
    
    // Очистка
    [testFilePath, encryptedFilePath, decryptedFilePath].forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
    
    console.log('Test files cleaned up');
    
  } catch (error) {
    console.error('Encryption test error:', error);
    console.error('Error stack:', error.stack);
  }
}

// Запускаем тест
testEncryption().then(() => {
  console.log('Encryption tests completed');
});
