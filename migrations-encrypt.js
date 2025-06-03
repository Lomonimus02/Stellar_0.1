import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function addUserKeysColumns() {
  console.log('Добавление колонок для ключей пользователей...');
  
  try {
    // Непосредственно выполняем ALTER TABLE, Postgres не будет добавлять колонку, если она уже существует (с IF NOT EXISTS)
    try {
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key TEXT;`);
      console.log('Колонка public_key добавлена или уже существует');
    } catch (err) {
      console.error('Ошибка при добавлении колонки public_key:', err);
    }
    
    try {
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS private_key TEXT;`);
      console.log('Колонка private_key добавлена или уже существует');
    } catch (err) {
      console.error('Ошибка при добавлении колонки private_key:', err);
    }
    
    console.log('Миграция пользовательских ключей успешно завершена');
  } catch (error) {
    console.error('Ошибка при добавлении колонок для ключей пользователей:', error);
  }
}

async function addEncryptedFileColumn() {
  console.log('Добавление колонки для хранения зашифрованных файлов...');
  
  try {
    // Добавляем колонку is_encrypted в таблицу documents, если она не существует
    try {
      await db.execute(sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;`);
      console.log('Колонка is_encrypted добавлена в таблицу documents или уже существует');
    } catch (err) {
      console.error('Ошибка при добавлении колонки is_encrypted:', err);
    }
    
    // Добавляем колонку is_e2e_encrypted в таблицу messages, если она не существует
    try {
      await db.execute(sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_e2e_encrypted BOOLEAN DEFAULT false;`);
      console.log('Колонка is_e2e_encrypted добавлена в таблицу messages или уже существует');
    } catch (err) {
      console.error('Ошибка при добавлении колонки is_e2e_encrypted:', err);
    }
    
    console.log('Миграция шифрования файлов и сообщений успешно завершена');
  } catch (error) {
    console.error('Ошибка при добавлении колонок для шифрованных файлов:', error);
  }
}

async function runMigrations() {
  try {
    await addUserKeysColumns();
    await addEncryptedFileColumn();
    
    console.log('Все миграции успешно выполнены');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка при выполнении миграций:', error);
    process.exit(1);
  }
}

runMigrations();