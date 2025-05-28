// Отладочный скрипт для проверки API
import fetch from 'node-fetch';

async function fetchStudentClasses(studentId) {
  try {
    const res = await fetch(`http://localhost:5000/api/student-classes?studentId=${studentId}`);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const data = await res.json();
    console.log('Полученные данные:', data);
    return data;
  } catch (error) {
    console.error('Ошибка при получении классов ученика:', error);
    return [];
  }
}

async function main() {
  // Проверим получение классов для ученика с ID 38 (можно заменить на актуальный ID)
  const studentId = 38;
  console.log(`Запрашиваем классы для ученика ID=${studentId}`);
  
  const classes = await fetchStudentClasses(studentId);
  console.log(`Получено ${classes.length} классов`);
  
  // Проверим структуру данных
  if (classes.length > 0) {
    console.log('Пример структуры данных первого элемента:', classes[0]);
    
    // Извлекаем идентификаторы классов
    const classIds = classes.map(c => c.classId);
    console.log('Извлеченные идентификаторы классов:', classIds);
  }
}

main();