#!/usr/bin/env node

/**
 * Скрипт для добавления тестовых пользователей с недостающими ролями
 * Использование: npx tsx scripts/add-test-users.js
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import dotenv from 'dotenv';
import { users, userRoles, schools } from '../shared/schema.ts';
import { eq } from 'drizzle-orm';

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

async function addTestUsers() {
  try {
    console.log('Добавление тестовых пользователей с недостающими ролями...');

    // Получаем первую школу для привязки пользователей
    const [school] = await db.select().from(schools).limit(1);
    if (!school) {
      console.error('Не найдено ни одной школы. Создайте школу сначала.');
      process.exit(1);
    }

    console.log(`Используем школу: ${school.name} (ID: ${school.id})`);

    // Список пользователей для создания
    const testUsers = [
      {
        username: 'director1',
        password: 'director123',
        firstName: 'Иван',
        lastName: 'Директоров',
        email: 'director@school.com',
        role: 'principal',
        activeRole: 'principal'
      },
      {
        username: 'viceprincipal1',
        password: 'vice123',
        firstName: 'Мария',
        lastName: 'Завучева',
        email: 'vice@school.com',
        role: 'vice_principal',
        activeRole: 'vice_principal'
      },
      {
        username: 'schooladmin2',
        password: 'admin123',
        firstName: 'Петр',
        lastName: 'Администраторов',
        email: 'admin2@school.com',
        role: 'school_admin',
        activeRole: 'school_admin'
      },
      {
        username: 'teacher1',
        password: 'teacher123',
        firstName: 'Анна',
        lastName: 'Учителева',
        email: 'teacher1@school.com',
        role: 'teacher',
        activeRole: 'teacher'
      },
      {
        username: 'classteacher1',
        password: 'class123',
        firstName: 'Елена',
        lastName: 'Классная',
        email: 'classteacher@school.com',
        role: 'class_teacher',
        activeRole: 'class_teacher'
      },
      {
        username: 'student1',
        password: 'student123',
        firstName: 'Алексей',
        lastName: 'Ученикин',
        email: 'student1@school.com',
        role: 'student',
        activeRole: 'student'
      },
      {
        username: 'parent1',
        password: 'parent123',
        firstName: 'Ольга',
        lastName: 'Родителева',
        email: 'parent1@school.com',
        role: 'parent',
        activeRole: 'parent'
      }
    ];

    for (const userData of testUsers) {
      try {
        // Проверяем, не существует ли уже пользователь с таким логином
        const existingUsers = await db.select().from(users).where(eq(users.username, userData.username));
        if (existingUsers.length > 0) {
          console.log(`Пользователь с логином "${userData.username}" уже существует, пропускаем...`);
          continue;
        }

        // Хешируем пароль
        const hashedPassword = await hashPassword(userData.password);

        // Создаем пользователя
        const [user] = await db.insert(users).values({
          username: userData.username,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: null,
          activeRole: userData.activeRole,
          schoolId: school.id
        }).returning();

        console.log(`✅ Создан пользователь: ${userData.username} (${userData.firstName} ${userData.lastName}) с ID: ${user.id}`);

        // Добавляем роль в таблицу user_roles
        await db.insert(userRoles).values({
          userId: user.id,
          role: userData.role,
          schoolId: school.id,
          classId: null
        });

        console.log(`✅ Добавлена роль "${userData.role}" для пользователя ${userData.username}`);

      } catch (error) {
        console.error(`❌ Ошибка при создании пользователя ${userData.username}:`, error.message);
      }
    }

    console.log('\n🎉 Завершено добавление тестовых пользователей!');
    console.log('\nСозданные пользователи:');
    console.log('- director1 / director123 (Директор)');
    console.log('- viceprincipal1 / vice123 (Завуч)');
    console.log('- schooladmin2 / admin123 (Администратор школы)');
    console.log('- teacher1 / teacher123 (Учитель)');
    console.log('- classteacher1 / class123 (Классный руководитель)');
    console.log('- student1 / student123 (Ученик)');
    console.log('- parent1 / parent123 (Родитель)');

  } catch (error) {
    console.error('❌ Ошибка при добавлении тестовых пользователей:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Запускаем скрипт
addTestUsers();
