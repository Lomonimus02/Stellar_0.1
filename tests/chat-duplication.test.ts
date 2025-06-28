import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../server/index';
import { dbStorage } from '../server/db-storage';
import { ChatTypeEnum, UserRoleEnum } from '../shared/schema';

describe('Chat Duplication Prevention', () => {
  let user1Id: number;
  let user2Id: number;
  let schoolId: number;
  let agent1: request.SuperAgentTest;
  let agent2: request.SuperAgentTest;

  beforeEach(async () => {
    // Создаем тестовую школу
    const school = await dbStorage.createSchool({
      name: 'Test School',
      address: 'Test Address',
      city: 'Test City'
    });
    schoolId = school.id;

    // Создаем двух тестовых пользователей
    const user1 = await dbStorage.createUser({
      username: 'testuser1',
      password: 'hashedpassword1',
      firstName: 'Test',
      lastName: 'User1',
      email: 'test1@example.com',
      schoolId: schoolId,
      activeRole: UserRoleEnum.STUDENT
    });
    user1Id = user1.id;

    const user2 = await dbStorage.createUser({
      username: 'testuser2',
      password: 'hashedpassword2',
      firstName: 'Test',
      lastName: 'User2',
      email: 'test2@example.com',
      schoolId: schoolId,
      activeRole: UserRoleEnum.STUDENT
    });
    user2Id = user2.id;

    // Добавляем роли пользователям
    await dbStorage.addUserRole({
      userId: user1Id,
      role: UserRoleEnum.STUDENT,
      schoolId: schoolId
    });

    await dbStorage.addUserRole({
      userId: user2Id,
      role: UserRoleEnum.STUDENT,
      schoolId: schoolId
    });

    // Создаем агентов для аутентификации
    agent1 = request.agent(app);
    agent2 = request.agent(app);

    // Аутентифицируем пользователей
    await agent1
      .post('/api/login')
      .send({ username: 'testuser1', password: 'hashedpassword1' });

    await agent2
      .post('/api/login')
      .send({ username: 'testuser2', password: 'hashedpassword2' });
  });

  afterEach(async () => {
    // Очищаем тестовые данные
    if (user1Id) {
      await dbStorage.deleteUser(user1Id);
    }
    if (user2Id) {
      await dbStorage.deleteUser(user2Id);
    }
    if (schoolId) {
      await dbStorage.deleteSchool(schoolId);
    }
  });

  it('should create a private chat between two users successfully', async () => {
    const chatData = {
      name: 'Test User2',
      type: ChatTypeEnum.PRIVATE,
      participantIds: [user2Id],
      schoolId: schoolId
    };

    const response = await agent1
      .post('/api/chats')
      .send(chatData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.type).toBe(ChatTypeEnum.PRIVATE);
    expect(response.body.participants).toHaveLength(2);
  });

  it('should prevent creating duplicate private chat between same users', async () => {
    // Создаем первый чат
    const chatData = {
      name: 'Test User2',
      type: ChatTypeEnum.PRIVATE,
      participantIds: [user2Id],
      schoolId: schoolId
    };

    const firstResponse = await agent1
      .post('/api/chats')
      .send(chatData)
      .expect(201);

    const firstChatId = firstResponse.body.id;

    // Пытаемся создать второй чат между теми же пользователями
    const secondResponse = await agent1
      .post('/api/chats')
      .send(chatData)
      .expect(409);

    expect(secondResponse.body).toHaveProperty('message', 'Private chat between these users already exists');
    expect(secondResponse.body).toHaveProperty('existingChatId', firstChatId);
  });

  it('should prevent creating duplicate private chat from the other user', async () => {
    // Пользователь 1 создает чат с пользователем 2
    const chatData1 = {
      name: 'Test User2',
      type: ChatTypeEnum.PRIVATE,
      participantIds: [user2Id],
      schoolId: schoolId
    };

    const firstResponse = await agent1
      .post('/api/chats')
      .send(chatData1)
      .expect(201);

    const firstChatId = firstResponse.body.id;

    // Пользователь 2 пытается создать чат с пользователем 1
    const chatData2 = {
      name: 'Test User1',
      type: ChatTypeEnum.PRIVATE,
      participantIds: [user1Id],
      schoolId: schoolId
    };

    const secondResponse = await agent2
      .post('/api/chats')
      .send(chatData2)
      .expect(409);

    expect(secondResponse.body).toHaveProperty('message', 'Private chat between these users already exists');
    expect(secondResponse.body).toHaveProperty('existingChatId', firstChatId);
  });

  it('should allow creating private chats with different users', async () => {
    // Создаем третьего пользователя
    const user3 = await dbStorage.createUser({
      username: 'testuser3',
      password: 'hashedpassword3',
      firstName: 'Test',
      lastName: 'User3',
      email: 'test3@example.com',
      schoolId: schoolId,
      activeRole: UserRoleEnum.STUDENT
    });

    await dbStorage.addUserRole({
      userId: user3.id,
      role: UserRoleEnum.STUDENT,
      schoolId: schoolId
    });

    // Создаем чат между пользователем 1 и пользователем 2
    const chatData1 = {
      name: 'Test User2',
      type: ChatTypeEnum.PRIVATE,
      participantIds: [user2Id],
      schoolId: schoolId
    };

    await agent1
      .post('/api/chats')
      .send(chatData1)
      .expect(201);

    // Создаем чат между пользователем 1 и пользователем 3 (должно быть разрешено)
    const chatData2 = {
      name: 'Test User3',
      type: ChatTypeEnum.PRIVATE,
      participantIds: [user3.id],
      schoolId: schoolId
    };

    const response = await agent1
      .post('/api/chats')
      .send(chatData2)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.type).toBe(ChatTypeEnum.PRIVATE);

    // Очищаем тестового пользователя
    await dbStorage.deleteUser(user3.id);
  });

  it('should prevent user from creating private chat with themselves', async () => {
    const chatData = {
      name: 'Self Chat',
      type: ChatTypeEnum.PRIVATE,
      participantIds: [user1Id], // Пытается создать чат с самим собой
      schoolId: schoolId
    };

    const response = await agent1
      .post('/api/chats')
      .send(chatData)
      .expect(400);

    expect(response.body).toHaveProperty('message', 'Cannot create private chat with yourself');
  });

  it('should allow creating group chats without duplication restrictions', async () => {
    // Создаем первый групповой чат
    const groupChatData = {
      name: 'Test Group Chat',
      type: ChatTypeEnum.GROUP,
      participantIds: [user2Id],
      schoolId: schoolId
    };

    const firstResponse = await agent1
      .post('/api/chats')
      .send(groupChatData)
      .expect(201);

    expect(firstResponse.body.type).toBe(ChatTypeEnum.GROUP);

    // Создаем второй групповой чат с теми же участниками (должно быть разрешено)
    const secondGroupChatData = {
      name: 'Another Test Group Chat',
      type: ChatTypeEnum.GROUP,
      participantIds: [user2Id],
      schoolId: schoolId
    };

    const secondResponse = await agent1
      .post('/api/chats')
      .send(secondGroupChatData)
      .expect(201);

    expect(secondResponse.body.type).toBe(ChatTypeEnum.GROUP);
    expect(secondResponse.body.id).not.toBe(firstResponse.body.id);
  });

  describe('findPrivateChatBetweenUsers method', () => {
    it('should find existing private chat between two users', async () => {
      // Создаем чат
      const chat = await dbStorage.createChat({
        name: 'Test Private Chat',
        type: ChatTypeEnum.PRIVATE,
        creatorId: user1Id,
        schoolId: schoolId
      });

      // Добавляем участников
      await dbStorage.addChatParticipant({
        chatId: chat.id,
        userId: user1Id,
        isAdmin: true
      });

      await dbStorage.addChatParticipant({
        chatId: chat.id,
        userId: user2Id,
        isAdmin: false
      });

      // Ищем чат между пользователями
      const foundChat = await dbStorage.findPrivateChatBetweenUsers(user1Id, user2Id);

      expect(foundChat).toBeDefined();
      expect(foundChat?.id).toBe(chat.id);
      expect(foundChat?.type).toBe(ChatTypeEnum.PRIVATE);
    });

    it('should find private chat regardless of user order', async () => {
      // Создаем чат
      const chat = await dbStorage.createChat({
        name: 'Test Private Chat',
        type: ChatTypeEnum.PRIVATE,
        creatorId: user1Id,
        schoolId: schoolId
      });

      // Добавляем участников
      await dbStorage.addChatParticipant({
        chatId: chat.id,
        userId: user1Id,
        isAdmin: true
      });

      await dbStorage.addChatParticipant({
        chatId: chat.id,
        userId: user2Id,
        isAdmin: false
      });

      // Ищем чат в обратном порядке пользователей
      const foundChat = await dbStorage.findPrivateChatBetweenUsers(user2Id, user1Id);

      expect(foundChat).toBeDefined();
      expect(foundChat?.id).toBe(chat.id);
    });

    it('should return undefined when no private chat exists', async () => {
      const foundChat = await dbStorage.findPrivateChatBetweenUsers(user1Id, user2Id);
      expect(foundChat).toBeUndefined();
    });

    it('should not return group chats', async () => {
      // Создаем групповой чат
      const groupChat = await dbStorage.createChat({
        name: 'Test Group Chat',
        type: ChatTypeEnum.GROUP,
        creatorId: user1Id,
        schoolId: schoolId
      });

      // Добавляем участников
      await dbStorage.addChatParticipant({
        chatId: groupChat.id,
        userId: user1Id,
        isAdmin: true
      });

      await dbStorage.addChatParticipant({
        chatId: groupChat.id,
        userId: user2Id,
        isAdmin: false
      });

      // Ищем личный чат - не должен найти групповой
      const foundChat = await dbStorage.findPrivateChatBetweenUsers(user1Id, user2Id);
      expect(foundChat).toBeUndefined();
    });

    it('should not return chats with more than 2 participants', async () => {
      // Создаем третьего пользователя
      const user3 = await dbStorage.createUser({
        username: 'testuser3',
        password: 'hashedpassword3',
        firstName: 'Test',
        lastName: 'User3',
        email: 'test3@example.com',
        schoolId: schoolId,
        activeRole: UserRoleEnum.STUDENT
      });

      // Создаем личный чат (но с 3 участниками - некорректная ситуация)
      const chat = await dbStorage.createChat({
        name: 'Test Private Chat',
        type: ChatTypeEnum.PRIVATE,
        creatorId: user1Id,
        schoolId: schoolId
      });

      // Добавляем трех участников
      await dbStorage.addChatParticipant({
        chatId: chat.id,
        userId: user1Id,
        isAdmin: true
      });

      await dbStorage.addChatParticipant({
        chatId: chat.id,
        userId: user2Id,
        isAdmin: false
      });

      await dbStorage.addChatParticipant({
        chatId: chat.id,
        userId: user3.id,
        isAdmin: false
      });

      // Ищем чат между первыми двумя пользователями - не должен найти
      const foundChat = await dbStorage.findPrivateChatBetweenUsers(user1Id, user2Id);
      expect(foundChat).toBeUndefined();

      // Очищаем тестового пользователя
      await dbStorage.deleteUser(user3.id);
    });
  });
});
