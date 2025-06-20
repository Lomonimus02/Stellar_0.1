// Скрипт для выполнения миграций через spawn
const { spawn } = require('child_process');

console.log('Запуск миграции для добавления колонок шифрования...');

// Выполняем миграции через tsx для поддержки TypeScript
const migrate = spawn('npx', ['tsx', 'migrations-encrypt.js'], {
  stdio: 'inherit',
  shell: true
});

migrate.on('close', (code) => {
  if (code === 0) {
    console.log('Миграции успешно выполнены');
  } else {
    console.error(`Миграции завершились с ошибкой, код: ${code}`);
  }
});