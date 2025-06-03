import { pgTable, text, serial, integer, boolean, date, timestamp, primaryKey, foreignKey, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum for user roles
export enum UserRoleEnum {
  SUPER_ADMIN = "super_admin",
  SCHOOL_ADMIN = "school_admin",
  TEACHER = "teacher",
  STUDENT = "student",
  PARENT = "parent",
  PRINCIPAL = "principal",
  VICE_PRINCIPAL = "vice_principal",
  CLASS_TEACHER = "class_teacher"
}

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  // Основная роль пользователя (для обратной совместимости)
  role: text("role").$type<UserRoleEnum>().notNull(),
  // Текущая активная роль, выбранная пользователем
  activeRole: text("active_role").$type<UserRoleEnum>(),
  schoolId: integer("school_id"),
  // Публичный ключ пользователя для E2E шифрования сообщений
  publicKey: text("public_key"),
  // Приватный ключ пользователя (зашифрованный)
  privateKey: text("private_key"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schools table
export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Enum для системы оценивания
export enum GradingSystemEnum {
  FIVE_POINT = "five_point", // Пятибалльная
  CUMULATIVE = "cumulative"  // Накопительная
}

// Classes table
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  schoolId: integer("school_id").notNull(),
  gradeLevel: integer("grade_level").notNull(),
  academicYear: text("academic_year").notNull(),
  gradingSystem: text("grading_system").$type<GradingSystemEnum>().default(GradingSystemEnum.FIVE_POINT).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Student-Class relation
export const studentClasses = pgTable("student_classes", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  classId: integer("class_id").notNull(),
});

// Subjects table
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  schoolId: integer("school_id").notNull(),
});

// Teacher-Subject relation
export const teacherSubjects = pgTable("teacher_subjects", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull(),
  subjectId: integer("subject_id").notNull(),
});

// Schedule table
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull(),
  subjectId: integer("subject_id").notNull(),
  teacherId: integer("teacher_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 1-7 for Monday-Sunday
  scheduleDate: date("schedule_date"), // Конкретная дата урока
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  room: text("room"),
  status: text("status").default("not_conducted"), // 'conducted' or 'not_conducted'
  subgroupId: integer("subgroup_id"), // Опциональная привязка к подгруппе
});

// Homework table
export const homework = pgTable("homework", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  subjectId: integer("subject_id").notNull(),
  classId: integer("class_id").notNull(),
  teacherId: integer("teacher_id").notNull(),
  scheduleId: integer("schedule_id"), // Связь с уроком в расписании (опционально)
  dueDate: date("due_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Homework submissions
export const homeworkSubmissions = pgTable("homework_submissions", {
  id: serial("id").primaryKey(),
  homeworkId: integer("homework_id").notNull(),
  studentId: integer("student_id").notNull(),
  submissionText: text("submission_text"),
  fileUrl: text("file_url"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  grade: integer("grade"),
  feedback: text("feedback"),
});

// Grades table
export const grades = pgTable("grades", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  subjectId: integer("subject_id").notNull(),
  classId: integer("class_id").notNull(),
  teacherId: integer("teacher_id").notNull(),
  scheduleId: integer("schedule_id"), // Связь с уроком в расписании (опционально)
  assignmentId: integer("assignment_id"), // Связь с заданием (опционально)
  subgroupId: integer("subgroup_id"), // Опциональная привязка к подгруппе
  grade: integer("grade").notNull(),
  comment: text("comment"),
  gradeType: text("grade_type").notNull(), // e.g., "homework", "test", "exam"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Attendance table
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  classId: integer("class_id").notNull(),
  scheduleId: integer("schedule_id").notNull(), // Ссылка на конкретное занятие
  date: date("date").notNull(),
  status: text("status").notNull(), // "present", "absent", "late"
  comment: text("comment"),
});

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  uploaderId: integer("uploader_id").notNull(),
  schoolId: integer("school_id"),
  classId: integer("class_id"),
  subjectId: integer("subject_id"),
  // Флаг, указывающий что файл зашифрован
  isEncrypted: boolean("is_encrypted").default(false),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

// Типы чатов
export enum ChatTypeEnum {
  PRIVATE = "private",    // Личный чат между двумя пользователями
  GROUP = "group"         // Групповой чат
}

// Чаты
export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  name: text("name"),                                     // Название чата (для групповых)
  type: text("type").$type<ChatTypeEnum>().notNull(),    // Тип чата: личный или групповой
  creatorId: integer("creator_id").notNull(),            // Создатель чата
  schoolId: integer("school_id").notNull(),              // ID школы, чтобы ограничить чаты в рамках школы
  avatarUrl: text("avatar_url"),                         // URL аватарки группового чата
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at"),           // Время последнего сообщения (для сортировки)
});

