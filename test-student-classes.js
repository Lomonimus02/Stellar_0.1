import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { studentClasses, users, classes } from './shared/schema.ts';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

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

async function testStudentClasses() {
  try {
    console.log('Тестирование новой логики "один студент - один класс"...\n');
    
    // 1. Получаем всех студентов
    const allStudents = await db.select().from(users).where(eq(users.role, 'student'));
    console.log(`Найдено студентов: ${allStudents.length}`);
    
    // 2. Получаем все классы
    const allClasses = await db.select().from(classes);
    console.log(`Найдено классов: ${allClasses.length}\n`);
    
    // 3. Проверяем текущие связи студент-класс
    const currentConnections = await db.select().from(studentClasses);
    console.log(`Текущих связей студент-класс: ${currentConnections.length}`);
    
    // 4. Группируем по студентам, чтобы найти тех, кто в нескольких классах
    const studentClassCount = {};
    currentConnections.forEach(connection => {
      if (!studentClassCount[connection.studentId]) {
        studentClassCount[connection.studentId] = 0;
      }
      studentClassCount[connection.studentId]++;
    });
    
    const studentsInMultipleClasses = Object.entries(studentClassCount)
      .filter(([studentId, count]) => count > 1);
    
    if (studentsInMultipleClasses.length > 0) {
      console.log('\nСтуденты в нескольких классах (будут исправлены миграцией):');
      for (const [studentId, count] of studentsInMultipleClasses) {
        const student = allStudents.find(s => s.id === parseInt(studentId));
        console.log(`- ${student?.firstName} ${student?.lastName} (ID: ${studentId}): ${count} классов`);
      }
    } else {
      console.log('\nВсе студенты состоят максимум в одном классе ✓');
    }
    
    // 5. Показываем статистику
    const studentsWithClasses = Object.keys(studentClassCount).length;
    const studentsWithoutClasses = allStudents.length - studentsWithClasses;
    
    console.log('\nСтатистика:');
    console.log(`- Студентов с классами: ${studentsWithClasses}`);
    console.log(`- Студентов без классов: ${studentsWithoutClasses}`);
    console.log(`- Всего студентов: ${allStudents.length}`);
    
  } catch (error) {
    console.error('Ошибка при тестировании:', error);
  } finally {
    await sql.end();
  }
}

testStudentClasses();
