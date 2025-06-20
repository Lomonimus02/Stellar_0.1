// Миграция для добавления поля schedule_id в таблицу attendance
import postgres from 'postgres';
import 'dotenv/config';

async function addAttendanceScheduleIdColumn() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL не найден в переменных окружения!');
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    console.log('Проверяем наличие колонки schedule_id в таблице attendance...');
    const checkColumnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attendance' AND column_name = 'schedule_id'
    `;
    
    if (checkColumnExists.length === 0) {
      console.log('Колонка schedule_id не найдена, добавляем...');
      await sql`
        ALTER TABLE attendance 
        ADD COLUMN schedule_id INTEGER NOT NULL DEFAULT 0
      `;
      
      // Удаляем ограничение NOT NULL DEFAULT 0 после создания
      await sql`
        ALTER TABLE attendance 
        ALTER COLUMN schedule_id DROP DEFAULT
      `;
      
      console.log('Колонка schedule_id успешно добавлена в таблицу attendance');
    } else {
      console.log('Колонка schedule_id уже существует в таблице attendance');
    }
  } catch (error) {
    console.error('Ошибка при добавлении колонки schedule_id:', error);
    throw error;
  } finally {
    await sql.end();
    console.log('Соединение с базой данных закрыто');
  }
}

console.log('Запуск миграции для добавления поля schedule_id в таблицу attendance...');
addAttendanceScheduleIdColumn()
  .then(() => {
    console.log('Миграция успешно выполнена');
  })
  .catch((error) => {
    console.error('Ошибка при выполнении миграции:', error);
    process.exit(1);
  });