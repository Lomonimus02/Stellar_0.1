import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Запуск миграции для аватарок чатов...');
    
    // Создание таблицы для аватарок чатов
    await client.query(`
      CREATE TABLE IF NOT EXISTS "chat_avatars" (
        "id" serial PRIMARY KEY NOT NULL,
        "chat_id" integer NOT NULL,
        "file_name" text NOT NULL,
        "mime_type" text NOT NULL,
        "file_size" integer NOT NULL,
        "image_data" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('✅ Таблица chat_avatars создана');
    
    // Добавление столбца has_avatar в таблицу chats
    await client.query(`
      ALTER TABLE "chats" ADD COLUMN IF NOT EXISTS "has_avatar" boolean DEFAULT false;
    `);
    console.log('✅ Столбец has_avatar добавлен в таблицу chats');
    
    // Добавление столбца updated_at в таблицу chats
    await client.query(`
      ALTER TABLE "chats" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
    `);
    console.log('✅ Столбец updated_at добавлен в таблицу chats');
    
    // Создание индекса для быстрого поиска аватарок по chat_id
    await client.query(`
      CREATE INDEX IF NOT EXISTS "chat_avatars_chat_id_idx" ON "chat_avatars" ("chat_id");
    `);
    console.log('✅ Индекс chat_avatars_chat_id_idx создан');
    
    console.log('🎉 Миграция успешно завершена!');
    
  } catch (error) {
    console.error('❌ Ошибка при выполнении миграции:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
