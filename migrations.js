// Since we need to import TypeScript files, let's use the Drizzle migration setup directly
// by leveraging the database connection from the running application
import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function addScheduleDateColumn() {
  try {
    console.log('Проверяем наличие колонки schedule_date в таблице schedules...');
    const checkColumnExistsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'schedules' AND column_name = 'schedule_date'
    `;
    
    const result = await db.execute(sql.raw(checkColumnExistsQuery));
    
    if (result.length === 0) {
      console.log('Колонка schedule_date не найдена, добавляем...');
      const addColumnQuery = `
        ALTER TABLE schedules 
        ADD COLUMN schedule_date DATE
      `;
      await db.execute(sql.raw(addColumnQuery));
      console.log('Колонка schedule_date успешно добавлена');
    } else {
      console.log('Колонка schedule_date уже существует');
    }
  } catch (error) {
    console.error('Ошибка при добавлении колонки schedule_date:', error);
    throw error;
  }
}

async function addGradeScheduleIdColumn() {
  try {
    console.log('Проверяем наличие колонки schedule_id в таблице grades...');
    const checkColumnExistsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'grades' AND column_name = 'schedule_id'
    `;
    
    const result = await db.execute(sql.raw(checkColumnExistsQuery));
    
    if (result.length === 0) {
      console.log('Колонка schedule_id не найдена, добавляем...');
      const addColumnQuery = `
        ALTER TABLE grades 
        ADD COLUMN schedule_id INTEGER
      `;
      await db.execute(sql.raw(addColumnQuery));
      console.log('Колонка schedule_id успешно добавлена');
    } else {
      console.log('Колонка schedule_id уже существует');
    }
  } catch (error) {
    console.error('Ошибка при добавлении колонки schedule_id:', error);
    throw error;
  }
}

async function addUserRolesClassIdColumn() {
  try {
    console.log('Проверяем наличие колонки class_id в таблице user_roles...');
    const checkColumnExistsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_roles' AND column_name = 'class_id'
    `;
    
    const result = await db.execute(sql.raw(checkColumnExistsQuery));
    
    if (result.length === 0) {
      console.log('Колонка class_id не найдена, добавляем...');
      const addColumnQuery = `
        ALTER TABLE user_roles 
        ADD COLUMN class_id INTEGER
      `;
      await db.execute(sql.raw(addColumnQuery));
      console.log('Колонка class_id успешно добавлена');
    } else {
      console.log('Колонка class_id уже существует');
    }
  } catch (error) {
    console.error('Ошибка при добавлении колонки class_id:', error);
    throw error;
  }
}

async function addGradeSubgroupIdColumn() {
  try {
    console.log('Проверяем наличие колонки subgroup_id в таблице grades...');
    const checkColumnExistsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'grades' AND column_name = 'subgroup_id'
    `;
    
    const result = await db.execute(sql.raw(checkColumnExistsQuery));
    
    if (result.length === 0) {
      console.log('Колонка subgroup_id не найдена, добавляем...');
      const addColumnQuery = `
        ALTER TABLE grades 
        ADD COLUMN subgroup_id INTEGER
      `;
      await db.execute(sql.raw(addColumnQuery));
      console.log('Колонка subgroup_id успешно добавлена');
    } else {
      console.log('Колонка subgroup_id уже существует');
    }
  } catch (error) {
    console.error('Ошибка при добавлении колонки subgroup_id:', error);
    throw error;
  }
}

async function addClassGradingSystemColumn() {
  try {
    console.log('Проверяем наличие колонки grading_system в таблице classes...');
    const checkColumnExistsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'classes' AND column_name = 'grading_system'
    `;
    
    const result = await db.execute(sql.raw(checkColumnExistsQuery));
    
    if (result.length === 0) {
      console.log('Колонка grading_system не найдена, добавляем...');
      const addColumnQuery = `
        ALTER TABLE classes 
        ADD COLUMN grading_system TEXT NOT NULL DEFAULT 'five_point'
      `;
      await db.execute(sql.raw(addColumnQuery));
      console.log('Колонка grading_system успешно добавлена');
    } else {
      console.log('Колонка grading_system уже существует');
    }
  } catch (error) {
    console.error('Ошибка при добавлении колонки grading_system:', error);
    throw error;
  }
}

async function addGradeAssignmentIdColumn() {
  try {
    console.log('Проверяем наличие колонки assignment_id в таблице grades...');
    const checkColumnExistsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'grades' AND column_name = 'assignment_id'
    `;
    
    const result = await db.execute(sql.raw(checkColumnExistsQuery));
    
    if (result.length === 0) {
      console.log('Колонка assignment_id не найдена, добавляем...');
      const addColumnQuery = `
        ALTER TABLE grades 
        ADD COLUMN assignment_id INTEGER
      `;
      await db.execute(sql.raw(addColumnQuery));
      console.log('Колонка assignment_id успешно добавлена');
    } else {
      console.log('Колонка assignment_id уже существует');
    }
  } catch (error) {
    console.error('Ошибка при добавлении колонки assignment_id:', error);
    throw error;
  }
}

async function addAttendanceScheduleIdColumn() {
  try {
    console.log('Проверяем наличие колонки schedule_id в таблице attendance...');
    const checkColumnExistsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attendance' AND column_name = 'schedule_id'
    `;
    
    const result = await db.execute(sql.raw(checkColumnExistsQuery));
    
    if (result.length === 0) {
      console.log('Колонка schedule_id не найдена, добавляем...');
      const addColumnQuery = `
        ALTER TABLE attendance 
        ADD COLUMN schedule_id INTEGER NOT NULL DEFAULT 0
      `;
      await db.execute(sql.raw(addColumnQuery));
      
      // Удаляем ограничение NOT NULL DEFAULT 0 после создания
      const removeDefaultQuery = `
        ALTER TABLE attendance 
        ALTER COLUMN schedule_id DROP DEFAULT
      `;
      await db.execute(sql.raw(removeDefaultQuery));
      
      console.log('Колонка schedule_id успешно добавлена');
    } else {
      console.log('Колонка schedule_id уже существует');
    }
  } catch (error) {
    console.error('Ошибка при добавлении колонки schedule_id:', error);
    throw error;
  }
}

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

async function runMigrations() {
  try {
    console.log('Запуск миграций...');
    await addScheduleDateColumn();
    await addGradeScheduleIdColumn();
    await addUserRolesClassIdColumn();
    await addGradeSubgroupIdColumn();
    await addClassGradingSystemColumn();
    await addGradeAssignmentIdColumn();
    await addAttendanceScheduleIdColumn();
    await createMessagingTables();
    console.log('Миграции успешно выполнены');
  } catch (error) {
    console.error('Ошибка при выполнении миграций:', error);
  }
}

// Запускаем миграции
runMigrations();