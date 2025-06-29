// Простой тест для проверки миграции
console.log('Тестирование миграции...');

// Проверяем, что файлы существуют
const fs = require('fs');
const path = require('path');

try {
  // Проверяем наличие файла миграции
  const migrationPath = path.join(__dirname, 'migrations', 'add_reply_to_message_id.sql');
  if (fs.existsSync(migrationPath)) {
    console.log('✅ Файл миграции найден:', migrationPath);
    const content = fs.readFileSync(migrationPath, 'utf8');
    console.log('Содержимое миграции:');
    console.log(content);
  } else {
    console.log('❌ Файл миграции не найден:', migrationPath);
  }

  // Проверяем наличие скрипта миграции
  const scriptPath = path.join(__dirname, 'run-reply-migration.js');
  if (fs.existsSync(scriptPath)) {
    console.log('✅ Скрипт миграции найден:', scriptPath);
  } else {
    console.log('❌ Скрипт миграции не найден:', scriptPath);
  }

  // Проверяем package.json
  const packagePath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packagePath)) {
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    if (packageJson.scripts && packageJson.scripts['migrate:replies']) {
      console.log('✅ Скрипт migrate:replies найден в package.json');
    } else {
      console.log('❌ Скрипт migrate:replies не найден в package.json');
    }
  }

  console.log('Тест завершен');
} catch (error) {
  console.error('Ошибка при тестировании:', error);
}
