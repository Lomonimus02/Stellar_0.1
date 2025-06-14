import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';

// Инициализация клиента PostgreSQL
const connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set. Please set it in the environment.');
  process.exit(1);
}

// Создаем типы для ошибок Postgres
interface PostgresError extends Error {
  code?: string;
}

// Функция для создания клиента с повторными попытками подключения
function createClient(options = {}) {
  let currentRetry = 0;
  const maxRetries = 5;
  const retryInterval = 3000; // 3 секунды
  
  // Проверяем и приводим connectionString к строке (для TypeScript)
  if (typeof connectionString !== 'string') {
    throw new Error('DATABASE_URL must be a valid string');
  }
  
  // Настройки соединения с более надежной обработкой ошибок для Neon Database
  const connectionOptions = {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    // Более короткое время жизни соединения для предотвращения ошибок
    max_lifetime: 60 * 10, // 10 минут
    connection: {
      application_name: "school-management-system",
    },
    // Обработка ошибок подключения
    onnotice: () => {},
    onconnect: () => {
      console.log('Database connection established');
      currentRetry = 0; // Сбрасываем счетчик повторных попыток при успешном подключении
    },
    onclose: async () => {
      console.log('Database connection closed');
    },
    // Более надежная обработка ошибок, включая автоматическое восстановление
    onerror: async (err: PostgresError) => {
      console.error('Database error occurred:', err.message);
      
      // Если ошибка связана с прерыванием соединения администратором
      if (err.message && err.message.includes('terminating connection due to administrator command')) {
        if (currentRetry < maxRetries) {
          currentRetry++;
          console.log(`Attempting to reconnect to database (attempt ${currentRetry}/${maxRetries})...`);
          
          // Повторяем попытку через некоторое время
          setTimeout(() => {
            console.log('Reconnecting to database...');
            // Клиент postgres автоматически попытается переподключиться при следующем запросе
          }, retryInterval * currentRetry);
        } else {
          console.error(`Failed to reconnect to database after ${maxRetries} attempts`);
        }
      }
    },
    debug: (conn: unknown, ...args: any[]) => {
      if (args.length && typeof args[0] === 'string' && args[0].includes('terminating connection due to administrator command')) {
        console.log('Neon serverless connection scaled down, reconnecting...');
      }
    },
    ...options
  };
  
  // Явно приводим connectionString к строке, чтобы удовлетворить типизацию
  return postgres(connectionString as string, connectionOptions);
}

// Для запросов (будет использоваться Drizzle)
const queryClient = createClient();
export const db = drizzle(queryClient, { schema });

// Для тестирования соединения
const testClient = createClient({ max: 1 });

// Тип для результата запроса
interface TestResult {
  test: number;
}

// Функция для надежной проверки подключения с повторными попытками
export const testConnection = async (): Promise<boolean> => {
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    try {
      console.log(`Attempt ${attempts + 1}/${maxAttempts} to connect to database...`);
      const result = await testClient<TestResult[]>`SELECT 1 as test`;
      console.log('Database connection successful.');
      
      try {
        // Проверяем существование необходимых таблиц
        await queryClient`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'users'
          )`;
        console.log('Database tables check successful.');
      } catch (error: unknown) {
        const tableError = error as Error;
        console.warn('Table check failed, but connection is still valid:', tableError.message);
      }
      
      return result[0].test === 1;
    } catch (err: unknown) {
      attempts++;
      const error = err as Error;
      console.error(`Failed connection attempt ${attempts}/${maxAttempts}:`, error.message);
      
      if (attempts >= maxAttempts) {
        console.error('Failed to connect to the database after maximum attempts.');
        return false;
      }
      
      // Экспоненциальная задержка между попытками
      const delay = 1000 * Math.pow(2, attempts - 1);
      console.log(`Retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return false;
};