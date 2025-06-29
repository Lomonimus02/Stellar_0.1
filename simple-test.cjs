// Простой тест для проверки файловой системы и сервера
const fs = require('fs');
const path = require('path');

function testDirectories() {
  console.log('=== Testing upload directories ===');
  
  const uploadDir = path.join(process.cwd(), 'uploads');
  const encryptedDir = path.join(uploadDir, 'encrypted');
  const tempDir = path.join(uploadDir, 'temp');
  
  console.log('Upload dir:', uploadDir);
  console.log('Encrypted dir:', encryptedDir);
  console.log('Temp dir:', tempDir);
  
  // Проверяем существование директорий
  const dirs = [
    { name: 'uploads', path: uploadDir },
    { name: 'encrypted', path: encryptedDir },
    { name: 'temp', path: tempDir }
  ];
  
  dirs.forEach(dir => {
    if (fs.existsSync(dir.path)) {
      console.log(`✅ ${dir.name} directory exists`);
      
      // Проверяем права доступа
      try {
        fs.accessSync(dir.path, fs.constants.R_OK | fs.constants.W_OK);
        console.log(`✅ ${dir.name} directory is readable and writable`);
      } catch (error) {
        console.log(`❌ ${dir.name} directory access error:`, error.message);
      }
    } else {
      console.log(`❌ ${dir.name} directory does not exist`);
    }
  });
}

function testFileOperations() {
  console.log('\n=== Testing file operations ===');
  
  const testFilePath = path.join(process.cwd(), 'uploads', 'temp', 'test-file.txt');
  const testContent = 'This is a test file';
  
  try {
    // Создаем тестовый файл
    fs.writeFileSync(testFilePath, testContent);
    console.log('✅ Test file created successfully');
    
    // Читаем файл
    const readContent = fs.readFileSync(testFilePath, 'utf8');
    if (readContent === testContent) {
      console.log('✅ Test file read successfully');
    } else {
      console.log('❌ Test file content mismatch');
    }
    
    // Удаляем файл
    fs.unlinkSync(testFilePath);
    console.log('✅ Test file deleted successfully');
    
  } catch (error) {
    console.log('❌ File operations error:', error.message);
  }
}

async function testServerHealth() {
  console.log('\n=== Testing server health ===');
  
  try {
    // Простая проверка, что сервер отвечает
    const http = require('http');
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/user',
      method: 'GET',
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      console.log(`✅ Server responded with status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Server is healthy');
        } else if (res.statusCode === 401) {
          console.log('✅ Server is running (authentication required)');
        } else {
          console.log(`⚠️ Server responded with status ${res.statusCode}`);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Server connection error:', error.message);
    });
    
    req.on('timeout', () => {
      console.log('❌ Server request timeout');
      req.destroy();
    });
    
    req.end();
    
  } catch (error) {
    console.log('❌ Server test error:', error.message);
  }
}

// Запускаем тесты
if (require.main === module) {
  console.log('Starting system tests...\n');
  
  testDirectories();
  testFileOperations();
  testServerHealth();
  
  console.log('\nSystem tests completed');
}