// Участники чата
export const chatParticipants = pgTable("chat_participants", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull(),
  userId: integer("user_id").notNull(),
  isAdmin: boolean("is_admin").default(false),           // Администратор группового чата
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastReadMessageId: integer("last_read_message_id"),    // ID последнего прочитанного сообщения
});

// Сообщения
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull(),                  // ID чата, вместо senderId/receiverId
  senderId: integer("sender_id").notNull(),              // Кто отправил сообщение
  content: text("content"),                              // Текст сообщения (может быть NULL, если есть вложение)
  hasAttachment: boolean("has_attachment").default(false).notNull(), // Есть ли вложение
  attachmentType: text("attachment_type"),               // Тип вложения: image, document, video
  attachmentUrl: text("attachment_url"),                 // URL вложения
  isRead: boolean("is_read").default(false).notNull(),   // Прочитано ли сообщение (устаревшее, используем lastReadMessageId)
  sentAt: timestamp("sent_at").defaultNow().notNull(),   // Когда отправлено
  isE2eEncrypted: boolean("is_e2e_encrypted").default(false), // Флаг сквозного шифрования
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Parent-Student relation
export const parentStudents = pgTable("parent_students", {
  id: serial("id").primaryKey(),
  parentId: integer("parent_id").notNull(),
  studentId: integer("student_id").notNull(),
});

// User-Role relation для хранения нескольких ролей пользователя
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  role: text("role").$type<UserRoleEnum>().notNull(),
  schoolId: integer("school_id"), // школа, связанная с этой ролью (например, для учителя, работающего в нескольких школах)
  classId: integer("class_id"), // класс, связанный с этой ролью (для классного руководителя)
});

// Подгруппы
export const subgroups = pgTable("subgroups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  classId: integer("class_id").notNull(), // К какому классу привязана подгруппа
  schoolId: integer("school_id").notNull(), // К какой школе относится подгруппа
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Связь студентов с подгруппами
export const studentSubgroups = pgTable("student_subgroups", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  subgroupId: integer("subgroup_id").notNull(),
});

// System logs
export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Типы работ для накопительной системы оценивания
export enum AssignmentTypeEnum {
  CONTROL_WORK = "control_work", // Контрольная работа
  TEST_WORK = "test_work", // Проверочная работа
  CURRENT_WORK = "current_work", // Текущая работа
  HOMEWORK = "homework", // Домашнее задание
  CLASSWORK = "classwork", // Работа на уроке
  PROJECT_WORK = "project_work", // Работа с проектом
  CLASS_ASSIGNMENT = "class_assignment" // Классная работа
}

// Таблица заданий для накопительной системы оценок
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").notNull(), // Связь с уроком
  assignmentType: text("assignment_type").$type<AssignmentTypeEnum>().notNull(), // Тип работы
  maxScore: numeric("max_score").notNull(), // Максимальный балл
  teacherId: integer("teacher_id").notNull(), // Кто создал задание
  classId: integer("class_id").notNull(), // Какой класс
  subjectId: integer("subject_id").notNull(), // Какой предмет
  subgroupId: integer("subgroup_id"), // Опциональная связь с подгруппой
  description: text("description"), // Описание задания (опционально)
  displayOrder: integer("display_order").default(0).notNull(), // Порядок отображения (для нескольких заданий в одном уроке)
  plannedFor: boolean("planned_for").default(false), // Флаг, указывающий, что задание запланировано на будущее
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Оценки для накопительной системы
export const cumulativeGrades = pgTable("cumulative_grades", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull(), // Связь с заданием
  studentId: integer("student_id").notNull(), // Ученик
  score: numeric("score").notNull(), // Полученный балл
  comment: text("comment"), // Комментарий (опционально)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Таблица для хранения предопределенных временных слотов по умолчанию
export const timeSlots = pgTable("time_slots", {
  id: serial("id").primaryKey(),
  slotNumber: integer("slot_number").notNull(), // Номер урока (0-9)
  startTime: text("start_time").notNull(), // Время начала слота в формате HH:MM
  endTime: text("end_time").notNull(), // Время окончания слота в формате HH:MM
  schoolId: integer("school_id"), // Опциональная связь со школой (для школьных наборов слотов)
  isDefault: boolean("is_default").default(false).notNull(), // Флаг, является ли набор слотов системным по умолчанию
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Таблица для хранения настроек временных слотов для конкретных классов
export const classTimeSlots = pgTable("class_time_slots", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull(), // Класс, для которого настроены слоты
  slotNumber: integer("slot_number").notNull(), // Номер урока (0-9)
  startTime: text("start_time").notNull(), // Настроенное время начала слота
  endTime: text("end_time").notNull(), // Настроенное время окончания слота
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for inserting data
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});

export const insertSchoolSchema = createInsertSchema(schools).omit({
  id: true,
  createdAt: true
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true
});

export const insertSubjectSchema = createInsertSchema(subjects).omit({
  id: true
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true
});

export const insertHomeworkSchema = createInsertSchema(homework).omit({
  id: true,
  createdAt: true
});

export const insertHomeworkSubmissionSchema = createInsertSchema(homeworkSubmissions).omit({
  id: true,
  submittedAt: true
});

export const insertGradeSchema = createInsertSchema(grades).omit({
  id: true,
  createdAt: true
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true
});

export const insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true
});

