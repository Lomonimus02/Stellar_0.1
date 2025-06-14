import { decryptModel, encryptModel } from '../../shared/encryption-wrappers';
import { 
  User, Message, InsertUser, InsertMessage, 
  Grade, InsertGrade, Document, InsertDocument,
  Notification, InsertNotification, Attendance, InsertAttendance,
  CumulativeGrade, InsertCumulativeGrade, Chat, InsertChat
} from '@shared/schema';

// Список полей, которые должны быть зашифрованы для каждой модели
export const encryptedFields = {
  users: ['firstName', 'lastName', 'email', 'phone'] as (keyof User)[],
  messages: ['content'] as (keyof Message)[],
  documents: ['fileUrl', 'description'] as (keyof Document)[],
  grades: ['comment'] as (keyof Grade)[],
  attendance: ['comment'] as (keyof Attendance)[],
  notifications: ['content'] as (keyof Notification)[],
  cumulativeGrades: ['comment'] as (keyof CumulativeGrade)[],
  chats: ['name'] as (keyof Chat)[]
};

// Функции для обработки пользователей
export function decryptUser(user: User | null): User | null {
  if (!user) return null;
  return decryptModel(user, encryptedFields.users);
}

export function encryptUser(user: InsertUser): InsertUser {
  if (!user) return user;
  return encryptModel(user, encryptedFields.users as (keyof InsertUser)[]);
}

// Функции для обработки сообщений
export function decryptMessage(message: Message | null): Message | null {
  if (!message) return null;
  return decryptModel(message, encryptedFields.messages);
}

export function encryptMessage(message: InsertMessage): InsertMessage {
  if (!message) return message;
  return encryptModel(message, encryptedFields.messages as (keyof InsertMessage)[]);
}

// Функция для расшифровки массива сообщений
export function decryptMessages(messages: Message[]): Message[] {
  return messages.map(message => decryptMessage(message)) as Message[];
}

// Функция для расшифровки массива пользователей
export function decryptUsers(users: User[]): User[] {
  return users.map(user => decryptUser(user)) as User[];
}

// Functions for Documents
export function decryptDocument(document: Document | null): Document | null {
  if (!document) return null;
  return decryptModel(document, encryptedFields.documents);
}

export function encryptDocument(document: InsertDocument): InsertDocument {
  if (!document) return document;
  return encryptModel(document, encryptedFields.documents as (keyof InsertDocument)[]);
}

export function decryptDocuments(documents: Document[]): Document[] {
  return documents.map(doc => decryptDocument(doc)) as Document[];
}

// Functions for Grades
export function decryptGrade(grade: Grade | null): Grade | null {
  if (!grade) return null;
  return decryptModel(grade, encryptedFields.grades);
}

export function encryptGrade(grade: InsertGrade): InsertGrade {
  if (!grade) return grade;
  return encryptModel(grade, encryptedFields.grades as (keyof InsertGrade)[]);
}

export function decryptGrades(grades: Grade[]): Grade[] {
  return grades.map(grade => decryptGrade(grade)) as Grade[];
}

// Functions for Attendance
export function decryptAttendance(attendance: Attendance | null): Attendance | null {
  if (!attendance) return null;
  return decryptModel(attendance, encryptedFields.attendance);
}

export function encryptAttendance(attendance: InsertAttendance): InsertAttendance {
  if (!attendance) return attendance;
  return encryptModel(attendance, encryptedFields.attendance as (keyof InsertAttendance)[]);
}

export function decryptAttendances(attendances: Attendance[]): Attendance[] {
  return attendances.map(attendance => decryptAttendance(attendance)) as Attendance[];
}

// Functions for Notifications
export function decryptNotification(notification: Notification | null): Notification | null {
  if (!notification) return null;
  return decryptModel(notification, encryptedFields.notifications);
}

export function encryptNotification(notification: InsertNotification): InsertNotification {
  if (!notification) return notification;
  return encryptModel(notification, encryptedFields.notifications as (keyof InsertNotification)[]);
}

export function decryptNotifications(notifications: Notification[]): Notification[] {
  return notifications.map(notification => decryptNotification(notification)) as Notification[];
}

// Functions for CumulativeGrades
export function decryptCumulativeGrade(grade: CumulativeGrade | null): CumulativeGrade | null {
  if (!grade) return null;
  return decryptModel(grade, encryptedFields.cumulativeGrades);
}

export function encryptCumulativeGrade(grade: InsertCumulativeGrade): InsertCumulativeGrade {
  if (!grade) return grade;
  return encryptModel(grade, encryptedFields.cumulativeGrades as (keyof InsertCumulativeGrade)[]);
}

export function decryptCumulativeGrades(grades: CumulativeGrade[]): CumulativeGrade[] {
  return grades.map(grade => decryptCumulativeGrade(grade)) as CumulativeGrade[];
}

// Функции для обработки чатов
export function decryptChat(chat: Chat | null): Chat | null {
  if (!chat) return null;
  return decryptModel(chat, encryptedFields.chats);
}

export function encryptChat(chat: InsertChat): InsertChat {
  if (!chat) return chat;
  return encryptModel(chat, encryptedFields.chats as (keyof InsertChat)[]);
}

// Функция для расшифровки массива чатов
export function decryptChats(chats: Chat[]): Chat[] {
  return chats.map(chat => decryptChat(chat)) as Chat[];
}