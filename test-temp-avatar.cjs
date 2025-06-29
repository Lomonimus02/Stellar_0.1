// Простой тест для проверки API временных аватарок
const fs = require('fs');
const path = require('path');

// Создаем тестовое изображение
const testImagePath = path.join(__dirname, 'test-avatar.jpg');
const testImageData = Buffer.from('fake-image-data-for-testing');
fs.writeFileSync(testImagePath, testImageData);

console.log('Тестовое изображение создано:', testImagePath);

// Функция для тестирования загрузки аватарки
async function testAvatarUpload() {
  try {
    const FormData = require('form-data');
    const fetch = require('node-fetch');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(testImagePath), {
      filename: 'test-avatar.jpg',
      contentType: 'image/jpeg'
    });

    console.log('Отправляем запрос на загрузку аватарки...');
    
    const response = await fetch('https://localhost:5443/api/upload/chat', {
      method: 'POST',
      body: form,
      headers: {
        'Cookie': 'session=your-session-cookie-here' // Нужно заменить на реальную сессию
      },
      // Игнорируем SSL ошибки для тестирования
      agent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });

    console.log('Статус ответа:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Успешный ответ:', {
        success: data.success,
        tempAvatarId: data.tempAvatarId,
        fileName: data.fileName,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        dataUrlLength: data.fileUrl ? data.fileUrl.length : 0,
        expiresAt: data.expiresAt
      });
    } else {
      const errorText = await response.text();
      console.log('Ошибка:', errorText);
    }
  } catch (error) {
    console.error('Ошибка при тестировании:', error.message);
  } finally {
    // Удаляем тестовый файл
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log('Тестовый файл удален');
    }
  }
}

// Функция для тестирования создания чата с временной аватаркой
async function testChatCreation(tempAvatarId) {
  try {
    const fetch = require('node-fetch');
    
    const chatData = {
      name: 'Тестовая группа',
      type: 'group',
      participantIds: [1, 2, 3], // Замените на реальные ID пользователей
      tempAvatarId: tempAvatarId
    };

    console.log('Создаем чат с временной аватаркой:', tempAvatarId);
    
    const response = await fetch('https://localhost:5443/api/chats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=your-session-cookie-here' // Нужно заменить на реальную сессию
      },
      body: JSON.stringify(chatData),
      // Игнорируем SSL ошибки для тестирования
      agent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });

    console.log('Статус создания чата:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Чат создан успешно:', {
        id: data.id,
        name: data.name,
        type: data.type,
        hasAvatar: data.hasAvatar
      });
    } else {
      const errorText = await response.text();
      console.log('Ошибка создания чата:', errorText);
    }
  } catch (error) {
    console.error('Ошибка при создании чата:', error.message);
  }
}

// Функция для проверки статистики временных аватарок
function checkTempAvatarStats() {
  try {
    // Импортируем функцию статистики
    const { getTempAvatarStats } = require('./server/utils/temp-avatar-manager');
    
    const stats = getTempAvatarStats();
    console.log('Статистика временных аватарок:', stats);
  } catch (error) {
    console.error('Ошибка при получении статистики:', error.message);
  }
}

// Запускаем тесты
console.log('=== Тестирование системы временных аватарок ===');

// Проверяем статистику
checkTempAvatarStats();

// Для полного тестирования нужна аутентификация
console.log('\nДля полного тестирования API нужно:');
console.log('1. Войти в систему через браузер');
console.log('2. Скопировать session cookie из браузера');
console.log('3. Заменить "your-session-cookie-here" на реальное значение');
console.log('4. Запустить: node test-temp-avatar.js');

// Если есть аргументы командной строки, пытаемся запустить тесты
if (process.argv.includes('--run-tests')) {
  console.log('\nЗапуск тестов API...');
  testAvatarUpload().then(() => {
    console.log('Тестирование завершено');
  });
}
