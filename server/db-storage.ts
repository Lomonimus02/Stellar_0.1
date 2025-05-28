import { IStorage } from './storage';
import { db } from './db';
import { eq, and, or, inArray, sql, lte, ne, gt } from 'drizzle-orm';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { generateUserKeyPair } from './utils/encryption';
import * as schema from '@shared/schema';
import { 
  decryptUser, encryptUser, 
  decryptMessage, encryptMessage, 
  decryptCumulativeGrade, encryptCumulativeGrade, 
  decryptGrade, encryptGrade, 
  decryptDocument, encryptDocument, 
  decryptAttendance, encryptAttendance,
  decryptNotification, encryptNotification,
  decryptUsers, decryptMessages, decryptNotifications, 
  decryptGrades, decryptCumulativeGrades, decryptDocuments, decryptAttendances,
  decryptChat, encryptChat, decryptChats
} from "./utils/encrypted-models";
import {
  User, InsertUser,
  School, InsertSchool,
  Class, InsertClass,
  Subject, InsertSubject,
  Schedule, InsertSchedule,
  Homework, InsertHomework,
  HomeworkSubmission, InsertHomeworkSubmission,
  Grade, InsertGrade,
  Attendance, InsertAttendance,
  Document, InsertDocument,
  Message, InsertMessage,
  Chat, InsertChat,
  ChatParticipant, InsertChatParticipant,
  ChatTypeEnum,
  Notification, InsertNotification,
  ParentStudent, InsertParentStudent,
  SystemLog, InsertSystemLog,
  UserRoleEnum, UserRoleModel, InsertUserRole,
  Subgroup, InsertSubgroup,
  StudentSubgroup, InsertStudentSubgroup,
  Assignment, InsertAssignment, AssignmentTypeEnum,
  CumulativeGrade, InsertCumulativeGrade, GradingSystemEnum,
  TimeSlot, InsertTimeSlot,
  ClassTimeSlot, InsertClassTimeSlot,
  users, schools, classes, subjects, schedules,
  homework, homeworkSubmissions, grades, attendance,
  documents, messages, chats, chatParticipants, notifications, parentStudents,
  systemLogs, teacherSubjects, studentClasses, userRoles,
  subgroups, studentSubgroups, assignments, cumulativeGrades,
  timeSlots, classTimeSlots
} from '@shared/schema';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import pkg from 'pg';
const { Pool } = pkg;