export const insertChatParticipantSchema = createInsertSchema(chatParticipants).omit({
  id: true,
  joinedAt: true,
  lastReadMessageId: true
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  isRead: true,
  sentAt: true
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true
});

export const insertParentStudentSchema = createInsertSchema(parentStudents).omit({
  id: true
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true
});

export const insertSubgroupSchema = createInsertSchema(subgroups).omit({
  id: true,
  createdAt: true
});

export const insertStudentSubgroupSchema = createInsertSchema(studentSubgroups).omit({
  id: true
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  createdAt: true
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true
});

export const insertCumulativeGradeSchema = createInsertSchema(cumulativeGrades).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertTimeSlotSchema = createInsertSchema(timeSlots).omit({
  id: true,
  createdAt: true
});

export const insertClassTimeSlotSchema = createInsertSchema(classTimeSlots).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schools.$inferSelect;

export type InsertClass = z.infer<typeof insertClassSchema>;
export type Class = typeof classes.$inferSelect;

export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjects.$inferSelect;

export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedules.$inferSelect & {
  // Дополнительное поле для имени подгруппы, которое будет заполняться на клиенте
  subgroupName?: string;
  // Массив заданий для этого урока, будет заполняться на клиенте
  assignments?: Assignment[];
};

export type InsertHomework = z.infer<typeof insertHomeworkSchema>;
export type Homework = typeof homework.$inferSelect;

export type InsertHomeworkSubmission = z.infer<typeof insertHomeworkSubmissionSchema>;
export type HomeworkSubmission = typeof homeworkSubmissions.$inferSelect;

export type InsertGrade = z.infer<typeof insertGradeSchema>;
export type Grade = typeof grades.$inferSelect;

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chats.$inferSelect & {
  unreadCount?: number; // Количество непрочитанных сообщений (вычисляемое поле)
};

export type InsertChatParticipant = z.infer<typeof insertChatParticipantSchema>;
export type ChatParticipant = typeof chatParticipants.$inferSelect;

export type Message = typeof messages.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertParentStudent = z.infer<typeof insertParentStudentSchema>;
export type ParentStudent = typeof parentStudents.$inferSelect;

export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRoleModel = typeof userRoles.$inferSelect;

export type InsertSubgroup = z.infer<typeof insertSubgroupSchema>;
export type Subgroup = typeof subgroups.$inferSelect;

export type InsertStudentSubgroup = z.infer<typeof insertStudentSubgroupSchema>;
export type StudentSubgroup = typeof studentSubgroups.$inferSelect;

export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type SystemLog = typeof systemLogs.$inferSelect;

export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;

export type InsertCumulativeGrade = z.infer<typeof insertCumulativeGradeSchema>;
export type CumulativeGrade = typeof cumulativeGrades.$inferSelect;

export type InsertTimeSlot = z.infer<typeof insertTimeSlotSchema>;
export type TimeSlot = typeof timeSlots.$inferSelect;

export type InsertClassTimeSlot = z.infer<typeof insertClassTimeSlotSchema>;
export type ClassTimeSlot = typeof classTimeSlots.$inferSelect;
