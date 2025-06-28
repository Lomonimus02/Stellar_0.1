// server/index.ts
import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { testConnection } from "./db";
import dotenv from "dotenv";
import { Server } from "http";
import * as https from "https";
import * as tls from "tls";
import path from "path";
import { initializeEncryption } from "./utils/encryption";
import { checkSSLCertificates, loadSSLCertificates } from "./ssl-config";

// Расширяем интерфейс Socket для поддержки TLS
declare global {
  namespace NodeJS {
    interface Socket {
      encrypted?: boolean;
    }
  }

  namespace Express {
    interface Request {
      secure?: boolean;
    }
  }
}

// Загружаем переменные окружения
dotenv.config();

const app = express();
// Убираем заголовок X-Powered-By для безопасности
app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Настраиваем статические файлы для загрузок
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Флаг для отслеживания статуса БД
let isDbHealthy = false;
// Интервал проверки соединения с БД (в миллисекундах)
const DB_HEALTH_CHECK_INTERVAL = 30000; // 30 секунд
// Таймер для периодической проверки соединения с БД
let dbHealthCheckTimer: NodeJS.Timeout | null = null;
// Флаг, указывающий, доступен ли HTTPS
let isHttpsAvailable = false;

// Функция для определения, является ли запрос защищенным (HTTPS)
function isSecureRequest(req: Request): boolean {
  return Boolean(
    req.protocol === 'https' || // Проверка протокола
    req.headers['x-forwarded-proto'] === 'https' || // Для запросов через прокси
    req.headers['x-forwarded-ssl'] === 'on' || // Альтернативный заголовок
    (req.socket && Object.prototype.hasOwnProperty.call(req.socket, 'encrypted') && (req.socket as any).encrypted === true) // Безопасный способ проверки шифрования сокета
  );
}

