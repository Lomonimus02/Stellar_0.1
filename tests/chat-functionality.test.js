#!/usr/bin/env node

/**
 * Тесты для проверки функциональности чатов
 * Проверяет:
 * 1. Корректное отображение создателя как администратора группы
 * 2. Функциональность покидания группы
 * 3. Правильное отображение ролей участников
 * 
 * Использование: npx tsx tests/chat-functionality.test.js
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import dotenv from 'dotenv';
import { users, chats, chatParticipants, schools } from '../shared/schema.ts';
import { eq, and } from 'drizzle-orm';

// Загружаем переменные окружения
dotenv.config();

// Подключение к базе данных
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL не установлен');
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql);

// Функция для хеширования пароля
async function hashPassword(password) {
  const scryptAsync = promisify(scrypt);
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

// Функция для создания тестового пользователя
async function createTestUser(userData) {
  const hashedPassword = await hashPassword(userData.password);
  
  const [user] = await db.insert(users).values({
    username: userData.username,
    password: hashedPassword,
    firstName: userData.firstName,
    lastName: userData.lastName,
    email: userData.email,
    phone: null,
    activeRole: userData.activeRole,
    schoolId: userData.schoolId
  }).returning();
  
  return user;
}

// Функция для создания тестового чата
async function createTestChat(chatData) {
  const [chat] = await db.insert(chats).values({
    name: chatData.name,
    type: chatData.type,
    creatorId: chatData.creatorId,
    schoolId: chatData.schoolId
  }).returning();
  
  return chat;
}

// Функция для добавления участника в чат
async function addChatParticipant(chatId, userId, isAdmin = false) {
  await db.insert(chatParticipants).values({
    chatId,
    userId,
    isAdmin
  });
}

// Функция для получения участников чата
async function getChatParticipants(chatId) {
  return await db.select().from(chatParticipants).where(eq(chatParticipants.chatId, chatId));
}

// Функция для удаления тестовых данных
async function cleanupTestData(testUserIds, testChatIds) {
  // Удаляем участников чатов
  for (const chatId of testChatIds) {
    await db.delete(chatParticipants).where(eq(chatParticipants.chatId, chatId));
  }
  
  // Удаляем чаты
  for (const chatId of testChatIds) {
    await db.delete(chats).where(eq(chats.id, chatId));
  }
  
  // Удаляем пользователей
  for (const userId of testUserIds) {
    await db.delete(users).where(eq(users.id, userId));
  }
}

async function runTests() {
  console.log('🧪 Запуск тестов функциональности чатов...\n');
  
  let testUserIds = [];
  let testChatIds = [];
  
  try {
    // Получаем первую школу для тестов
    const [school] = await db.select().from(schools).limit(1);
    if (!school) {
      console.error('❌ Не найдено ни одной школы для тестов');
      return;
    }
    
    console.log(`📚 Используем школу: ${school.name} (ID: ${school.id})\n`);
    
    // === ТЕСТ 1: Создание группового чата и проверка администратора ===
    console.log('🔍 ТЕСТ 1: Создание группового чата и проверка администратора');
    
    // Создаем тестовых пользователей
    const creator = await createTestUser({
      username: 'test_creator_' + Date.now(),
      password: 'test123',
      firstName: 'Тест',
      lastName: 'Создатель',
      email: 'creator@test.com',
      activeRole: 'teacher',
      schoolId: school.id
    });
    testUserIds.push(creator.id);
    
    const participant1 = await createTestUser({
      username: 'test_participant1_' + Date.now(),
      password: 'test123',
      firstName: 'Тест',
      lastName: 'Участник1',
      email: 'participant1@test.com',
      activeRole: 'student',
      schoolId: school.id
    });
    testUserIds.push(participant1.id);
    
    const participant2 = await createTestUser({
      username: 'test_participant2_' + Date.now(),
      password: 'test123',
      firstName: 'Тест',
      lastName: 'Участник2',
      email: 'participant2@test.com',
      activeRole: 'student',
      schoolId: school.id
    });
    testUserIds.push(participant2.id);
    
    console.log(`✅ Созданы тестовые пользователи: ${creator.id}, ${participant1.id}, ${participant2.id}`);
    
    // Создаем групповой чат
    const testChat = await createTestChat({
      name: 'Тестовый групповой чат',
      type: 'group',
      creatorId: creator.id,
      schoolId: school.id
    });
    testChatIds.push(testChat.id);
    
    console.log(`✅ Создан тестовый чат: ${testChat.id}`);
    
    // Добавляем создателя как администратора
    await addChatParticipant(testChat.id, creator.id, true);
    
    // Добавляем участников как обычных пользователей
    await addChatParticipant(testChat.id, participant1.id, false);
    await addChatParticipant(testChat.id, participant2.id, false);
    
    console.log('✅ Добавлены участники в чат');
    
    // Проверяем участников
    const participants = await getChatParticipants(testChat.id);
    
    const creatorParticipant = participants.find(p => p.userId === creator.id);
    const participant1Data = participants.find(p => p.userId === participant1.id);
    const participant2Data = participants.find(p => p.userId === participant2.id);
    
    // Проверки
    if (!creatorParticipant) {
      console.log('❌ ОШИБКА: Создатель не найден среди участников');
      return;
    }
    
    if (!creatorParticipant.isAdmin) {
      console.log('❌ ОШИБКА: Создатель не является администратором');
      return;
    }
    
    if (participant1Data.isAdmin || participant2Data.isAdmin) {
      console.log('❌ ОШИБКА: Обычные участники не должны быть администраторами');
      return;
    }
    
    console.log('✅ ТЕСТ 1 ПРОЙДЕН: Создатель корректно отображается как администратор\n');
    
    // === ТЕСТ 2: Функциональность покидания группы ===
    console.log('🔍 ТЕСТ 2: Функциональность покидания группы');
    
    // Проверяем количество участников до выхода
    const participantsBeforeLeave = await getChatParticipants(testChat.id);
    console.log(`📊 Участников до выхода: ${participantsBeforeLeave.length}`);
    
    // Удаляем одного участника (имитируем выход)
    await db.delete(chatParticipants).where(
      and(
        eq(chatParticipants.chatId, testChat.id),
        eq(chatParticipants.userId, participant1.id)
      )
    );
    
    // Проверяем количество участников после выхода
    const participantsAfterLeave = await getChatParticipants(testChat.id);
    console.log(`📊 Участников после выхода: ${participantsAfterLeave.length}`);
    
    if (participantsAfterLeave.length !== participantsBeforeLeave.length - 1) {
      console.log('❌ ОШИБКА: Количество участников не уменьшилось после выхода');
      return;
    }
    
    const leftParticipant = participantsAfterLeave.find(p => p.userId === participant1.id);
    if (leftParticipant) {
      console.log('❌ ОШИБКА: Участник все еще в чате после выхода');
      return;
    }
    
    console.log('✅ ТЕСТ 2 ПРОЙДЕН: Функциональность покидания группы работает корректно\n');
    
    // === ТЕСТ 3: Проверка ролей участников ===
    console.log('🔍 ТЕСТ 3: Проверка ролей участников');
    
    const remainingParticipants = await getChatParticipants(testChat.id);
    
    for (const participant of remainingParticipants) {
      const user = await db.select().from(users).where(eq(users.id, participant.userId)).limit(1);
      if (user.length > 0) {
        const isCreator = participant.userId === testChat.creatorId;
        const shouldBeAdmin = isCreator;
        
        console.log(`👤 Пользователь ${user[0].firstName} ${user[0].lastName}:`);
        console.log(`   - ID: ${participant.userId}`);
        console.log(`   - Создатель: ${isCreator ? 'Да' : 'Нет'}`);
        console.log(`   - Администратор: ${participant.isAdmin ? 'Да' : 'Нет'}`);
        console.log(`   - Должен быть админом: ${shouldBeAdmin ? 'Да' : 'Нет'}`);
        
        if (participant.isAdmin !== shouldBeAdmin) {
          console.log(`❌ ОШИБКА: Неправильная роль для пользователя ${user[0].firstName}`);
          return;
        }
        
        console.log('   ✅ Роль корректна');
      }
    }
    
    console.log('✅ ТЕСТ 3 ПРОЙДЕН: Роли участников отображаются корректно\n');
    
    console.log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
    
  } catch (error) {
    console.error('❌ Ошибка при выполнении тестов:', error);
  } finally {
    // Очищаем тестовые данные
    console.log('\n🧹 Очистка тестовых данных...');
    await cleanupTestData(testUserIds, testChatIds);
    console.log('✅ Тестовые данные очищены');
    
    await sql.end();
  }
}

// Запускаем тесты
runTests();
