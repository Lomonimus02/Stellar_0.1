#!/bin/bash

# Тест API endpoint для загрузки файлов

echo "=== Testing file upload API ==="

# Создаем тестовый файл
echo "This is a test file for API testing" > test-upload.txt

echo "Created test file: test-upload.txt"

# Тестируем загрузку файла (без аутентификации - ожидаем 401)
echo "Testing upload without authentication..."
curl -X POST \
  -F "file=@test-upload.txt" \
  -v \
  http://localhost:5000/api/chats/1/upload

echo -e "\n\n=== Test completed ==="

# Удаляем тестовый файл
rm -f test-upload.txt
echo "Test file cleaned up"