// Middleware для перенаправления с HTTP на HTTPS
app.use((req, res, next) => {
  // Проверяем, включен ли HTTPS и не является ли соединение уже защищенным
  if (isHttpsAvailable && !isSecureRequest(req)) {
    // Если запрос пришел не через HTTPS, но HTTPS доступен, перенаправляем на HTTPS
    const host = req.headers.host?.replace(/:.*/, '') || 'localhost';
    const httpsPort = 5443; // Порт HTTPS сервера

    // Проверяем, идет ли запрос от локального сервера разработки (Vite)
    const isDevRequest = req.headers['user-agent']?.includes('vite');

    // Если это запрос от Vite в режиме разработки, не перенаправляем
    if (isDevRequest || req.path.startsWith('/@vite') || req.path.includes('.hot-update.')) {
      return next();
    }

    // Строим URL для редиректа на HTTPS
    const redirectUrl = `https://${host}:${httpsPort}${req.url}`;
    console.log(`Redirecting from HTTP to HTTPS: ${redirectUrl}`);

    // Перенаправляем запрос на HTTPS
    return res.redirect(302, redirectUrl);
  }

  // Если HTTPS не доступен или запрос уже пришел через HTTPS, продолжаем обработку как обычно
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Маршрут для проверки статуса соединения с БД
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: isDbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Функция для периодической проверки соединения с БД
async function checkDatabaseHealth() {
  try {
    const connected = await testConnection();
    if (connected !== isDbHealthy) {
      if (connected) {
        console.log('Database connection restored');
        isDbHealthy = true;
      } else {
        console.warn('Database connection lost');
        isDbHealthy = false;
      }
    }
  } catch (err: unknown) {
    const error = err as Error;
    if (isDbHealthy) {
      console.warn('Database health check failed:', error.message);
      isDbHealthy = false;
    }
  }

  // Перезапуск таймера для следующей проверки
  if (dbHealthCheckTimer) {
    clearTimeout(dbHealthCheckTimer);
  }
  dbHealthCheckTimer = setTimeout(checkDatabaseHealth, DB_HEALTH_CHECK_INTERVAL);
}

// Функция для очистки ресурсов при завершении работы сервера
function setupGracefulShutdown(servers: Server[]) {
  const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

  signals.forEach(signal => {
    process.on(signal, () => {
      console.log(`Received ${signal}, gracefully shutting down...`);

      // Очистка таймера проверки соединения с БД
      if (dbHealthCheckTimer) {
        clearTimeout(dbHealthCheckTimer);
      }

      // Подсчитываем количество успешно закрытых серверов
      let closedServers = 0;
      const totalServers = servers.length;

      // Функция для проверки, все ли серверы закрыты
      const checkAllServersClosed = () => {
        closedServers++;
        if (closedServers === totalServers) {
          console.log('All servers closed');
          process.exit(0);
        }
      };

      // Закрытие всех серверов
      servers.forEach(server => {
        server.close(() => {
          console.log('Server instance closed');
          checkAllServersClosed();
        });
      });

      // Если серверы не закрываются в течение 10 секунд, принудительно завершаем процесс
      setTimeout(() => {
        console.error('Server close timeout, forcing exit');
        process.exit(1);
      }, 10000);
    });
  });
}

(async () => {
  // Функция для повторной попытки подключения к базе данных
  const tryConnectToDatabase = async (maxRetries = 5, retryInterval = 5000) => {
    let currentRetry = 0;

    while (currentRetry < maxRetries) {
      try {
        console.log(`Attempt ${currentRetry + 1}/${maxRetries} to connect to database...`);
        const isConnected = await testConnection();

        if (isConnected) {
          console.log('Database connection successful.');
          // Устанавливаем PostgreSQL как основное хранилище данных
          process.env.USE_DATABASE = "true";
          isDbHealthy = true;
          return true;
        }
      } catch (error) {
        console.error(`Database connection error (attempt ${currentRetry + 1}/${maxRetries}):`, error);

        // Для Neon Database это обычная ошибка при использовании serverless
        if (error instanceof Error &&
            (error.message.includes('terminating connection due to administrator command') ||
             error.message.includes('57P01'))) {
          console.log('Neon serverless database connection scaled down. Will retry...');
        }
      }

      currentRetry++;

      if (currentRetry < maxRetries) {
        console.log(`Waiting ${retryInterval/1000} seconds before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, retryInterval));
      }
    }

    console.warn('Could not connect to database after maximum attempts. Starting with limited functionality.');
    isDbHealthy = false;
    return false;
  };

  try {
    await tryConnectToDatabase();

    // Запускаем периодическую проверку соединения с БД
    dbHealthCheckTimer = setTimeout(checkDatabaseHealth, DB_HEALTH_CHECK_INTERVAL);

    // Инициализируем систему шифрования
    console.log('Initializing encryption system...');
    const encryptionInitialized = await initializeEncryption();
    if (!encryptionInitialized) {
      console.error('Failed to initialize encryption system!');
    } else {
      console.log('Encryption system initialized successfully');
    }

    // Проверяем доступность SSL-сертификатов
    isHttpsAvailable = await checkSSLCertificates();
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Fatal error during database connection attempts:', error);
    console.log('Starting app with limited functionality...');
    isDbHealthy = false;
  }

  // Создаем HTTP сервер
  const httpServer = await registerRoutes(app);

  // Создаем массив всех серверов для корректного завершения работы
  const servers: Server[] = [httpServer];

  // Создаем HTTPS сервер, если доступны сертификаты
  let httpsServer: https.Server | null = null;

  if (isHttpsAvailable) {
    try {
      const sslCerts = await loadSSLCertificates();

      if (sslCerts) {
        // Создаем HTTPS сервер с использованием тех же настроек Express
        httpsServer = https.createServer({
          key: sslCerts.key,
          cert: sslCerts.cert
        }, app);

        // Добавляем HTTPS сервер в список для корректного завершения работы
        servers.push(httpsServer);

        console.log('HTTPS server created successfully');
      }
    } catch (error: any) {
      console.error(`Failed to create HTTPS server: ${error.message}`);
      isHttpsAvailable = false;
    }
  }

  // Настраиваем корректное завершение работы серверов
  setupGracefulShutdown(servers);

  // Создаем интерфейс для ошибок PostgreSQL
  interface PostgresError extends Error {
    code?: string;
  }

  // Обработчик для перехвата необработанных исключений
  process.on('uncaughtException', (err: Error) => {
    console.error('Uncaught exception:', err);

    // Проверяем, является ли ошибка ошибкой PostgreSQL
    const pgError = err as PostgresError;

    // Если ошибка связана с БД и содержит код 57P01, это ожидаемая ошибка для Neon Database
    if (pgError.code === '57P01' ||
        (err instanceof Error && err.message.includes('terminating connection due to administrator command'))) {
      console.log('Neon database connection was terminated. This is normal with serverless databases.');
      // Принудительно запускаем проверку здоровья БД
      checkDatabaseHealth();
    } else {
      // Для других серьезных ошибок перезапускаем процесс
      console.error('Critical error, process will exit');
      setTimeout(() => process.exit(1), 1000);
    }
  });

  // Обработчик для перехвата необработанных отклонений промисов
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);

    // Если ошибка связана с БД
    if (reason instanceof Error) {
      const pgError = reason as PostgresError;
      if (reason.message.includes('terminating connection due to administrator command') ||
          pgError.code === '57P01') {
        console.log('Neon database connection was terminated. This is normal with serverless databases.');
        // Принудительно запускаем проверку здоровья БД
        checkDatabaseHealth();
      }
    }
  });

  // Глобальный обработчик ошибок Express
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Server error:', err);

    // Проверка на ошибки десериализации пользователя или невалидные данные сессии
    const isDeserializationError = 
        err?.message?.includes('Failed to deserialize user') ||
        (err?.message?.includes('User with id') && err?.message?.includes('not found')) ||
        err?.message?.includes('Invalid session data: User roles missing.');

    if (isDeserializationError) {
      console.log('User deserialization or invalid session error detected, destroying session');
      // Ensure session exists before trying to destroy it
      if (req.session) {
            req.session.destroy((destroyErr) => {
              if (destroyErr) {
                console.error("Error destroying session:", destroyErr);
              }
              // Отправляем статус 401 для перенаправления на страницу логина
              if (!res.headersSent) {
                return res.status(401).json({
                  message: "Session invalid or expired. Please login again."
                });
              }
            });
      } else {
            // If session doesn't even exist, just send 401
             if (!res.headersSent) {
                return res.status(401).json({
                  message: "Session invalid or expired. Please login again."
                });
              }
      }

    }
    // Проверка на ошибки соединения с базой данных Neon
    else if (err?.message?.includes('terminating connection due to administrator command') ||
             err?.code === '57P01') {
      console.log('Neon database connection was terminated. This is normal for serverless databases.');
      isDbHealthy = false;

      // Запускаем проверку подключения к БД через 5 секунд
      setTimeout(checkDatabaseHealth, 5000);

      // Возвращаем ответ клиенту о временной недоступности
      if (!res.headersSent) {
        return res.status(503).json({
          message: "Database temporarily unavailable. Please try again in a few moments."
        });
      }
    }

    // Отправляем ответ об ошибке клиенту
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  // Порты для HTTP и HTTPS серверов
  const httpPort = 5000;  // основной порт для HTTP
  const httpsPort = 5443; // порт для HTTPS (опционально)

  // Функция запуска HTTP сервера
  function startHttpServer() {
    httpServer.listen({
      port: httpPort,
      host: "0.0.0.0", // Убрали reusePort
    }, () => {
      log(`HTTP server is running on port ${httpPort}`);
    }).on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${httpPort} is already in use. Waiting 3 seconds to retry...`);
        setTimeout(() => {
          console.log('Attempting to restart HTTP server...');
          httpServer.close();
          startHttpServer();
        }, 3000);
      } else {
        console.error('Error starting HTTP server:', err);
      }
    });
  }

  // Функция запуска HTTPS сервера, если доступен
  function startHttpsServer() {
    if (httpsServer && isHttpsAvailable) {
      httpsServer.listen({
        port: httpsPort,
        host: "0.0.0.0", // Убрали reusePort
      }, () => {
        log(`HTTPS server is running on port ${httpsPort}`);
      }).on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${httpsPort} is already in use. Waiting 3 seconds to retry...`);
          setTimeout(() => {
            console.log('Attempting to restart HTTPS server...');
            httpsServer?.close();
            startHttpsServer();
          }, 3000);
        } else {
          console.error('Error starting HTTPS server:', err);
        }
      });
    }
  }

  // Запускаем HTTP сервер
  startHttpServer();

  // Запускаем HTTPS сервер, если доступен
  if (isHttpsAvailable && httpsServer) {
    startHttpsServer();
  }
})();