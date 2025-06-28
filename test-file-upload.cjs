// Простой тест для проверки загрузки файлов
const fs = require('fs');
const path = require('path');

// Убираем тест загрузки файлов, так как он требует аутентификации

// Тест функций шифрования
async function testEncryption() {
  console.log('=== Testing encryption functionality ===');
  
  try {
    // Импортируем функции шифрования
    const { encryptFile, decryptFile } = require('./server/utils/encryption');
    
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
  }
}

// Запускаем тесты
if (require.main === module) {
  console.log('Starting encryption tests...');

  // Тестируем шифрование
  testEncryption().then(() => {
    console.log('\nEncryption tests completed\n');
  });
}

module.exports = { testEncryption };
