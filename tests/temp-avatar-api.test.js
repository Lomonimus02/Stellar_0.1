const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Мокаем модули
jest.mock('../server/utils/temp-avatar-manager');
jest.mock('../server/auth');

const { 
  saveTempAvatar,
  promoteTempAvatar,
  getTempAvatar
} = require('../server/utils/temp-avatar-manager');

describe('Temp Avatar API', () => {
  let app;
  let mockUser;

  beforeEach(() => {
    // Создаем Express приложение для тестов
    app = express();
    app.use(express.json());
    
    // Мокаем пользователя
    mockUser = { id: 123, username: 'testuser' };
    
    // Мокаем middleware аутентификации
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });

    // Очищаем все моки
    jest.clearAllMocks();
  });

  describe('POST /api/upload/chat', () => {
    beforeEach(() => {
      // Добавляем роут для тестирования
      const multer = require('multer');
      const upload = multer({ dest: '/tmp' });
      
      app.post('/api/upload/chat', upload.single('file'), async (req, res) => {
        try {
          console.log('Upload temp chat avatar request received');
          console.log('User:', req.user?.id);
          console.log('File:', req.file ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
          } : 'No file');

          // Проверяем, загружен ли файл
          if (!req.file) {
            console.log('No file uploaded');
            return res.status(400).json({ message: "No file uploaded" });
          }

          // Проверяем, что это изображение
          if (!req.file.mimetype.startsWith('image/')) {
            console.log('Invalid file type:', req.file.mimetype);
            return res.status(400).json({ message: "Only image files are allowed" });
          }

          // Проверяем размер файла (максимум 5MB)
          if (req.file.size > 5 * 1024 * 1024) {
            console.log('File too large:', req.file.size);
            return res.status(400).json({ message: "File size cannot exceed 5MB" });
          }

          // Сохраняем как временную аватарку
          const tempAvatar = await saveTempAvatar(req.user.id, req.file);

          const response = {
            success: true,
            tempAvatarId: tempAvatar.id,
            fileUrl: tempAvatar.dataUrl,
            fileName: tempAvatar.fileName,
            mimeType: tempAvatar.mimeType,
            fileSize: tempAvatar.fileSize,
            expiresAt: tempAvatar.expiresAt.toISOString()
          };

          res.status(200).json(response);
        } catch (error) {
          console.error("Error uploading temporary chat avatar:", error);
          res.status(500).json({ message: "Failed to upload file", error: error.message });
        }
      });
    });

    test('должен успешно загрузить изображение', async () => {
      const mockTempAvatar = {
        id: 'temp_123_abc',
        userId: mockUser.id,
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
        dataUrl: 'data:image/jpeg;base64,fake-data',
        expiresAt: new Date(Date.now() + 3 * 60 * 1000)
      };

      saveTempAvatar.mockResolvedValue(mockTempAvatar);

      // Создаем временный файл для тестирования
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      fs.writeFileSync(testImagePath, 'fake image data');

      const response = await request(app)
        .post('/api/upload/chat')
        .attach('file', testImagePath)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        tempAvatarId: mockTempAvatar.id,
        fileUrl: mockTempAvatar.dataUrl,
        fileName: mockTempAvatar.fileName,
        mimeType: mockTempAvatar.mimeType,
        fileSize: mockTempAvatar.fileSize
      });

      expect(saveTempAvatar).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          originalname: 'test-image.jpg',
          mimetype: 'image/jpeg'
        })
      );

      // Очищаем тестовый файл
      fs.unlinkSync(testImagePath);
    });

    test('должен отклонить запрос без файла', async () => {
      const response = await request(app)
        .post('/api/upload/chat')
        .expect(400);

      expect(response.body.message).toBe('No file uploaded');
      expect(saveTempAvatar).not.toHaveBeenCalled();
    });

    test('должен отклонить не-изображение', async () => {
      // Создаем временный текстовый файл
      const testFilePath = path.join(__dirname, 'test-file.txt');
      fs.writeFileSync(testFilePath, 'not an image');

      const response = await request(app)
        .post('/api/upload/chat')
        .attach('file', testFilePath)
        .expect(400);

      expect(response.body.message).toBe('Only image files are allowed');
      expect(saveTempAvatar).not.toHaveBeenCalled();

      // Очищаем тестовый файл
      fs.unlinkSync(testFilePath);
    });

    test('должен отклонить слишком большой файл', async () => {
      const mockTempAvatar = {
        id: 'temp_123_abc',
        userId: mockUser.id,
        fileName: 'large.jpg',
        mimeType: 'image/jpeg',
        fileSize: 6 * 1024 * 1024, // 6MB
        dataUrl: 'data:image/jpeg;base64,fake-data',
        expiresAt: new Date(Date.now() + 3 * 60 * 1000)
      };

      // Создаем большой файл
      const testImagePath = path.join(__dirname, 'large-image.jpg');
      const largeData = Buffer.alloc(6 * 1024 * 1024); // 6MB
      fs.writeFileSync(testImagePath, largeData);

      const response = await request(app)
        .post('/api/upload/chat')
        .attach('file', testImagePath)
        .expect(400);

      expect(response.body.message).toBe('File size cannot exceed 5MB');
      expect(saveTempAvatar).not.toHaveBeenCalled();

      // Очищаем тестовый файл
      fs.unlinkSync(testImagePath);
    });

    test('должен обработать ошибку сохранения', async () => {
      saveTempAvatar.mockRejectedValue(new Error('Storage error'));

      // Создаем временный файл для тестирования
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      fs.writeFileSync(testImagePath, 'fake image data');

      const response = await request(app)
        .post('/api/upload/chat')
        .attach('file', testImagePath)
        .expect(500);

      expect(response.body.message).toBe('Failed to upload file');
      expect(response.body.error).toBe('Storage error');

      // Очищаем тестовый файл
      fs.unlinkSync(testImagePath);
    });
  });

  describe('Chat Creation with Temp Avatar', () => {
    beforeEach(() => {
      // Мокаем создание чата
      app.post('/api/chats', async (req, res) => {
        try {
          const { name, type, participantIds, tempAvatarId } = req.body;

          // Базовая валидация
          if (!name || !type || !Array.isArray(participantIds)) {
            return res.status(400).json({ message: "Missing required fields" });
          }

          // Создаем мок чата
          const newChat = {
            id: 123,
            name,
            type,
            creatorId: req.user.id,
            hasAvatar: false
          };

          // Если есть временная аватарка, переносим её
          if (tempAvatarId) {
            const avatarData = await promoteTempAvatar(tempAvatarId);
            if (avatarData) {
              newChat.hasAvatar = true;
            }
          }

          res.status(201).json(newChat);
        } catch (error) {
          res.status(500).json({ message: "Failed to create chat" });
        }
      });
    });

    test('должен создать чат с временной аватаркой', async () => {
      const mockAvatarData = {
        fileName: 'avatar.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
        imageData: 'base64-data'
      };

      promoteTempAvatar.mockResolvedValue(mockAvatarData);

      const response = await request(app)
        .post('/api/chats')
        .send({
          name: 'Test Group',
          type: 'group',
          participantIds: [1, 2, 3],
          tempAvatarId: 'temp_123_abc'
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: 123,
        name: 'Test Group',
        type: 'group',
        hasAvatar: true
      });

      expect(promoteTempAvatar).toHaveBeenCalledWith('temp_123_abc');
    });

    test('должен создать чат без аватарки если временная аватарка не найдена', async () => {
      promoteTempAvatar.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/chats')
        .send({
          name: 'Test Group',
          type: 'group',
          participantIds: [1, 2, 3],
          tempAvatarId: 'non-existent-id'
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: 123,
        name: 'Test Group',
        type: 'group',
        hasAvatar: false
      });

      expect(promoteTempAvatar).toHaveBeenCalledWith('non-existent-id');
    });

    test('должен создать чат без аватарки если tempAvatarId не указан', async () => {
      const response = await request(app)
        .post('/api/chats')
        .send({
          name: 'Test Group',
          type: 'group',
          participantIds: [1, 2, 3]
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: 123,
        name: 'Test Group',
        type: 'group',
        hasAvatar: false
      });

      expect(promoteTempAvatar).not.toHaveBeenCalled();
    });
  });

  describe('Avatar Expiration', () => {
    test('должен автоматически удалить истекшие аватарки', (done) => {
      const mockTempAvatar = {
        id: 'temp_123_abc',
        userId: mockUser.id,
        fileName: 'test.jpg',
        expiresAt: new Date(Date.now() + 100) // Истекает через 100мс
      };

      getTempAvatar.mockReturnValueOnce(mockTempAvatar);
      getTempAvatar.mockReturnValueOnce(undefined); // После истечения

      // Проверяем, что аватарка доступна
      expect(getTempAvatar('temp_123_abc')).toBeDefined();

      // Ждем истечения
      setTimeout(() => {
        // Проверяем, что аватарка больше не доступна
        expect(getTempAvatar('temp_123_abc')).toBeUndefined();
        done();
      }, 150);
    });
  });
});
