// Since we need to import TypeScript files, let's use the Drizzle migration setup directly
// by leveraging the database connection from the running application
const { db } = require('./server/db');
const { sql } = require('drizzle-orm');

async function createMessagingTables() {
  try {
    console.log('Проверка и создание таблиц для системы сообщений...');
    
    // Проверяем существование таблицы chats
    const checkChatsTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'chats'
      );
    `;
    const chatsTableExists = (await db.execute(sql.raw(checkChatsTableQuery)))[0].exists;
    
    if (!chatsTableExists) {
      console.log('Создание таблицы chats...');
      await db.execute(sql.raw(`
        CREATE TABLE chats (
          id SERIAL PRIMARY KEY,
          name TEXT,
          type TEXT NOT NULL,
          creator_id INTEGER NOT NULL,
          school_id INTEGER NOT NULL,
          avatar_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          last_message_at TIMESTAMP
        )
      `));
      console.log('Таблица chats успешно создана');
    } else {
      console.log('Таблица chats уже существует');
    }
    
    // Проверяем существование таблицы chat_participants
    const checkParticipantsTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'chat_participants'
      );
    `;
    const participantsTableExists = (await db.execute(sql.raw(checkParticipantsTableQuery)))[0].exists;
    
    if (!participantsTableExists) {
      console.log('Создание таблицы chat_participants...');
      await db.execute(sql.raw(`
        CREATE TABLE chat_participants (
          id SERIAL PRIMARY KEY,
          chat_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          is_admin BOOLEAN DEFAULT FALSE,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          last_read_message_id INTEGER
        )
      `));
      console.log('Таблица chat_participants успешно создана');
    } else {
      console.log('Таблица chat_participants уже существует');
    }
    
    // Проверяем наличие старой таблицы messages
    const checkMessagesTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'messages'
      );
    `;
    const messagesTableExists = (await db.execute(sql.raw(checkMessagesTableQuery)))[0].exists;
    
    if (!messagesTableExists) {
      console.log('Создание таблицы messages...');
      await db.execute(sql.raw(`
        CREATE TABLE messages (
          id SERIAL PRIMARY KEY,
          chat_id INTEGER NOT NULL,
          sender_id INTEGER NOT NULL,
          content TEXT,
          has_attachment BOOLEAN DEFAULT FALSE NOT NULL,
          attachment_type TEXT,
          attachment_url TEXT,
          is_read BOOLEAN DEFAULT FALSE NOT NULL,
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `));
      console.log('Таблица messages успешно создана');
    } else {
      // Если таблица существует, проверяем ее структуру и обновляем при необходимости
      console.log('Обновление существующей таблицы messages...');
      
      // Проверяем наличие колонки chat_id
      const checkChatIdColumnQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'messages' AND column_name = 'chat_id'
        );
      `;
      const chatIdColumnExists = (await db.execute(sql.raw(checkChatIdColumnQuery)))[0].exists;
      
      if (!chatIdColumnExists) {
        // Если старая структура, сохраняем данные, удаляем и пересоздаем таблицу
        console.log('Миграция старой структуры таблицы messages...');
        
        // Создаем временную таблицу для старых сообщений
        await db.execute(sql.raw(`
          CREATE TABLE messages_backup AS
          SELECT * FROM messages
        `));
        
        // Удаляем старую таблицу
        await db.execute(sql.raw(`DROP TABLE messages`));
        
        // Создаем новую таблицу
        await db.execute(sql.raw(`
          CREATE TABLE messages (
            id SERIAL PRIMARY KEY,
            chat_id INTEGER NOT NULL,
            sender_id INTEGER NOT NULL,
            content TEXT,
            has_attachment BOOLEAN DEFAULT FALSE NOT NULL,
            attachment_type TEXT,
            attachment_url TEXT,
            is_read BOOLEAN DEFAULT FALSE NOT NULL,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
          )
        `));
        
        console.log('Новая структура таблицы messages создана');
      } else {
        console.log('Таблица messages уже имеет актуальную структуру');
      }
    }
  } catch (error) {
    console.error('Ошибка при создании таблиц системы сообщений:', error);
    throw error;
  }
}

// Запускаем миграции
createMessagingTables()
  .then(() => {
    console.log('Миграция системы сообщений успешно выполнена');
    process.exit(0);
  })
  .catch(error => {
    console.error('Ошибка при выполнении миграции системы сообщений:', error);
    process.exit(1);
  });