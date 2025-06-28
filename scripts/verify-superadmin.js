#!/usr/bin/env node

/**
 * Скрипт для проверки созданного пользователя с ролью главного администратора
 * Использование: npx tsx scripts/verify-superadmin.js
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { scrypt } from "crypto";
import { promisify } from "util";
import dotenv from 'dotenv';
import { users, userRoles } from '../shared/schema.ts';
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

// Функция для проверки пароля
async function verifyPassword(supplied, stored) {
  const scryptAsync = promisify(scrypt);
  if (stored.includes(".")) {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = await scryptAsync(supplied, salt, 64);
    return hashedBuf.equals(suppliedBuf);
  } else {
    return supplied === stored;
  }
}

async function verifySuperAdmin() {
  try {
    console.log('Проверка созданного пользователя superadmin123...');
    
    // Ищем пользователя
    const [user] = await db.select().from(users).where(eq(users.username, 'superadmin123'));
    
    if (!user) {
      console.error('❌ Пользователь superadmin123 не найден!');
      process.exit(1);
    }
    
    console.log('✅ Пользователь найден:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Логин: ${user.username}`);
    console.log(`  Имя: ${user.firstName} ${user.lastName}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Активная роль: ${user.activeRole}`);
    
    // Проверяем пароль
    const passwordValid = await verifyPassword('superadmin123', user.password);
    console.log(`  Пароль: ${passwordValid ? '✅ Корректный' : '❌ Некорректный'}`);
    
    // Проверяем роли пользователя
    const roles = await db.select().from(userRoles).where(eq(userRoles.userId, user.id));
    console.log(`  Роли (${roles.length}):`);
    roles.forEach(role => {
      console.log(`    - ${role.role} (школа: ${role.schoolId || 'не указана'})`);
    });
    
    // Проверяем наличие роли super_admin
    const hasSuperAdminRole = roles.some(role => role.role === 'super_admin');
    console.log(`  Роль super_admin: ${hasSuperAdminRole ? '✅ Есть' : '❌ Отсутствует'}`);
    
    if (passwordValid && hasSuperAdminRole) {
      console.log('\n🎉 Пользователь superadmin123 успешно создан и готов к использованию!');
      console.log('Вы можете войти в систему с этими учетными данными.');
    } else {
      console.log('\n⚠️ Есть проблемы с созданным пользователем.');
    }
    
  } catch (error) {
    console.error('Ошибка при проверке пользователя:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Запускаем скрипт
verifySuperAdmin();
