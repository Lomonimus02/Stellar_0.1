import postgres from 'postgres';

async function runMigration() {
  const sql = postgres({
    host: 'localhost',
    port: 5432,
    database: 'stellar_db',
    username: 'postgres',
    password: 'password'
  });

  try {
    console.log('Применяем миграцию для добавления поля reply_to_message_id...');
    
    // Добавляем поле reply_to_message_id
    await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_message_id INTEGER`;
    console.log('✅ Поле reply_to_message_id добавлено');
    
    // Добавляем внешний ключ
    await sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'fk_reply_to_message'
        ) THEN
          ALTER TABLE messages ADD CONSTRAINT fk_reply_to_message 
            FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `;
    console.log('✅ Внешний ключ добавлен');
    
    // Добавляем индекс
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_reply_to_message_id ON messages(reply_to_message_id)`;
    console.log('✅ Индекс добавлен');
    
    console.log('🎉 Миграция успешно применена!');
    
  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error);
  } finally {
    await sql.end();
  }
}

runMigration();
