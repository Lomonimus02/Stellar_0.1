#!/usr/bin/env node

/**
 * Скрипт для создания пользователя с ролью главного администратора
 * Использование: npx tsx scripts/create-superadmin.js
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import dotenv from 'dotenv';
import { users, userRoles } from '../shared/schema.ts';

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

async function createSuperAdmin() {
  try {
    console.log('Создание пользователя с ролью главного администратора...');

    // Данные нового пользователя
    const userData = {
      username: 'superadmin123',
      password: 'superadmin123',
      firstName: 'Главный',
      lastName: 'Администратор',
      email: 'superadmin@example.com',
      phone: null,
      activeRole: 'super_admin',
      schoolId: null
    };

    // Проверяем, не существует ли уже пользователь с таким логином
    const existingUsers = await db.select().from(users).where(sql`username = ${userData.username}`);
    if (existingUsers.length > 0) {
      console.error(`Пользователь с логином "${userData.username}" уже существует!`);
      process.exit(1);
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
      phone: userData.phone,
      activeRole: userData.activeRole,
      schoolId: userData.schoolId
    }).returning();

    console.log(`Пользователь создан с ID: ${user.id}`);

    // Добавляем роль главного администратора
    await db.insert(userRoles).values({
      userId: user.id,
      role: 'super_admin',
      schoolId: null,
      classId: null
    });

    console.log('Роль главного администратора добавлена');

    console.log('\n✅ Пользователь успешно создан!');
    console.log(`Логин: ${userData.username}`);
    console.log(`Пароль: ${userData.password}`);
    console.log(`Роль: Главный администратор (super_admin)`);

  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Запускаем скрипт
createSuperAdmin();
