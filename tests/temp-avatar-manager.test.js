const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { 
  initTempAvatarManager,
  saveTempAvatar,
  getTempAvatar,
  getUserTempAvatars,
  deleteTempAvatar,
  promoteTempAvatar,
  cleanupExpiredTempAvatars,
  getTempAvatarStats
} = require('../server/utils/temp-avatar-manager');

// Мокаем файловые операции для тестов
jest.mock('fs/promises');
jest.mock('fs');

describe('TempAvatarManager', () => {
  const mockUserId = 123;
  const mockFile = {
    originalname: 'test-avatar.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    path: '/tmp/uploaded-file.jpg'
  };

  beforeEach(() => {
    // Очищаем все моки перед каждым тестом
    jest.clearAllMocks();
    
    // Мокаем файловые операции
    fs.mkdir.mockResolvedValue();
    fs.copyFile.mockResolvedValue();
    fs.unlink.mockResolvedValue();
    fs.readFile.mockResolvedValue(Buffer.from('fake-image-data', 'base64'));
    
    fsSync.readFileSync.mockReturnValue('fake-image-data');
    fsSync.unlinkSync.mockReturnValue();
    fsSync.existsSync.mockReturnValue(true);
  });

  afterEach(() => {
    // Очищаем таймеры после каждого теста
    jest.clearAllTimers();
  });

  describe('initTempAvatarManager', () => {
    test('должен создать директорию для временных аватарок', async () => {
      await initTempAvatarManager();
      
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('temp-avatars'),
        { recursive: true }
      );
    });

    test('должен обработать ошибку создания директории', async () => {
      const error = new Error('Permission denied');
      fs.mkdir.mockRejectedValue(error);
      
      await expect(initTempAvatarManager()).rejects.toThrow('Permission denied');
    });
  });

  describe('saveTempAvatar', () => {
    test('должен сохранить временную аватарку', async () => {
      const tempAvatar = await saveTempAvatar(mockUserId, mockFile);
      
      expect(tempAvatar).toMatchObject({
        userId: mockUserId,
        fileName: mockFile.originalname,
        mimeType: mockFile.mimetype,
        fileSize: mockFile.size
      });
      
      expect(tempAvatar.id).toMatch(/^temp_\d+_[a-z0-9]+$/);
      expect(tempAvatar.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
      expect(tempAvatar.createdAt).toBeInstanceOf(Date);
      expect(tempAvatar.expiresAt).toBeInstanceOf(Date);
      
      // Проверяем, что файл был скопирован и оригинал удален
      expect(fs.copyFile).toHaveBeenCalled();
      expect(fsSync.unlinkSync).toHaveBeenCalledWith(mockFile.path);
    });

    test('должен обработать ошибку чтения файла', async () => {
      fsSync.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      await expect(saveTempAvatar(mockUserId, mockFile)).rejects.toThrow('File not found');
    });
  });

  describe('getTempAvatar', () => {
    test('должен вернуть временную аватарку по ID', async () => {
      const savedAvatar = await saveTempAvatar(mockUserId, mockFile);
      const retrievedAvatar = getTempAvatar(savedAvatar.id);
      
      expect(retrievedAvatar).toEqual(savedAvatar);
    });

    test('должен вернуть undefined для несуществующего ID', () => {
      const result = getTempAvatar('non-existent-id');
      expect(result).toBeUndefined();
    });

    test('должен удалить истекшую аватарку и вернуть undefined', async () => {
      // Создаем аватарку с истекшим временем
      const savedAvatar = await saveTempAvatar(mockUserId, mockFile);
      
      // Мокаем время так, чтобы аватарка истекла
      const originalDate = Date;
      const mockDate = new Date(savedAvatar.expiresAt.getTime() + 1000);
      global.Date = jest.fn(() => mockDate);
      global.Date.now = jest.fn(() => mockDate.getTime());
      
      const result = getTempAvatar(savedAvatar.id);
      
      expect(result).toBeUndefined();
      expect(fs.unlink).toHaveBeenCalled();
      
      // Восстанавливаем оригинальный Date
      global.Date = originalDate;
    });
  });

  describe('getUserTempAvatars', () => {
    test('должен вернуть все аватарки пользователя', async () => {
      const avatar1 = await saveTempAvatar(mockUserId, mockFile);
      const avatar2 = await saveTempAvatar(mockUserId, { ...mockFile, originalname: 'avatar2.jpg' });
      const avatar3 = await saveTempAvatar(456, mockFile); // другой пользователь
      
      const userAvatars = getUserTempAvatars(mockUserId);
      
      expect(userAvatars).toHaveLength(2);
      expect(userAvatars.map(a => a.id)).toContain(avatar1.id);
      expect(userAvatars.map(a => a.id)).toContain(avatar2.id);
      expect(userAvatars.map(a => a.id)).not.toContain(avatar3.id);
    });

    test('должен очистить истекшие аватарки пользователя', async () => {
      const savedAvatar = await saveTempAvatar(mockUserId, mockFile);
      
      // Мокаем время так, чтобы аватарка истекла
      const originalDate = Date;
      const mockDate = new Date(savedAvatar.expiresAt.getTime() + 1000);
      global.Date = jest.fn(() => mockDate);
      global.Date.now = jest.fn(() => mockDate.getTime());
      
      const userAvatars = getUserTempAvatars(mockUserId);
      
      expect(userAvatars).toHaveLength(0);
      expect(fs.unlink).toHaveBeenCalled();
      
      // Восстанавливаем оригинальный Date
      global.Date = originalDate;
    });
  });

  describe('deleteTempAvatar', () => {
    test('должен удалить временную аватарку', async () => {
      const savedAvatar = await saveTempAvatar(mockUserId, mockFile);
      
      const result = await deleteTempAvatar(savedAvatar.id);
      
      expect(result).toBe(true);
      expect(fs.unlink).toHaveBeenCalledWith(savedAvatar.filePath);
      
      // Проверяем, что аватарка больше не доступна
      const retrievedAvatar = getTempAvatar(savedAvatar.id);
      expect(retrievedAvatar).toBeUndefined();
    });

    test('должен вернуть false для несуществующей аватарки', async () => {
      const result = await deleteTempAvatar('non-existent-id');
      expect(result).toBe(false);
    });

    test('должен обработать ошибку удаления файла', async () => {
      const savedAvatar = await saveTempAvatar(mockUserId, mockFile);
      fs.unlink.mockRejectedValue(new Error('Permission denied'));
      
      const result = await deleteTempAvatar(savedAvatar.id);
      
      // Должен вернуть true даже если файл не удалился, но запись из памяти удалена
      expect(result).toBe(true);
      
      // Проверяем, что аватарка больше не доступна
      const retrievedAvatar = getTempAvatar(savedAvatar.id);
      expect(retrievedAvatar).toBeUndefined();
    });
  });

  describe('promoteTempAvatar', () => {
    test('должен переместить временную аватарку в постоянное хранилище', async () => {
      const savedAvatar = await saveTempAvatar(mockUserId, mockFile);
      
      const result = await promoteTempAvatar(savedAvatar.id);
      
      expect(result).toMatchObject({
        fileName: mockFile.originalname,
        mimeType: mockFile.mimetype,
        fileSize: mockFile.size,
        imageData: expect.any(String)
      });
      
      expect(fs.readFile).toHaveBeenCalledWith(savedAvatar.filePath, { encoding: 'base64' });
      expect(fs.unlink).toHaveBeenCalledWith(savedAvatar.filePath);
      
      // Проверяем, что временная аватарка удалена
      const retrievedAvatar = getTempAvatar(savedAvatar.id);
      expect(retrievedAvatar).toBeUndefined();
    });

    test('должен вернуть null для несуществующей аватарки', async () => {
      const result = await promoteTempAvatar('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('cleanupExpiredTempAvatars', () => {
    test('должен очистить истекшие аватарки', async () => {
      const avatar1 = await saveTempAvatar(mockUserId, mockFile);
      const avatar2 = await saveTempAvatar(456, mockFile);
      
      // Мокаем время так, чтобы аватарки истекли
      const originalDate = Date;
      const mockDate = new Date(Math.max(avatar1.expiresAt.getTime(), avatar2.expiresAt.getTime()) + 1000);
      global.Date = jest.fn(() => mockDate);
      global.Date.now = jest.fn(() => mockDate.getTime());
      
      const cleanedCount = await cleanupExpiredTempAvatars();
      
      expect(cleanedCount).toBe(2);
      expect(fs.unlink).toHaveBeenCalledTimes(2);
      
      // Восстанавливаем оригинальный Date
      global.Date = originalDate;
    });

    test('должен не трогать активные аватарки', async () => {
      await saveTempAvatar(mockUserId, mockFile);
      await saveTempAvatar(456, mockFile);
      
      const cleanedCount = await cleanupExpiredTempAvatars();
      
      expect(cleanedCount).toBe(0);
      expect(fs.unlink).not.toHaveBeenCalled();
    });
  });

  describe('getTempAvatarStats', () => {
    test('должен вернуть статистику временных аватарок', async () => {
      await saveTempAvatar(mockUserId, mockFile);
      await saveTempAvatar(456, mockFile);
      
      const stats = getTempAvatarStats();
      
      expect(stats).toMatchObject({
        total: 2,
        expired: 0,
        active: 2
      });
    });

    test('должен правильно подсчитать истекшие аватарки', async () => {
      const avatar1 = await saveTempAvatar(mockUserId, mockFile);
      await saveTempAvatar(456, mockFile);
      
      // Мокаем время так, чтобы одна аватарка истекла
      const originalDate = Date;
      const mockDate = new Date(avatar1.expiresAt.getTime() + 1000);
      global.Date = jest.fn(() => mockDate);
      global.Date.now = jest.fn(() => mockDate.getTime());
      
      const stats = getTempAvatarStats();
      
      expect(stats).toMatchObject({
        total: 2,
        expired: 1,
        active: 1
      });
      
      // Восстанавливаем оригинальный Date
      global.Date = originalDate;
    });
  });
});
