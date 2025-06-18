// Скрипт для проверки пользователей в системе
const { Client } = require('pg');

async function checkUsers() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'stellar_db',
    user: 'stellar_user',
    password: 'stellar_password'
  });

  try {
    await client.connect();
    console.log('Подключение к базе данных успешно');

    // Получаем всех пользователей
    const usersResult = await client.query(`
      SELECT 
        id, 
        username, 
        first_name, 
        last_name, 
        role, 
        active_role, 
        school_id 
      FROM users 
      ORDER BY id
    `);

    console.log('\n=== Все пользователи ===');
    console.table(usersResult.rows);

    // Получаем роли пользователей из новой таблицы
    const userRolesResult = await client.query(`
      SELECT 
        ur.id,
        ur.user_id,
        ur.role,
        ur.school_id,
        ur.class_id,
        u.username,
        u.first_name,
        u.last_name
      FROM user_roles ur
      JOIN users u ON ur.user_id = u.id
      ORDER BY ur.user_id, ur.id
    `);

    console.log('\n=== Роли пользователей ===');
    console.table(userRolesResult.rows);

    // Проверяем учителей
    const teachersResult = await client.query(`
      SELECT 
        u.id, 
        u.username, 
        u.first_name, 
        u.last_name, 
        u.active_role,
        ur.role as user_role,
        ur.school_id,
        ur.class_id
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.active_role IN ('teacher', 'class_teacher') 
         OR ur.role IN ('teacher', 'class_teacher')
      ORDER BY u.id
    `);

    console.log('\n=== Учителя ===');
    console.table(teachersResult.rows);

    // Проверяем классных руководителей
    const classTeachersResult = await client.query(`
      SELECT 
        ur.id,
        ur.user_id,
        ur.class_id,
        u.username,
        u.first_name,
        u.last_name,
        c.name as class_name
      FROM user_roles ur
      JOIN users u ON ur.user_id = u.id
      LEFT JOIN classes c ON ur.class_id = c.id
      WHERE ur.role = 'class_teacher'
      ORDER BY ur.class_id
    `);

    console.log('\n=== Классные руководители ===');
    console.table(classTeachersResult.rows);

  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await client.end();
  }
}

checkUsers();
