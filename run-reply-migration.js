#!/usr/bin/env node

/**
 * Скрипт для применения миграции добавления поля reply_to_message_id
 * Добавляет поддержку ответов на сообщения в чатах
 */

import pkg from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Подключение к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/school_management'
});

async function runReplyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Начинаем миграцию для поддержки ответов на сообщения...');
    
    // Проверяем, существует ли уже поле reply_to_message_id
    const columnExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'reply_to_message_id'
      )
    `);
    
    if (columnExists.rows[0].exists) {
      console.log('✅ Поле reply_to_message_id уже существует, миграция не требуется');
      return;
    }
    
    // Читаем SQL файл миграции
    const migrationPath = path.join(__dirname, 'migrations', 'add_reply_to_message_id.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('📝 Применяем миграцию...');
    
    // Выполняем миграцию в транзакции
    await client.query('BEGIN');
    
    // Выполняем SQL команды
    await client.query(migrationSQL);
    
    await client.query('COMMIT');
    
    console.log('✅ Миграция успешно применена!');
    console.log('📊 Добавлено поле reply_to_message_id в таблицу messages');
    console.log('🔗 Добавлен внешний ключ для связи с исходными сообщениями');
    console.log('⚡ Добавлен индекс для быстрого поиска ответов');
    
    // Проверяем результат
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'messages' 
      AND column_name = 'reply_to_message_id'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Поле успешно добавлено:', result.rows[0]);
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка при применении миграции:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Запускаем миграцию
runReplyMigration()
  .then(() => {
    console.log('🎉 Миграция завершена успешно!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Миграция завершилась с ошибкой:', error);
    process.exit(1);
  });
