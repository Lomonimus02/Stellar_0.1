import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Подключение к базе данных
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL не установлен');
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql);

async function runMigration() {
  try {
    console.log('Запуск миграции для добавления уникального ограничения на student_id...');
    
    // Читаем файл миграции
    const migrationPath = path.join(__dirname, 'migrations', 'add_unique_student_constraint.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Выполняем миграцию
    await sql.unsafe(migrationSQL);
    
    console.log('Миграция успешно выполнена!');
    console.log('Теперь каждый студент может состоять только в одном классе одновременно.');
    
  } catch (error) {
    console.error('Ошибка при выполнении миграции:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