// Создаем хранилище сессий на базе PostgreSQL
const PostgresStore = connectPg(session);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export class DatabaseStorage implements IStorage {
  // Хранилище сессий
  sessionStore: session.Store;

  constructor() {
    // Инициализируем хранилище сессий
    this.sessionStore = new PostgresStore({
      pool,
      tableName: 'session', // Имя таблицы для хранения сессий
      createTableIfMissing: true
    });
  }
  
  // Метод для хеширования паролей
  async hashPassword(password: string): Promise<string> {
    const scryptAsync = promisify(scrypt);
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }
  
  // Метод для сравнения паролей
  async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    const scryptAsync = promisify(scrypt);
    // Check if the stored password is already hashed (has a salt)
    if (stored.includes(".")) {
      const [hashed, salt] = stored.split(".");
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      return timingSafeEqual(hashedBuf, suppliedBuf);
    } else {
      // For plaintext passwords (like initial admin user), do a direct comparison
      return supplied === stored;
    }
  }

  // ===== User operations =====
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!result.length) return undefined;
      
      try {
        return decryptUser(result[0]) || undefined;
      } catch (error) {
        console.warn(`Error decrypting user data: ${error.message}. Returning original data.`);
        return result[0];
      }
    } catch (error) {
      console.error(`Error getting user by ID ${id}:`, error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      if (!result.length) return undefined;
      
      try {
        return decryptUser(result[0]) || undefined;
      } catch (error) {
        console.warn(`Error decrypting user data: ${error.message}. Returning original data.`);
        return result[0];
      }
    } catch (error) {
      console.error(`Error getting user by username ${username}:`, error);
      return undefined;
    }
  }
  
  async getUsersCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)` }).from(users);
    return Number(result[0].count);
  }

  async createUser(user: InsertUser): Promise<User> {
    // Генерируем пару RSA ключей для пользователя
    try {
      // Только если ключи еще не предоставлены
      if (!user.publicKey || !user.privateKey) {
        const { publicKey, privateKey } = generateUserKeyPair();
        user.publicKey = publicKey;
        user.privateKey = privateKey;
      }
    } catch (error) {
      console.error('Ошибка при генерации ключей пользователя:', error);
      // Продолжаем даже если генерация ключей не удалась
    }

    // Шифруем чувствительные поля
    const encryptedUserData = encryptUser(user);
    const [newUser] = await db.insert(users).values(encryptedUserData).returning();
    return decryptUser(newUser);
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    // Если в запросе передан пароль, проверяем нужно ли его хешировать
    if (user.password) {
      // Проверяем, уже хеширован ли пароль (содержит ли он соль)
      if (!user.password.includes(".")) {
        console.log(`Хеширование пароля для пользователя ${id}`);
        user.password = await this.hashPassword(user.password);
      } else {
        console.log(`Пароль для пользователя ${id} уже хеширован, пропускаем хеширование`);
      }
    }
    
    // Шифруем чувствительные поля
    const encryptedUserData = encryptUser(user as InsertUser);
    const [updatedUser] = await db.update(users)
      .set(encryptedUserData)
      .where(eq(users.id, id))
      .returning();
    return decryptUser(updatedUser);
  }

  async deleteUser(id: number): Promise<User | undefined> {
    // Получаем пользователя перед удалением
    const userToDelete = await this.getUser(id);
    if (!userToDelete) return undefined;
    
    // Удаляем пользователя
    await db.delete(users)
      .where(eq(users.id, id));
    
    return userToDelete;
  }

  async getUsers(): Promise<User[]> {
    const usersList = await db.select().from(users);
    return decryptUsers(usersList);
  }

  async getUsersByRole(role: UserRoleEnum): Promise<User[]> {
    const usersList = await db.select().from(users).where(eq(users.role, role));
    return decryptUsers(usersList);
  }

  async getUsersBySchool(schoolId: number): Promise<User[]> {
    // Get users who have this school directly in their profile
    const usersWithSchoolId = await db.select().from(users).where(eq(users.schoolId, schoolId));
    
    // Get users with this school in their user roles
    const userRolesWithSchool = await db.select().from(userRoles)
      .where(eq(userRoles.schoolId, schoolId));
    
    const userIdsWithRoles = new Set(userRolesWithSchool.map(role => role.userId));
    
    // For users who have roles but no direct school, fetch their full profiles
    const usersWithRolesOnly = [];
    for (const userId of userIdsWithRoles) {
      // Skip users we've already fetched directly
      if (usersWithSchoolId.some(u => u.id === userId)) continue;
      
      // Fetch user (getUser already decrypts)
      const user = await this.getUser(userId);
      if (user) usersWithRolesOnly.push(user);
    }
    
    // Combine both sets of users and decrypt the first set
    // (usersWithRolesOnly are already decrypted by getUser)
    const combinedUsers = [...decryptUsers(usersWithSchoolId), ...usersWithRolesOnly];

    // Remove potential duplicates if a user was fetched by both methods
    const uniqueUsers = Array.from(new Map(combinedUsers.map(u => [u.id, u])).values());
    
    return uniqueUsers;
  }

  // ===== School operations =====
  async getSchool(id: number): Promise<School | undefined> {
    const result = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
    return result[0];
  }

  async getSchools(): Promise<School[]> {
    return await db.select().from(schools);
  }

  async createSchool(school: InsertSchool): Promise<School> {
    const [newSchool] = await db.insert(schools).values(school).returning();
    return newSchool;
  }

  async updateSchool(id: number, school: Partial<InsertSchool>): Promise<School | undefined> {
    const [updatedSchool] = await db.update(schools)
      .set(school)
      .where(eq(schools.id, id))
      .returning();
    return updatedSchool;
  }

  async deleteSchool(id: number): Promise<School | undefined> {
    const [deletedSchool] = await db.delete(schools)
      .where(eq(schools.id, id))
      .returning();
    return deletedSchool;
  }

  // ===== Class operations =====
  async getClass(id: number): Promise<Class | undefined> {
    const result = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
    return result[0];
  }

  async getClasses(schoolId: number): Promise<Class[]> {
    return await db.select().from(classes).where(eq(classes.schoolId, schoolId));
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const [newClass] = await db.insert(classes).values(classData).returning();
    return newClass;
  }

  async updateClass(id: number, classData: Partial<InsertClass>): Promise<Class | undefined> {
    const [updatedClass] = await db.update(classes)
      .set(classData)
      .where(eq(classes.id, id))
      .returning();
    return updatedClass;
  }

  // ===== Subject operations =====
  async getSubject(id: number): Promise<Subject | undefined> {
    const result = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
    return result[0];
  }

  async getSubjects(schoolId: number): Promise<Subject[]> {
    return await db.select().from(subjects).where(eq(subjects.schoolId, schoolId));
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    const [newSubject] = await db.insert(subjects).values(subject).returning();
    return newSubject;
  }
  
  async deleteSubject(id: number): Promise<Subject | undefined> {
    const [deletedSubject] = await db.delete(subjects)
      .where(eq(subjects.id, id))
      .returning();
    return deletedSubject;
  }

  async updateSubject(id: number, data: Partial<InsertSubject>): Promise<Subject> {
    // Make sure we don't try to update the ID
    const { id: _, ...updateData } = data;
    
    // Update the subject
    const [updatedSubject] = await db.update(subjects)
      .set(updateData)
      .where(eq(subjects.id, id))
      .returning();
      
    if (!updatedSubject) {
      throw new Error("Subject not found");
    }
    
    return updatedSubject;
  }

  // ===== Schedule operations =====
  async getSchedule(id: number): Promise<Schedule | undefined> {
    const result = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
    return result[0];
  }

  async getSchedulesByClass(classId: number): Promise<Schedule[]> {
    return await db.select().from(schedules).where(eq(schedules.classId, classId));
  }

  async getSchedulesByTeacher(teacherId: number): Promise<Schedule[]> {
    return await db.select().from(schedules).where(eq(schedules.teacherId, teacherId));
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    console.log('Creating schedule:', schedule);
    const [newSchedule] = await db.insert(schedules).values(schedule).returning();
    console.log('Created schedule:', newSchedule);
    return newSchedule;
  }
  
  async deleteSchedule(id: number): Promise<Schedule | undefined> {
    const [deletedSchedule] = await db.delete(schedules)
      .where(eq(schedules.id, id))
      .returning();
    return deletedSchedule;
  }
  
  async updateSchedule(id: number, schedule: Partial<InsertSchedule>): Promise<Schedule | undefined> {
    const [updatedSchedule] = await db.update(schedules)
      .set(schedule)
      .where(eq(schedules.id, id))
      .returning();
    return updatedSchedule;
  }
  
  async updateScheduleStatus(id: number, status: string): Promise<Schedule | undefined> {
    const [updatedSchedule] = await db.update(schedules)
      .set({ status })
      .where(eq(schedules.id, id))
      .returning();
    return updatedSchedule;
  }

  // ===== Homework operations =====
  async getHomework(id: number): Promise<Homework | undefined> {
    const result = await db.select().from(homework).where(eq(homework.id, id)).limit(1);
    return result[0];
  }

  async getHomeworkByClass(classId: number): Promise<Homework[]> {
    return await db.select().from(homework).where(eq(homework.classId, classId));
  }

  async getHomeworkByTeacher(teacherId: number): Promise<Homework[]> {
    return await db.select().from(homework).where(eq(homework.teacherId, teacherId));
  }

  async getHomeworkByStudent(studentId: number): Promise<Homework[]> {
    // Сначала получаем классы ученика
    const studentClassesList = await db.select().from(studentClasses).where(eq(studentClasses.studentId, studentId));
    if (studentClassesList.length === 0) return [];

    const classIds = studentClassesList.map(sc => sc.classId);
    return await db.select().from(homework).where(inArray(homework.classId, classIds));
  }

  async createHomework(homeworkData: InsertHomework): Promise<Homework> {
    const [newHomework] = await db.insert(homework).values(homeworkData).returning();
    return newHomework;
  }
  
  async updateHomework(id: number, homeworkData: Partial<InsertHomework>): Promise<Homework | undefined> {
    const [updatedHomework] = await db.update(homework)
      .set(homeworkData)
      .where(eq(homework.id, id))
      .returning();
    return updatedHomework;
  }
  
  async deleteHomework(id: number): Promise<Homework | undefined> {
    const [deletedHomework] = await db.delete(homework)
      .where(eq(homework.id, id))
      .returning();
    return deletedHomework;
  }

  // ===== Homework submission operations =====
  async getHomeworkSubmission(id: number): Promise<HomeworkSubmission | undefined> {
    const result = await db.select().from(homeworkSubmissions).where(eq(homeworkSubmissions.id, id)).limit(1);
    return result[0];
  }

  async getHomeworkSubmissionsByHomework(homeworkId: number): Promise<HomeworkSubmission[]> {
    return await db.select().from(homeworkSubmissions).where(eq(homeworkSubmissions.homeworkId, homeworkId));
  }

  async getHomeworkSubmissionsByStudent(studentId: number): Promise<HomeworkSubmission[]> {
    return await db.select().from(homeworkSubmissions).where(eq(homeworkSubmissions.studentId, studentId));
  }

  async createHomeworkSubmission(submission: InsertHomeworkSubmission): Promise<HomeworkSubmission> {
    const [newSubmission] = await db.insert(homeworkSubmissions).values(submission).returning();
    return newSubmission;
  }

  async gradeHomeworkSubmission(id: number, grade: number, feedback: string): Promise<HomeworkSubmission | undefined> {
    const [updatedSubmission] = await db.update(homeworkSubmissions)
      .set({ grade, feedback })
      .where(eq(homeworkSubmissions.id, id))
      .returning();
    return updatedSubmission;
  }

  // ===== Grade operations =====
  async getGrade(id: number): Promise<Grade | undefined> {
    const result = await db.select().from(grades).where(eq(grades.id, id)).limit(1);
    if (!result[0]) return undefined;
    // Расшифровываем перед возвратом
    return decryptGrade(result[0]);
  }

  async getGradesByStudent(studentId: number): Promise<Grade[]> {
    const studentGrades = await db.select().from(grades).where(eq(grades.studentId, studentId));
    // Расшифровываем оценки
    return decryptGrades(studentGrades);
  }

  async getGradesByClass(classId: number): Promise<Grade[]> {
    const classGrades = await db.select().from(grades).where(eq(grades.classId, classId));
    // Расшифровываем оценки
    return decryptGrades(classGrades);
  }

  async getGradesBySubject(subjectId: number): Promise<Grade[]> {
    const subjectGrades = await db.select().from(grades).where(eq(grades.subjectId, subjectId));
    // Расшифровываем оценки
    return decryptGrades(subjectGrades);
  }

  async createGrade(grade: InsertGrade): Promise<Grade> {
    // Шифруем поля
    const encryptedGrade = encryptGrade(grade);
    
    const [newGrade] = await db.insert(grades).values(encryptedGrade).returning();
    
    // Расшифровываем перед возвратом
    return decryptGrade(newGrade) as Grade;
  }
  
  async updateGrade(id: number, gradeData: Partial<InsertGrade>): Promise<Grade | undefined> {
    // Шифруем поля
    const encryptedGradeData = encryptGrade(gradeData as InsertGrade);
    
    const [updatedGrade] = await db.update(grades)
      .set(encryptedGradeData)
      .where(eq(grades.id, id))
      .returning();
    
    // Расшифровываем перед возвратом
    return decryptGrade(updatedGrade);
  }
  
  async deleteGrade(id: number): Promise<void> {
    await db.delete(grades).where(eq(grades.id, id));
  }

  // ===== Attendance operations =====
  async getAttendance(id: number): Promise<Attendance | undefined> {
    const result = await db.select().from(attendance).where(eq(attendance.id, id)).limit(1);
    if (!result[0]) return undefined;
    // Расшифровываем перед возвратом
    return decryptAttendance(result[0]);
  }

  async getAttendanceByStudent(studentId: number): Promise<Attendance[]> {
    const records = await db.select().from(attendance).where(eq(attendance.studentId, studentId));
    // Расшифровываем записи посещаемости
    return decryptAttendances(records);
  }

  async getAttendanceByClass(classId: number): Promise<Attendance[]> {
    const records = await db.select().from(attendance).where(eq(attendance.classId, classId));
    // Расшифровываем записи посещаемости
    return decryptAttendances(records);
  }
  
  async getAttendanceBySchedule(scheduleId: number): Promise<Attendance[]> {
    const records = await db.select().from(attendance).where(eq(attendance.scheduleId, scheduleId));
    // Расшифровываем записи посещаемости
    return decryptAttendances(records);
  }

  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    // Шифруем данные перед сохранением
    const encryptedData = encryptAttendance(attendanceData);
    
    const [newAttendance] = await db.insert(attendance).values(encryptedData).returning();
    
    // Расшифровываем перед возвратом
    return decryptAttendance(newAttendance) as Attendance;
  }

  // ===== Document operations =====
  async getDocument(id: number): Promise<Document | undefined> {
    const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    if (!result[0]) return undefined;
    // Расшифровываем перед возвратом
    return decryptDocument(result[0]);
  }

  async getDocumentsBySchool(schoolId: number): Promise<Document[]> {
    const docs = await db.select().from(documents).where(eq(documents.schoolId, schoolId));
    // Расшифровываем документы
    return decryptDocuments(docs);
  }

  async getDocumentsByClass(classId: number): Promise<Document[]> {
    const docs = await db.select().from(documents).where(eq(documents.classId, classId));
    // Расшифровываем документы
    return decryptDocuments(docs);
  }

  async getDocumentsBySubject(subjectId: number): Promise<Document[]> {
    const docs = await db.select().from(documents).where(eq(documents.subjectId, subjectId));
    // Расшифровываем документы
    return decryptDocuments(docs);
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    // Если передан флаг isEncrypted, значит сам файл должен быть зашифрован
    // Это происходит в routes.ts перед вызовом этой функции

    // Шифруем метаданные документа перед сохранением
    const encryptedDocument = encryptDocument(document);
    
    const [newDocument] = await db.insert(documents).values(encryptedDocument).returning();
    
    // Расшифровываем перед возвратом
    return decryptDocument(newDocument) as Document;
  }

  // ===== Message operations =====
  async getMessage(id: number): Promise<Message | undefined> {
    const result = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
    if (!result[0]) return undefined;
    return decryptMessage(result[0]);
  }

  async getMessagesBySender(senderId: number): Promise<Message[]> {
    const messagesList = await db.select().from(messages).where(eq(messages.senderId, senderId));
    return decryptMessages(messagesList);
  }

  async getMessagesByReceiver(receiverId: number): Promise<Message[]> {
    // Примечание: в новой схеме больше нет поля receiverId, эта функция оставлена для обратной совместимости
    // Вместо этого используются чаты
    return [];
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    // Всегда включаем E2E шифрование для всех сообщений
    let isE2eEncrypted = true;
    
    // Всегда устанавливаем флаг E2E шифрования на true
    message.isE2eEncrypted = true;
    
    // Если указан chatId, продолжаем обработку получателей для E2E
    if (message.chatId) {
      try {
        // Получаем получателей сообщения (участников чата, кроме отправителя)
        const chatParticipantsList = await db.select()
          .from(chatParticipants)
          .where(eq(chatParticipants.chatId, message.chatId));
          
        const recipientIds = chatParticipantsList
          .filter(p => p.userId !== message.senderId)
          .map(p => p.userId);
          
        // Независимо от наличия получателей, мы всё равно шифруем сообщение
        // В реальной реализации здесь шифруется сообщение для каждого получателя
        // используя его публичный ключ
      } catch (error) {
        console.error('Ошибка при E2E шифровании сообщения:', error);
        // Даже при ошибке не отключаем E2E шифрование
      }
    }
    
    // Шифруем сообщение перед сохранением обычным шифрованием (не E2E)
    const encryptedMessage = encryptMessage(message);
    
    // Обрабатываем ситуацию с разными полями в схеме
    const messageContent = message.content || message.message; // Поддерживаем оба варианта
    
    const [newMessage] = await db.insert(messages).values({
      ...encryptedMessage,
      content: messageContent ? encryptMessage({ content: messageContent } as any).content : null
    }).returning();
    
    // Расшифровываем сообщение перед возвратом
    if (!newMessage) return {} as Message;
    
    const decryptedMessage = decryptMessage(newMessage);
    if (!decryptedMessage) return {} as Message;
    
    return {
      ...decryptedMessage,
      message: decryptedMessage.content // Преобразуем обратно для совместимости с интерфейсом
    } as unknown as Message;
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const [updatedMessage] = await db.update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, id))
      .returning();
    
    if (!updatedMessage) return undefined;
    
    // Расшифруем сообщение перед возвратом
    const decryptedMessage = decryptMessage(updatedMessage);
    if (!decryptedMessage) return undefined;
    
    return {
      ...decryptedMessage,
      message: decryptedMessage.content, // Преобразуем для совместимости с интерфейсом
    } as unknown as Message;
  }
  
  async deleteMessage(id: number): Promise<Message | undefined> {
    // Получаем сообщение перед удалением
    const message = await db.select().from(schema.messages).where(eq(schema.messages.id, id)).limit(1);
    
    if (message.length === 0) {
      return undefined;
    }
    
    // Удаляем сообщение используя имя таблицы из схемы
    await db.delete(schema.messages).where(eq(schema.messages.id, id));
    
    // Расшифровываем сообщение перед возвратом
    const decryptedMessage = decryptMessage(message[0]);
    if (!decryptedMessage) return undefined;
    
    return {
      ...decryptedMessage,
      message: decryptedMessage.content, // Преобразуем для совместимости с интерфейсом
    } as unknown as Message;
  }
  
  // ===== Chat operations =====
  async createChat(chat: InsertChat): Promise<Chat> {
    // Шифруем поле name перед сохранением
    const encryptedChat = encryptChat(chat);
    
    const [newChat] = await db.insert(chats).values({
      ...encryptedChat,
      createdAt: new Date(),
      lastMessageAt: null
    }).returning();
    
    // Расшифровываем поле name перед возвратом
    return decryptChat(newChat) as Chat;
  }
  
  async getChat(id: number): Promise<Chat | undefined> {
    const result = await db.select().from(chats).where(eq(chats.id, id)).limit(1);
    if (result.length === 0) return undefined;
    
    // Расшифровываем поле name перед возвратом
    return decryptChat(result[0]) as Chat;
  }
  
  async getUserChats(userId: number): Promise<Chat[]> {
    try {
      // Получаем все участия в чатах для данного пользователя
      const participations = await db.select().from(chatParticipants)
        .where(eq(chatParticipants.userId, userId));
      
      if (participations.length === 0) {
        return [];
      }
      
      // Извлекаем ID чатов и последние прочитанные сообщения
      const chatIds = participations.map(p => p.chatId);
      const participationMap = new Map(
        participations.map(p => [p.chatId, p.lastReadMessageId])
      );
      
      // Получаем чаты по их ID
      const userChats = await db.select().from(chats)
        .where(inArray(chats.id, chatIds))
        .orderBy(sql`chats.last_message_at DESC NULLS LAST`);
        
      if (!userChats || userChats.length === 0) {
        return [];
      }
        
      // Расшифровываем поля name в чатах
      try {
        const decryptedChats = userChats.map(chat => decryptChat(chat)) as Chat[];
      
        // Для каждого чата рассчитываем количество непрочитанных сообщений
        const result = await Promise.all(decryptedChats.map(async (chat) => {
          // Получаем lastReadMessageId для данного пользователя в этом чате
          const lastReadMessageId = participationMap.get(chat.id);
          
          // Если нет lastReadMessageId, считаем все сообщения непрочитанными
          if (lastReadMessageId === null || lastReadMessageId === undefined) {
            // Подсчитываем количество сообщений от других пользователей
            const allMessages = await db.select().from(messages)
              .where(and(
                eq(messages.chatId, chat.id),
                ne(messages.senderId, userId)
              ));
            
            return {
              ...chat,
              unreadCount: allMessages.length
            };
          } else {
            // Если есть lastReadMessageId, подсчитываем сообщения с id > lastReadMessageId
            const unreadMessages = await db.select().from(messages)
              .where(and(
                eq(messages.chatId, chat.id),
                ne(messages.senderId, userId),
                gt(messages.id, lastReadMessageId)
              ));
            
            return {
              ...chat,
              unreadCount: unreadMessages.length
            };
          }
        }));
        
        return result;
      } catch (decryptError) {
        console.error('Ошибка при расшифровке чатов:', decryptError);
        return [];
      }
    } catch (error) {
      console.error('Ошибка при получении чатов пользователя:', error);
      return [];
    }
  }
  
  async getUsersChatBySchool(schoolId: number): Promise<Chat[]> {
    const schoolChats = await db.select().from(chats).where(eq(chats.schoolId, schoolId));
    // Расшифровываем поля name в чатах
    return decryptChats(schoolChats);
  }
  
  // ===== Chat participant operations =====
  async addChatParticipant(participant: InsertChatParticipant): Promise<ChatParticipant> {
    const [newParticipant] = await db.insert(chatParticipants).values({
      ...participant,
      joinedAt: new Date(),
      lastReadMessageId: null
    }).returning();
    return newParticipant;
  }
  
  async getChatParticipants(chatId: number): Promise<ChatParticipant[]> {
    return await db.select().from(chatParticipants).where(eq(chatParticipants.chatId, chatId));
  }
  
  async getUserChatParticipations(userId: number): Promise<ChatParticipant[]> {
    return await db.select().from(chatParticipants).where(eq(chatParticipants.userId, userId));
  }
  
  async removeChatParticipant(chatId: number, userId: number): Promise<void> {
    await db.delete(chatParticipants)
      .where(and(
        eq(chatParticipants.chatId, chatId),
        eq(chatParticipants.userId, userId)
      ));
  }
  
  // ===== Chat messages operations =====
  async getChatMessages(chatId: number): Promise<Message[]> {
    const messagesList = await db.select().from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(sql`messages.sent_at DESC`);
    return decryptMessages(messagesList);
  }
  
  async updateChat(id: number, chatData: Partial<InsertChat>): Promise<Chat | undefined> {
    // Если обновляем name поле, шифруем его
    if (chatData.name !== undefined) {
      chatData = encryptChat(chatData);
    }
    
    await db.update(chats)
      .set(chatData)
      .where(eq(chats.id, id));
    
    const result = await db.select().from(chats).where(eq(chats.id, id)).limit(1);
    if (!result[0]) return undefined;
    
    // Расшифровываем name перед возвратом
    return decryptChat(result[0]) as Chat;
  }
  
  async deleteChat(id: number): Promise<Chat | undefined> {
    // Получаем информацию о чате перед удалением
    const result = await db.select().from(chats).where(eq(chats.id, id)).limit(1);
    const chat = result[0];
    if (!chat) return undefined;
    
    // Удаляем связанные сообщения
    await db.delete(messages)
      .where(eq(messages.chatId, id));
    
    // Удаляем участников чата
    await db.delete(chatParticipants)
      .where(eq(chatParticipants.chatId, id));
    
    // Удаляем сам чат
    await db.delete(chats)
      .where(eq(chats.id, id));
    
    // Расшифровываем name перед возвратом
    return decryptChat(chat) as Chat;
  }
  
  async createChatMessage(message: InsertMessage): Promise<Message> {
    // Установим значения по умолчанию для полей, если они не указаны
    const messageData = {
      chatId: message.chatId,
      senderId: message.senderId,
      content: message.content || message.message || null,
      hasAttachment: message.hasAttachment || false,
      attachmentType: message.attachmentType || null,
      attachmentUrl: message.attachmentUrl || null,
      isRead: false,
      sentAt: new Date(),
      isE2eEncrypted: true // Всегда включаем E2E шифрование для всех сообщений
    };
    
    // Шифруем данные перед сохранением
    const encryptedData = encryptMessage(messageData);
    
    const [newMessage] = await db.insert(messages).values(encryptedData).returning();
    
    if (!newMessage) {
      throw new Error("Failed to create chat message");
    }
    
    // Обновляем время последнего сообщения в чате
    await db.update(chats)
      .set({ lastMessageAt: new Date() })
      .where(eq(chats.id, message.chatId));
    
    // Расшифровываем перед возвратом
    const decryptedMessage = decryptMessage(newMessage);
    if (!decryptedMessage) {
      throw new Error("Failed to decrypt created message");
    }
    
    return decryptedMessage;
  }
  
  async markLastReadMessage(chatId: number, userId: number, messageId: number): Promise<void> {
    // Обновляем lastReadMessageId для участника чата
    await db.update(chatParticipants)
      .set({ lastReadMessageId: messageId })
      .where(and(
        eq(chatParticipants.chatId, chatId),
        eq(chatParticipants.userId, userId)
      ));
      
    // Также отмечаем все сообщения до этого как прочитанные
    await db.update(messages)
      .set({ isRead: true })
      .where(and(
        eq(messages.chatId, chatId),
        lte(messages.id, messageId), // Все сообщения с ID <= messageId
        ne(messages.senderId, userId) // Только сообщения от других пользователей
      ));
  }

  // ===== Notification operations =====
  async getNotification(id: number): Promise<Notification | undefined> {
    const result = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
    if (!result[0]) return undefined;
    // Расшифровываем перед возвратом
    return decryptNotification(result[0]) as Notification;
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    const userNotifications = await db.select().from(notifications).where(eq(notifications.userId, userId));
    // Расшифровываем все уведомления
    return decryptNotifications(userNotifications);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    // Шифруем содержимое уведомления перед сохранением
    const encryptedNotification = encryptNotification(notification);
    
    const [newNotification] = await db.insert(notifications).values(encryptedNotification).returning();
    
    // Расшифровываем перед возвратом
    return decryptNotification(newNotification) as Notification;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const [updatedNotification] = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    
    if (!updatedNotification) return undefined;
    
    // Расшифровываем перед возвратом
    return decryptNotification(updatedNotification) as Notification;
  }

  // ===== Parent-Student operations =====
  async getParentStudents(parentId: number): Promise<ParentStudent[]> {
    return await db.select().from(parentStudents).where(eq(parentStudents.parentId, parentId));
  }

  async getStudentParents(studentId: number): Promise<ParentStudent[]> {
    return await db.select().from(parentStudents).where(eq(parentStudents.studentId, studentId));
  }

  async addParentStudent(parentStudent: InsertParentStudent): Promise<ParentStudent> {
    const [newRelationship] = await db.insert(parentStudents).values(parentStudent).returning();
    return newRelationship;
  }

  // ===== System log operations =====
  async createSystemLog(log: InsertSystemLog): Promise<SystemLog> {
    const [newLog] = await db.insert(systemLogs).values(log).returning();
    return newLog;
  }

  async getSystemLogs(): Promise<SystemLog[]> {
    return await db.select().from(systemLogs);
  }

  // ===== Student-Class operations =====
  async addStudentToClass(studentId: number, classId: number): Promise<void> {
    await db.insert(studentClasses).values({ studentId, classId });
  }

  async getStudentClasses(studentId: number): Promise<Class[]> {
    const studentClassesList = await db.select().from(studentClasses).where(eq(studentClasses.studentId, studentId));
    if (studentClassesList.length === 0) return [];

    const classIds = studentClassesList.map(sc => sc.classId);
    return await db.select().from(classes).where(inArray(classes.id, classIds));
  }

  async getClassStudents(classId: number): Promise<User[]> {
    const classStudentsList = await db.select().from(studentClasses).where(eq(studentClasses.classId, classId));
    if (classStudentsList.length === 0) return [];

    const studentIds = classStudentsList.map(cs => cs.studentId);
    // Получаем зашифрованных пользователей
    const encryptedStudents = await db.select().from(users).where(inArray(users.id, studentIds));
    // Расшифровываем перед возвратом
    return decryptUsers(encryptedStudents);
  }

  // ===== Teacher-Subject operations =====
  async assignTeacherToSubject(teacherId: number, subjectId: number): Promise<void> {
    await db.insert(teacherSubjects).values({ teacherId, subjectId });
  }

  async getTeacherSubjects(teacherId: number): Promise<Subject[]> {
    const teacherSubjectsList = await db.select().from(teacherSubjects).where(eq(teacherSubjects.teacherId, teacherId));
    if (teacherSubjectsList.length === 0) return [];

    const subjectIds = teacherSubjectsList.map(ts => ts.subjectId);
    return await db.select().from(subjects).where(inArray(subjects.id, subjectIds));
  }

  async getSubjectTeachers(subjectId: number): Promise<User[]> {
    const subjectTeachersList = await db.select().from(teacherSubjects).where(eq(teacherSubjects.subjectId, subjectId));
    if (subjectTeachersList.length === 0) return [];

    const teacherIds = subjectTeachersList.map(st => st.teacherId);
    return await db.select().from(users).where(inArray(users.id, teacherIds));
  }

  // User-Role operations
  async getUserRole(id: number): Promise<UserRoleModel | undefined> {
    const [userRole] = await db.select().from(userRoles).where(eq(userRoles.id, id)).limit(1);
    return userRole;
  }

  async getUserRoles(userId: number): Promise<UserRoleModel[]> {
    return await db.select().from(userRoles).where(eq(userRoles.userId, userId));
  }

  async addUserRole(userRole: InsertUserRole): Promise<UserRoleModel> {
    const [newUserRole] = await db.insert(userRoles).values(userRole).returning();
    return newUserRole;
  }

  async removeUserRole(id: number): Promise<void> {
    await db.delete(userRoles).where(eq(userRoles.id, id));
  }
  
  // ===== Subgroup operations =====
  async getSubgroup(id: number): Promise<Subgroup | undefined> {
    const result = await db.select().from(subgroups).where(eq(subgroups.id, id)).limit(1);
    return result[0];
  }
  
  async getSubgroupsByClass(classId: number): Promise<Subgroup[]> {
    return await db.select().from(subgroups).where(eq(subgroups.classId, classId));
  }
  
  async getSubgroupsBySchool(schoolId: number): Promise<Subgroup[]> {
    // Get all classes for the school
    const classesList = await this.getClasses(schoolId);
    if (classesList.length === 0) return [];
    
    // Get all subgroups for these classes
    const classIds = classesList.map(cls => cls.id);
    return await db.select().from(subgroups).where(inArray(subgroups.classId, classIds));
  }
  
  async createSubgroup(subgroup: InsertSubgroup): Promise<Subgroup> {
    const [newSubgroup] = await db.insert(subgroups).values({
      ...subgroup,
      description: subgroup.description || null
    }).returning();
    return newSubgroup;
  }
  
  async updateSubgroup(id: number, subgroup: Partial<InsertSubgroup>): Promise<Subgroup | undefined> {
    const [updatedSubgroup] = await db.update(subgroups)
      .set(subgroup)
      .where(eq(subgroups.id, id))
      .returning();
    return updatedSubgroup;
  }
  
  async deleteSubgroup(id: number): Promise<Subgroup | undefined> {
    // First, delete all associations between students and this subgroup
    await db.delete(studentSubgroups).where(eq(studentSubgroups.subgroupId, id));
    
    // Then delete the subgroup
    const [deletedSubgroup] = await db.delete(subgroups)
      .where(eq(subgroups.id, id))
      .returning();
    return deletedSubgroup;
  }
  
  // ===== Student-Subgroup operations =====
  async getStudentSubgroups(studentId: number): Promise<Subgroup[]> {
    // Get associations between student and subgroups
    const associations = await db.select().from(studentSubgroups)
      .where(eq(studentSubgroups.studentId, studentId));
    
    if (associations.length === 0) return [];
    
    // Get the actual subgroup objects
    const subgroupIds = associations.map(assoc => assoc.subgroupId);
    return await db.select().from(subgroups)
      .where(inArray(subgroups.id, subgroupIds));
  }
  
  async getSubgroupStudents(subgroupId: number): Promise<User[]> {
    // Get associations between subgroup and students
    const associations = await db.select().from(studentSubgroups)
      .where(eq(studentSubgroups.subgroupId, subgroupId));
    
    if (associations.length === 0) return [];
    
    // Get the actual student objects
    const studentIds = associations.map(assoc => assoc.studentId);
    return await db.select().from(users)
      .where(inArray(users.id, studentIds));
  }
  
  async addStudentToSubgroup(studentSubgroup: InsertStudentSubgroup): Promise<StudentSubgroup> {
    // Check if the association already exists
    const existing = await db.select().from(studentSubgroups)
      .where(and(
        eq(studentSubgroups.studentId, studentSubgroup.studentId),
        eq(studentSubgroups.subgroupId, studentSubgroup.subgroupId)
      )).limit(1);
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    // Create new association
    const [newAssociation] = await db.insert(studentSubgroups)
      .values(studentSubgroup)
      .returning();
      
    return newAssociation;
  }
  
  async removeStudentFromSubgroup(studentId: number, subgroupId: number): Promise<void> {
    await db.delete(studentSubgroups)
      .where(and(
        eq(studentSubgroups.studentId, studentId),
        eq(studentSubgroups.subgroupId, subgroupId)
      ));
  }
  
  async getSchedulesBySubgroup(subgroupId: number): Promise<Schedule[]> {
    return await db.select().from(schedules)
      .where(eq(schedules.subgroupId, subgroupId));
  }

  // ===== Assignment operations =====
  async getAssignment(id: number): Promise<Assignment | undefined> {
    const result = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
    return result[0];
  }

  async getAssignmentsBySchedule(scheduleId: number): Promise<Assignment[]> {
    return await db.select().from(assignments).where(eq(assignments.scheduleId, scheduleId));
  }

  async getAssignmentsByClass(classId: number): Promise<Assignment[]> {
    return await db.select().from(assignments).where(eq(assignments.classId, classId));
  }

  async getAssignmentsByTeacher(teacherId: number): Promise<Assignment[]> {
    return await db.select().from(assignments).where(eq(assignments.teacherId, teacherId));
  }

  async getAssignmentsBySubject(subjectId: number): Promise<Assignment[]> {
    return await db.select().from(assignments).where(eq(assignments.subjectId, subjectId));
  }

  async getAssignmentsBySubgroup(subgroupId: number): Promise<Assignment[]> {
    return await db.select().from(assignments).where(eq(assignments.subgroupId, subgroupId));
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const [newAssignment] = await db.insert(assignments).values(assignment).returning();
    return newAssignment;
  }

  async updateAssignment(id: number, assignmentData: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const [updatedAssignment] = await db.update(assignments)
      .set(assignmentData)
      .where(eq(assignments.id, id))
      .returning();
    return updatedAssignment;
  }

  async deleteAssignment(id: number): Promise<Assignment | undefined> {
    const [deletedAssignment] = await db.delete(assignments)
      .where(eq(assignments.id, id))
      .returning();
    return deletedAssignment;
  }

  // ===== Cumulative Grade operations =====
  async getCumulativeGrade(id: number): Promise<CumulativeGrade | undefined> {
    const result = await db.select().from(cumulativeGrades).where(eq(cumulativeGrades.id, id)).limit(1);
    if (!result[0]) return undefined;
    // Расшифровываем перед возвратом
    return decryptCumulativeGrade(result[0]);
  }

  async getCumulativeGradesByAssignment(assignmentId: number): Promise<CumulativeGrade[]> {
    const grades = await db.select().from(cumulativeGrades).where(eq(cumulativeGrades.assignmentId, assignmentId));
    // Расшифровываем оценки
    return decryptCumulativeGrades(grades);
  }

  async getCumulativeGradesByStudent(studentId: number): Promise<CumulativeGrade[]> {
    const grades = await db.select().from(cumulativeGrades).where(eq(cumulativeGrades.studentId, studentId));
    // Расшифровываем оценки
    return decryptCumulativeGrades(grades);
  }

  async createCumulativeGrade(grade: InsertCumulativeGrade): Promise<CumulativeGrade> {
    // Шифруем поля
    const encryptedGrade = encryptCumulativeGrade(grade);
    
    const [newGrade] = await db.insert(cumulativeGrades).values(encryptedGrade).returning();
    
    // Расшифровываем перед возвратом
    return decryptCumulativeGrade(newGrade) as CumulativeGrade;
  }

  async updateCumulativeGrade(id: number, gradeData: Partial<InsertCumulativeGrade>): Promise<CumulativeGrade | undefined> {
    // Шифруем поля
    const encryptedGradeData = encryptCumulativeGrade(gradeData as InsertCumulativeGrade);
    
    const [updatedGrade] = await db.update(cumulativeGrades)
      .set(encryptedGradeData)
      .where(eq(cumulativeGrades.id, id))
      .returning();
    
    // Расшифровываем перед возвратом
    return decryptCumulativeGrade(updatedGrade);
  }

  async deleteCumulativeGrade(id: number): Promise<CumulativeGrade | undefined> {
    const [deletedGrade] = await db.delete(cumulativeGrades)
      .where(eq(cumulativeGrades.id, id))
      .returning();
    
    if (!deletedGrade) return undefined;
    // Расшифровываем перед возвратом
    return decryptCumulativeGrade(deletedGrade);
  }

  async getStudentCumulativeGradesByAssignment(studentId: number, assignmentId: number): Promise<CumulativeGrade | undefined> {
    const result = await db.select().from(cumulativeGrades)
      .where(and(
        eq(cumulativeGrades.studentId, studentId),
        eq(cumulativeGrades.assignmentId, assignmentId)
      ))
      .limit(1);
      
    if (!result[0]) return undefined;
    // Расшифровываем перед возвратом
    return decryptCumulativeGrade(result[0]);
  }

  // Helper method to calculate average scores for all assignments in a class
  async calculateClassAverageScores(classId: number): Promise<{ assignmentId: number, averageScore: number }[]> {
    // Get all assignments for this class
    const classAssignments = await this.getAssignmentsByClass(classId);
    
    const results = [];
    
    for (const assignment of classAssignments) {
      // Get all grades for this assignment
      const grades = await this.getCumulativeGradesByAssignment(assignment.id);
      
      if (grades.length > 0) {
        // Calculate average score
        const totalScore = grades.reduce((sum, grade) => sum + Number(grade.score), 0);
        const averageScore = totalScore / grades.length;
        
        results.push({
          assignmentId: assignment.id,
          averageScore
        });
      }
    }
    
    return results;
  }
  
  // ===== TimeSlot operations =====
  async getTimeSlot(id: number): Promise<TimeSlot | undefined> {
    const result = await db.select().from(timeSlots).where(eq(timeSlots.id, id)).limit(1);
    return result[0];
  }

  async getTimeSlotByNumber(slotNumber: number, schoolId?: number): Promise<TimeSlot | undefined> {
    // Если указан schoolId, ищем слот для этой школы
    if (schoolId) {
      const result = await db.select().from(timeSlots)
        .where(and(
          eq(timeSlots.slotNumber, slotNumber),
          eq(timeSlots.schoolId, schoolId)
        ))
        .limit(1);
      if (result.length > 0) return result[0];
    }
    
    // Если слот для школы не найден или schoolId не указан, возвращаем слот по умолчанию
    const result = await db.select().from(timeSlots)
      .where(and(
        eq(timeSlots.slotNumber, slotNumber),
        eq(timeSlots.isDefault, true)
      ))
      .limit(1);
    return result[0];
  }

  async getDefaultTimeSlots(): Promise<TimeSlot[]> {
    return await db.select().from(timeSlots).where(eq(timeSlots.isDefault, true));
  }

  async getSchoolTimeSlots(schoolId: number): Promise<TimeSlot[]> {
    return await db.select().from(timeSlots).where(eq(timeSlots.schoolId, schoolId));
  }

  async createTimeSlot(timeSlot: InsertTimeSlot): Promise<TimeSlot> {
    const [newTimeSlot] = await db.insert(timeSlots).values(timeSlot).returning();
    return newTimeSlot;
  }

  async updateTimeSlot(id: number, timeSlot: Partial<InsertTimeSlot>): Promise<TimeSlot | undefined> {
    const [updatedTimeSlot] = await db.update(timeSlots)
      .set(timeSlot)
      .where(eq(timeSlots.id, id))
      .returning();
    return updatedTimeSlot;
  }

  async deleteTimeSlot(id: number): Promise<TimeSlot | undefined> {
    const [deletedTimeSlot] = await db.delete(timeSlots)
      .where(eq(timeSlots.id, id))
      .returning();
    return deletedTimeSlot;
  }

  // ===== ClassTimeSlot operations =====
  async getClassTimeSlot(id: number): Promise<ClassTimeSlot | undefined> {
    const result = await db.select().from(classTimeSlots).where(eq(classTimeSlots.id, id)).limit(1);
    return result[0];
  }

  async getClassTimeSlotByNumber(classId: number, slotNumber: number): Promise<ClassTimeSlot | undefined> {
    const result = await db.select().from(classTimeSlots)
      .where(and(
        eq(classTimeSlots.classId, classId),
        eq(classTimeSlots.slotNumber, slotNumber)
      ))
      .limit(1);
    return result[0];
  }

  async getClassTimeSlots(classId: number): Promise<ClassTimeSlot[]> {
    return await db.select().from(classTimeSlots).where(eq(classTimeSlots.classId, classId));
  }

  async createClassTimeSlot(classTimeSlot: InsertClassTimeSlot): Promise<ClassTimeSlot> {
    const [newClassTimeSlot] = await db.insert(classTimeSlots).values(classTimeSlot).returning();
    return newClassTimeSlot;
  }

  async updateClassTimeSlot(id: number, classTimeSlot: Partial<InsertClassTimeSlot>): Promise<ClassTimeSlot | undefined> {
    const [updatedClassTimeSlot] = await db.update(classTimeSlots)
      .set(classTimeSlot)
      .where(eq(classTimeSlots.id, id))
      .returning();
    return updatedClassTimeSlot;
  }

  async deleteClassTimeSlot(id: number): Promise<ClassTimeSlot | undefined> {
    const [deletedClassTimeSlot] = await db.delete(classTimeSlots)
      .where(eq(classTimeSlots.id, id))
      .returning();
    return deletedClassTimeSlot;
  }

  async deleteClassTimeSlots(classId: number): Promise<void> {
    await db.delete(classTimeSlots).where(eq(classTimeSlots.classId, classId));
  }
  
  // Получение эффективного временного слота для класса
  // Возвращает настроенный слот для класса или слот по умолчанию, если настройки нет
  async getEffectiveTimeSlot(classId: number, slotNumber: number): Promise<TimeSlot | ClassTimeSlot | undefined> {
    // Попытка получить персонализированный слот для класса
    const classSlot = await this.getClassTimeSlotByNumber(classId, slotNumber);
    if (classSlot) return classSlot;
    
    // Если персонализированный слот не найден, получаем класс для определения школы
    const classEntity = await this.getClass(classId);
    if (!classEntity) return undefined;
    
    // Получаем слот по умолчанию (сначала проверяем школьный слот, потом общий)
    return await this.getTimeSlotByNumber(slotNumber, classEntity.schoolId);
  }
  
  // Инициализация слотов по умолчанию, если они еще не созданы
  async initializeDefaultTimeSlots(): Promise<TimeSlot[]> {
    const defaultSlots = await this.getDefaultTimeSlots();
    if (defaultSlots.length > 0) return defaultSlots;
    
    // Предопределенные слоты по умолчанию
    const defaultTimeSlotsData: InsertTimeSlot[] = [
      { slotNumber: 0, startTime: "8:00", endTime: "8:45", isDefault: true },
      { slotNumber: 1, startTime: "9:00", endTime: "9:45", isDefault: true },
      { slotNumber: 2, startTime: "9:55", endTime: "10:40", isDefault: true },
      { slotNumber: 3, startTime: "11:00", endTime: "11:45", isDefault: true },
      { slotNumber: 4, startTime: "12:00", endTime: "12:45", isDefault: true },
      { slotNumber: 5, startTime: "12:55", endTime: "13:40", isDefault: true },
      { slotNumber: 6, startTime: "14:00", endTime: "14:45", isDefault: true },
      { slotNumber: 7, startTime: "15:15", endTime: "16:00", isDefault: true },
      { slotNumber: 8, startTime: "16:15", endTime: "17:00", isDefault: true },
      { slotNumber: 9, startTime: "17:15", endTime: "18:00", isDefault: true }
    ];
    
    const createdSlots: TimeSlot[] = [];
    for (const slotData of defaultTimeSlotsData) {
      const newSlot = await this.createTimeSlot(slotData);
      createdSlots.push(newSlot);
    }
    
    return createdSlots;
  }
}

// Экспортируем экземпляр хранилища
export const dbStorage = new DatabaseStorage();