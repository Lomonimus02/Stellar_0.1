// Простой тест для проверки назначения классного руководителя
const fetch = require('node-fetch');

async function testClassTeacherAssignment() {
  try {
    console.log('Тестирование назначения классного руководителя...');
    
    // 1. Получаем список пользователей
    const usersRes = await fetch('https://localhost:5443/api/users', {
      method: 'GET',
      headers: {
        'Cookie': 'connect.sid=s%3AiJiuHhKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz.abcdefghijklmnopqrstuvwxyz1234567890ABCDEF'
      },
      rejectUnauthorized: false
    });
    
    if (!usersRes.ok) {
      console.error('Ошибка получения пользователей:', usersRes.status, usersRes.statusText);
      return;
    }
    
    const users = await usersRes.json();
    console.log('Получено пользователей:', users.length);
    
    // Найдем учителя
    const teacher = users.find(user => user.activeRole === 'teacher' || user.activeRole === 'class_teacher');
    if (!teacher) {
      console.log('Учитель не найден в системе');
      return;
    }
    
    console.log('Найден учитель:', teacher.username, teacher.firstName, teacher.lastName);
    
    // 2. Попробуем назначить классного руководителя
    const assignRes = await fetch('https://localhost:5443/api/user-roles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3AiJiuHhKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz.abcdefghijklmnopqrstuvwxyz1234567890ABCDEF'
      },
      body: JSON.stringify({
        userId: teacher.id,
        role: 'class_teacher',
        schoolId: 1,
        classId: 3
      }),
      rejectUnauthorized: false
    });
    
    console.log('Статус ответа:', assignRes.status, assignRes.statusText);
    
    if (assignRes.ok) {
      const result = await assignRes.json();
      console.log('Классный руководитель успешно назначен:', result);
    } else {
      const errorText = await assignRes.text();
      console.error('Ошибка назначения:', errorText);
    }
    
  } catch (error) {
    console.error('Ошибка теста:', error.message);
  }
}

testClassTeacherAssignment();
