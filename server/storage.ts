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
  Chat, InsertChat, ChatTypeEnum,
  ChatParticipant, InsertChatParticipant,
  Notification, InsertNotification,
  ParentStudent, InsertParentStudent,
  SystemLog, InsertSystemLog,
  UserRoleEnum,
  UserRoleModel, InsertUserRole,
  Subgroup, InsertSubgroup,
  StudentSubgroup, InsertStudentSubgroup
} from "@shared/schema";

import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface for storage operations
export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // Password methods
  hashPassword(password: string): Promise<string>;
  comparePasswords(supplied: string, stored: string): Promise<boolean>;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUsersByRole(role: UserRoleEnum): Promise<User[]>;
  getUsersBySchool(schoolId: number): Promise<User[]>;
  
  // School operations
  getSchool(id: number): Promise<School | undefined>;
  getSchools(): Promise<School[]>;
  createSchool(school: InsertSchool): Promise<School>;
  updateSchool(id: number, school: Partial<InsertSchool>): Promise<School | undefined>;
  deleteSchool(id: number): Promise<School | undefined>;
  
  // Class operations
  getClass(id: number): Promise<Class | undefined>;
  getClasses(schoolId: number): Promise<Class[]>;
  createClass(classData: InsertClass): Promise<Class>;
  
  // Subject operations
  getSubject(id: number): Promise<Subject | undefined>;
  getSubjects(schoolId: number): Promise<Subject[]>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  updateSubject(id: number, data: Partial<InsertSubject>): Promise<Subject>;
  deleteSubject(id: number): Promise<Subject | undefined>;
  
  // Schedule operations
  getSchedule(id: number): Promise<Schedule | undefined>;
  getSchedulesByClass(classId: number): Promise<Schedule[]>;
  getSchedulesByTeacher(teacherId: number): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: number, schedule: Partial<InsertSchedule>): Promise<Schedule | undefined>;
  updateScheduleStatus(id: number, status: string): Promise<Schedule | undefined>;
  
  // Homework operations
  getHomework(id: number): Promise<Homework | undefined>;
  getHomeworkByClass(classId: number): Promise<Homework[]>;
  getHomeworkByTeacher(teacherId: number): Promise<Homework[]>;
  getHomeworkByStudent(studentId: number): Promise<Homework[]>;
  createHomework(homework: InsertHomework): Promise<Homework>;
  updateHomework(id: number, homework: Partial<InsertHomework>): Promise<Homework | undefined>;
  deleteHomework(id: number): Promise<Homework | undefined>;
  
  // Homework submission operations
  getHomeworkSubmission(id: number): Promise<HomeworkSubmission | undefined>;
  getHomeworkSubmissionsByHomework(homeworkId: number): Promise<HomeworkSubmission[]>;
  getHomeworkSubmissionsByStudent(studentId: number): Promise<HomeworkSubmission[]>;
  createHomeworkSubmission(submission: InsertHomeworkSubmission): Promise<HomeworkSubmission>;
  gradeHomeworkSubmission(id: number, grade: number, feedback: string): Promise<HomeworkSubmission | undefined>;
  
  // Grade operations
  getGrade(id: number): Promise<Grade | undefined>;
  getGradesByStudent(studentId: number): Promise<Grade[]>;
  getGradesByClass(classId: number): Promise<Grade[]>;
  getGradesBySubject(subjectId: number): Promise<Grade[]>;
  createGrade(grade: InsertGrade): Promise<Grade>;
  
  // Attendance operations
  getAttendance(id: number): Promise<Attendance | undefined>;
  getAttendanceByStudent(studentId: number): Promise<Attendance[]>;
  getAttendanceByClass(classId: number): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  
  // Document operations
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsBySchool(schoolId: number): Promise<Document[]>;
  getDocumentsByClass(classId: number): Promise<Document[]>;
  getDocumentsBySubject(subjectId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  
  // Message operations
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesBySender(senderId: number): Promise<Message[]>;
  getMessagesByReceiver(receiverId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<Message | undefined>;
  
  // Notification operations
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  
  // Parent-Student operations
  getParentStudents(parentId: number): Promise<ParentStudent[]>;
  getStudentParents(studentId: number): Promise<ParentStudent[]>;
  addParentStudent(parentStudent: InsertParentStudent): Promise<ParentStudent>;
  
  // System log operations
  createSystemLog(log: InsertSystemLog): Promise<SystemLog>;
  getSystemLogs(): Promise<SystemLog[]>;
  
  // Student-Class operations
  addStudentToClass(studentId: number, classId: number): Promise<void>;
  getStudentClasses(studentId: number): Promise<Class[]>;
  getClassStudents(classId: number): Promise<User[]>;
  
  // Teacher-Subject operations
  assignTeacherToSubject(teacherId: number, subjectId: number): Promise<void>;
  getTeacherSubjects(teacherId: number): Promise<Subject[]>;
  getSubjectTeachers(subjectId: number): Promise<User[]>;
  
  // User-Role operations
  getUserRole(id: number): Promise<UserRoleModel | undefined>;
  getUserRoles(userId: number): Promise<UserRoleModel[]>;
  addUserRole(userRole: InsertUserRole): Promise<UserRoleModel>;
  removeUserRole(id: number): Promise<void>;
  
  // Subgroup operations
  getSubgroup(id: number): Promise<Subgroup | undefined>;
  getSubgroupsByClass(classId: number): Promise<Subgroup[]>;
  getSubgroupsBySchool(schoolId: number): Promise<Subgroup[]>;
  createSubgroup(subgroup: InsertSubgroup): Promise<Subgroup>;
  updateSubgroup(id: number, subgroup: Partial<InsertSubgroup>): Promise<Subgroup | undefined>;
  deleteSubgroup(id: number): Promise<Subgroup | undefined>;
  
  // Student-Subgroup operations
  getStudentSubgroups(studentId: number): Promise<Subgroup[]>;
  getSubgroupStudents(subgroupId: number): Promise<User[]>;
  addStudentToSubgroup(studentSubgroup: InsertStudentSubgroup): Promise<StudentSubgroup>;
  removeStudentFromSubgroup(studentId: number, subgroupId: number): Promise<void>;
  getSchedulesBySubgroup(subgroupId: number): Promise<Schedule[]>;
  
  // Chat operations
  createChat(chat: InsertChat): Promise<Chat>;
  getChat(id: number): Promise<Chat | undefined>;
  getUserChats(userId: number): Promise<Chat[]>;
  getUsersChatBySchool(schoolId: number): Promise<Chat[]>;
  
  // Chat participant operations
  addChatParticipant(participant: InsertChatParticipant): Promise<ChatParticipant>;
  getChatParticipants(chatId: number): Promise<ChatParticipant[]>;
  getUserChatParticipations(userId: number): Promise<ChatParticipant[]>;
  removeChatParticipant(chatId: number, userId: number): Promise<void>;
  
  // Message operations - расширенные для работы с чатами
  getChatMessages(chatId: number): Promise<Message[]>;
  createChatMessage(message: InsertMessage): Promise<Message>;
  markLastReadMessage(chatId: number, userId: number, messageId: number): Promise<void>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private schools: Map<number, School>;
  private classes: Map<number, Class>;
  private subjects: Map<number, Subject>;
  private schedules: Map<number, Schedule>;
  private homework: Map<number, Homework>;
  private homeworkSubmissions: Map<number, HomeworkSubmission>;
  private grades: Map<number, Grade>;
  private attendance: Map<number, Attendance>;
  private documents: Map<number, Document>;
  private messages: Map<number, Message>;
  private notifications: Map<number, Notification>;
  private parentStudents: Map<number, ParentStudent>;
  private systemLogs: Map<number, SystemLog>;
  private userRoles: Map<number, UserRoleModel>;
  private studentClasses: Map<string, boolean>; // composite key "studentId-classId"
  private teacherSubjects: Map<string, boolean>; // composite key "teacherId-subjectId"
  private subgroups: Map<number, Subgroup>; // for subgroups
  private studentSubgroups: Map<string, boolean>; // composite key "studentId-subgroupId"
  
  // IDs for auto-increment
  private userId = 1;
  private schoolId = 1;
  private classId = 1;
  private subjectId = 1;
  private scheduleId = 1;
  private homeworkId = 1;
  private homeworkSubmissionId = 1;
  private gradeId = 1;
  private attendanceId = 1;
  private documentId = 1;
  private messageId = 1;
  private notificationId = 1;
  private parentStudentId = 1;
  private systemLogId = 1;
  private userRoleId = 1;
  private subgroupId = 1;
  private studentSubgroupId = 1;

  sessionStore: session.Store;
  
  constructor() {
    this.users = new Map();
    this.schools = new Map();
    this.classes = new Map();
    this.subjects = new Map();
    this.schedules = new Map();
    this.homework = new Map();
    this.homeworkSubmissions = new Map();
    this.grades = new Map();
    this.attendance = new Map();
    this.documents = new Map();
    this.messages = new Map();
    this.notifications = new Map();
    this.parentStudents = new Map();
    this.systemLogs = new Map();
    this.userRoles = new Map();
    this.studentClasses = new Map();
    this.teacherSubjects = new Map();
    this.subgroups = new Map();
    this.studentSubgroups = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Initialize with admin user
    this.createUser({
      username: "admin",
      password: "admin1234",
      firstName: "Администратор",
      lastName: "Системы",
      email: "admin@example.com",
      role: UserRoleEnum.SUPER_ADMIN,
      activeRole: UserRoleEnum.SUPER_ADMIN,
      schoolId: null,
      phone: null
    });
  }
  
  // Password methods
  async hashPassword(password: string): Promise<string> {
    // In memory storage doesn't hash passwords, just return the plain text
    return password;
  }
  
  async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    // In memory storage doesn't hash passwords, just compare plain text
    return supplied === stored;
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    // Преобразуем тип user к типу User
    const userWithCorrectType = {
      ...user,
      phone: user.phone ?? null,
      role: user.role as UserRoleEnum, 
      activeRole: user.activeRole as UserRoleEnum ?? null,
      schoolId: user.schoolId ?? null
    };
    const newUser: User = { ...userWithCorrectType, id, createdAt: new Date() };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    // Сначала создаем промежуточный объект без полей, которые мы будем специально обрабатывать
    const { role, activeRole, ...rest } = user;
    
    // Создаем новый объект обновления только с безопасными полями
    const updatedUser: User = { 
      ...existingUser,
      ...rest,
      // Явно обновляем только указанные поля, сохраняя существующие значения если они не указаны
      role: role ? role as UserRoleEnum : existingUser.role,
      activeRole: activeRole ? activeRole as UserRoleEnum : existingUser.activeRole
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUsersByRole(role: UserRoleEnum): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }
  
  async getUsersBySchool(schoolId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.schoolId === schoolId);
  }
  
  async deleteUser(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    this.users.delete(id);
    return user;
  }
  
  // School operations
  async getSchool(id: number): Promise<School | undefined> {
    return this.schools.get(id);
  }
  
  async getSchools(): Promise<School[]> {
    return Array.from(this.schools.values());
  }
  
  async createSchool(school: InsertSchool): Promise<School> {
    const id = this.schoolId++;
    // Убедимся, что у нас всегда есть статус для школы
    const schoolWithStatus = {
      ...school,
      status: school.status || 'active'
    };
    const newSchool: School = { ...schoolWithStatus, id, createdAt: new Date() };
    this.schools.set(id, newSchool);
    return newSchool;
  }
  
  async updateSchool(id: number, school: Partial<InsertSchool>): Promise<School | undefined> {
    const existingSchool = this.schools.get(id);
    if (!existingSchool) return undefined;
    
    const updatedSchool: School = { ...existingSchool, ...school };
    this.schools.set(id, updatedSchool);
    return updatedSchool;
  }
  
  async deleteSchool(id: number): Promise<School | undefined> {
    const school = this.schools.get(id);
    if (!school) return undefined;
    
    this.schools.delete(id);
    return school;
  }
  
  // Class operations
  async getClass(id: number): Promise<Class | undefined> {
    return this.classes.get(id);
  }
  
  async getClasses(schoolId: number): Promise<Class[]> {
    return Array.from(this.classes.values()).filter(cls => cls.schoolId === schoolId);
  }
  
  async createClass(classData: InsertClass): Promise<Class> {
    const id = this.classId++;
    const newClass: Class = { ...classData, id, createdAt: new Date() };
    this.classes.set(id, newClass);
    return newClass;
  }
  
  // Subject operations
  async getSubject(id: number): Promise<Subject | undefined> {
    return this.subjects.get(id);
  }
  
  async getSubjects(schoolId: number): Promise<Subject[]> {
    return Array.from(this.subjects.values()).filter(subject => subject.schoolId === schoolId);
  }
  
  async createSubject(subject: InsertSubject): Promise<Subject> {
    const id = this.subjectId++;
    const newSubject: Subject = { ...subject, id };
    this.subjects.set(id, newSubject);
    return newSubject;
  }
  
  async updateSubject(id: number, data: Partial<InsertSubject>): Promise<Subject> {
    const subject = this.subjects.get(id);
    
    if (!subject) {
      throw new Error("Subject not found");
    }
    
    // Update the subject with new data
    const updatedSubject = { ...subject, ...data };
    this.subjects.set(id, updatedSubject);
    
    return updatedSubject;
  }
  
  async deleteSubject(id: number): Promise<Subject | undefined> {
    const subject = this.subjects.get(id);
    if (subject) {
      this.subjects.delete(id);
    }
    return subject;
  }
  
  // Schedule operations
  async getSchedule(id: number): Promise<Schedule | undefined> {
    return this.schedules.get(id);
  }
  
  async getSchedulesByClass(classId: number): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).filter(schedule => schedule.classId === classId);
  }
  
  async getSchedulesByTeacher(teacherId: number): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).filter(schedule => schedule.teacherId === teacherId);
  }
  
  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const id = this.scheduleId++;
    // Set default status if not provided
    const scheduleWithStatus = {
      ...schedule,
      status: schedule.status || 'not_conducted'
    };
    const newSchedule: Schedule = { ...scheduleWithStatus, id };
    this.schedules.set(id, newSchedule);
    return newSchedule;
  }
  
  async updateSchedule(id: number, schedule: Partial<InsertSchedule>): Promise<Schedule | undefined> {
    const existingSchedule = this.schedules.get(id);
    if (!existingSchedule) return undefined;
    
    const updatedSchedule: Schedule = { ...existingSchedule, ...schedule };
    this.schedules.set(id, updatedSchedule);
    return updatedSchedule;
  }
  
  async updateScheduleStatus(id: number, status: string): Promise<Schedule | undefined> {
    const existingSchedule = this.schedules.get(id);
    if (!existingSchedule) return undefined;
    
    const updatedSchedule: Schedule = { ...existingSchedule, status };
    this.schedules.set(id, updatedSchedule);
    return updatedSchedule;
  }
  
  // Homework operations
  async getHomework(id: number): Promise<Homework | undefined> {
    return this.homework.get(id);
  }
  
  async getHomeworkByClass(classId: number): Promise<Homework[]> {
    return Array.from(this.homework.values()).filter(hw => hw.classId === classId);
  }
  
  async getHomeworkByTeacher(teacherId: number): Promise<Homework[]> {
    return Array.from(this.homework.values()).filter(hw => hw.teacherId === teacherId);
  }
  
  async getHomeworkByStudent(studentId: number): Promise<Homework[]> {
    // Get all classes for student
    const studentClasses = await this.getStudentClasses(studentId);
    const classIds = studentClasses.map(cls => cls.id);
    
    // Get homework for those classes
    return Array.from(this.homework.values()).filter(hw => classIds.includes(hw.classId));
  }
  
  async createHomework(homework: InsertHomework): Promise<Homework> {
    const id = this.homeworkId++;
    const newHomework: Homework = { ...homework, id, createdAt: new Date() };
    this.homework.set(id, newHomework);
    return newHomework;
  }
  
  async updateHomework(id: number, homework: Partial<InsertHomework>): Promise<Homework | undefined> {
    const existingHomework = this.homework.get(id);
    if (!existingHomework) return undefined;
    
    const updatedHomework: Homework = { ...existingHomework, ...homework };
    this.homework.set(id, updatedHomework);
    return updatedHomework;
  }
  
  async deleteHomework(id: number): Promise<Homework | undefined> {
    const homework = this.homework.get(id);
    if (!homework) return undefined;
    
    this.homework.delete(id);
    return homework;
  }
  
  // Homework submission operations
  async getHomeworkSubmission(id: number): Promise<HomeworkSubmission | undefined> {
    return this.homeworkSubmissions.get(id);
  }
  
  async getHomeworkSubmissionsByHomework(homeworkId: number): Promise<HomeworkSubmission[]> {
    return Array.from(this.homeworkSubmissions.values()).filter(
      submission => submission.homeworkId === homeworkId
    );
  }
  
  async getHomeworkSubmissionsByStudent(studentId: number): Promise<HomeworkSubmission[]> {
    return Array.from(this.homeworkSubmissions.values()).filter(
      submission => submission.studentId === studentId
    );
  }
  
  async createHomeworkSubmission(submission: InsertHomeworkSubmission): Promise<HomeworkSubmission> {
    const id = this.homeworkSubmissionId++;
    const newSubmission: HomeworkSubmission = {
      ...submission,
      id,
      submittedAt: new Date()
    };
    this.homeworkSubmissions.set(id, newSubmission);
    return newSubmission;
  }
  
  async gradeHomeworkSubmission(id: number, grade: number, feedback: string): Promise<HomeworkSubmission | undefined> {
    const submission = this.homeworkSubmissions.get(id);
    if (!submission) return undefined;
    
    const updatedSubmission: HomeworkSubmission = { ...submission, grade, feedback };
    this.homeworkSubmissions.set(id, updatedSubmission);
    return updatedSubmission;
  }
  
  // Grade operations
  async getGrade(id: number): Promise<Grade | undefined> {
    return this.grades.get(id);
  }
  
  async getGradesByStudent(studentId: number): Promise<Grade[]> {
    return Array.from(this.grades.values()).filter(grade => grade.studentId === studentId);
  }
  
  async getGradesByClass(classId: number): Promise<Grade[]> {
    return Array.from(this.grades.values()).filter(grade => grade.classId === classId);
  }
  
  async getGradesBySubject(subjectId: number): Promise<Grade[]> {
    return Array.from(this.grades.values()).filter(grade => grade.subjectId === subjectId);
  }
  
  async createGrade(grade: InsertGrade): Promise<Grade> {
    const id = this.gradeId++;
    const newGrade: Grade = { ...grade, id, createdAt: new Date() };
    this.grades.set(id, newGrade);
    return newGrade;
  }
  
  // Attendance operations
  async getAttendance(id: number): Promise<Attendance | undefined> {
    return this.attendance.get(id);
  }
  
  async getAttendanceByStudent(studentId: number): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(record => record.studentId === studentId);
  }
  
  async getAttendanceByClass(classId: number): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(record => record.classId === classId);
  }
  
  async createAttendance(attendance: InsertAttendance): Promise<Attendance> {
    const id = this.attendanceId++;
    const newAttendance: Attendance = { ...attendance, id };
    this.attendance.set(id, newAttendance);
    return newAttendance;
  }
  
  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }
  
  async getDocumentsBySchool(schoolId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.schoolId === schoolId);
  }
  
  async getDocumentsByClass(classId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.classId === classId);
  }
  
  async getDocumentsBySubject(subjectId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.subjectId === subjectId);
  }
  
  async createDocument(document: InsertDocument): Promise<Document> {
    const id = this.documentId++;
    const newDocument: Document = { ...document, id, uploadedAt: new Date() };
    this.documents.set(id, newDocument);
    return newDocument;
  }
  
  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }
  
  async getMessagesBySender(senderId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(message => message.senderId === senderId);
  }
  
  async getMessagesByReceiver(receiverId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(message => message.receiverId === receiverId);
  }
  
  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.messageId++;
    const newMessage: Message = {
      ...message,
      id,
      isRead: false,
      sentAt: new Date()
    };
    this.messages.set(id, newMessage);
    return newMessage;
  }
  
  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    
    const updatedMessage: Message = { ...message, isRead: true };
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }
  
  // Notification operations
  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }
  
  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(notification => notification.userId === userId);
  }
  
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.notificationId++;
    const newNotification: Notification = {
      ...notification,
      id,
      isRead: false,
      createdAt: new Date()
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    
    const updatedNotification: Notification = { ...notification, isRead: true };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }
  
  // Parent-Student operations
  async getParentStudents(parentId: number): Promise<ParentStudent[]> {
    return Array.from(this.parentStudents.values()).filter(
      relationship => relationship.parentId === parentId
    );
  }
  
  async getStudentParents(studentId: number): Promise<ParentStudent[]> {
    return Array.from(this.parentStudents.values()).filter(
      relationship => relationship.studentId === studentId
    );
  }
  
  async addParentStudent(parentStudent: InsertParentStudent): Promise<ParentStudent> {
    const id = this.parentStudentId++;
    const newRelationship: ParentStudent = { ...parentStudent, id };
    this.parentStudents.set(id, newRelationship);
    return newRelationship;
  }
  
  // System log operations
  async createSystemLog(log: InsertSystemLog): Promise<SystemLog> {
    const id = this.systemLogId++;
    const newLog: SystemLog = { ...log, id, createdAt: new Date() };
    this.systemLogs.set(id, newLog);
    return newLog;
  }
  
  async getSystemLogs(): Promise<SystemLog[]> {
    return Array.from(this.systemLogs.values());
  }
  
  // Subgroup operations
  async getSubgroup(id: number): Promise<Subgroup | undefined> {
    return this.subgroups.get(id);
  }
  
  async getSubgroupsByClass(classId: number): Promise<Subgroup[]> {
    return Array.from(this.subgroups.values()).filter(subgroup => subgroup.classId === classId);
  }
  
  async getSubgroupsBySchool(schoolId: number): Promise<Subgroup[]> {
    // First get all classes in the school
    const classes = await this.getClasses(schoolId);
    const classIds = classes.map(cls => cls.id);
    
    // Then get all subgroups that belong to these classes
    return Array.from(this.subgroups.values()).filter(subgroup => classIds.includes(subgroup.classId));
  }
  
  async createSubgroup(subgroup: InsertSubgroup): Promise<Subgroup> {
    const id = this.subgroupId++;
    const newSubgroup: Subgroup = { ...subgroup, id, createdAt: new Date() };
    this.subgroups.set(id, newSubgroup);
    return newSubgroup;
  }
  
  async updateSubgroup(id: number, subgroup: Partial<InsertSubgroup>): Promise<Subgroup | undefined> {
    const existingSubgroup = this.subgroups.get(id);
    if (!existingSubgroup) return undefined;
    
    const updatedSubgroup: Subgroup = { ...existingSubgroup, ...subgroup };
    this.subgroups.set(id, updatedSubgroup);
    return updatedSubgroup;
  }
  
  async deleteSubgroup(id: number): Promise<Subgroup | undefined> {
    const subgroup = this.subgroups.get(id);
    if (!subgroup) return undefined;
    
    // Remove all student-subgroup associations for this subgroup
    Array.from(this.studentSubgroups.keys()).forEach(key => {
      if (key.endsWith(`-${id}`)) {
        this.studentSubgroups.delete(key);
      }
    });
    
    // Remove the subgroup
    this.subgroups.delete(id);
    return subgroup;
  }
  
  // Student-Subgroup operations
  async getStudentSubgroups(studentId: number): Promise<Subgroup[]> {
    // Если studentId некорректный, вернуть пустой массив
    if (!studentId) {
      console.warn(`getStudentSubgroups: получен некорректный studentId: ${studentId}`);
      return [];
    }
    
    // Get all subgroup IDs that this student belongs to
    const subgroupIds = Array.from(this.studentSubgroups.keys())
      .filter(key => key.startsWith(`${studentId}-`))
      .map(key => parseInt(key.split('-')[1]))
      .filter(id => !isNaN(id) && id > 0); // Проверка на валидные ID
    
    console.log(`Найдены ID подгрупп для ученика ${studentId}:`, subgroupIds);
    
    // Get all subgroups with explicit checking for undefined
    const subgroups: Subgroup[] = [];
    for (const id of subgroupIds) {
      const subgroup = this.subgroups.get(id);
      if (subgroup) {
        subgroups.push(subgroup);
      }
    }
    
    return subgroups;
  }
  
  async getSubgroupStudents(subgroupId: number): Promise<User[]> {
    // Get all student IDs that belong to this subgroup
    const studentIds = Array.from(this.studentSubgroups.keys())
      .filter(key => key.endsWith(`-${subgroupId}`))
      .map(key => parseInt(key.split('-')[0]));
    
    // Get all students
    return studentIds.map(id => this.users.get(id)).filter(Boolean) as User[];
  }
  
  async addStudentToSubgroup(studentSubgroup: InsertStudentSubgroup): Promise<StudentSubgroup> {
    const { studentId, subgroupId } = studentSubgroup;
    const key = `${studentId}-${subgroupId}`;
    this.studentSubgroups.set(key, true);
    
    return { ...studentSubgroup, id: this.studentSubgroupId++ };
  }
  
  async removeStudentFromSubgroup(studentId: number, subgroupId: number): Promise<void> {
    const key = `${studentId}-${subgroupId}`;
    this.studentSubgroups.delete(key);
  }
  
  async getSchedulesBySubgroup(subgroupId: number): Promise<Schedule[]> {
    return Array.from(this.schedules.values())
      .filter(schedule => schedule.subgroupId === subgroupId);
  }
  
  // Student-Class operations
  async addStudentToClass(studentId: number, classId: number): Promise<void> {
    const key = `${studentId}-${classId}`;
    this.studentClasses.set(key, true);
  }
  
  async getStudentClasses(studentId: number): Promise<Class[]> {
    const classIds = Array.from(this.studentClasses.keys())
      .filter(key => key.startsWith(`${studentId}-`))
      .map(key => parseInt(key.split('-')[1]));
      
    return Array.from(this.classes.values()).filter(cls => classIds.includes(cls.id));
  }
  
  async getClassStudents(classId: number): Promise<User[]> {
    // Проверка на валидный classId
    if (!classId) {
      console.warn(`getClassStudents: получен некорректный classId: ${classId}`);
      return [];
    }

    // Получаем ID учеников этого класса
    const studentIds = Array.from(this.studentClasses.keys())
      .filter(key => key.endsWith(`-${classId}`))
      .map(key => parseInt(key.split('-')[0]))
      .filter(id => !isNaN(id) && id > 0); // Проверка на валидные ID
    
    console.log(`Найдены ID учеников для класса ${classId}:`, studentIds);
    
    // Находим пользователей по ID
    return Array.from(this.users.values()).filter(user => 
      user && user.id && user.role === UserRoleEnum.STUDENT && studentIds.includes(user.id)
    );
  }
  
  // Teacher-Subject operations
  async assignTeacherToSubject(teacherId: number, subjectId: number): Promise<void> {
    const key = `${teacherId}-${subjectId}`;
    this.teacherSubjects.set(key, true);
  }
  
  async getTeacherSubjects(teacherId: number): Promise<Subject[]> {
    const subjectIds = Array.from(this.teacherSubjects.keys())
      .filter(key => key.startsWith(`${teacherId}-`))
      .map(key => parseInt(key.split('-')[1]));
      
    return Array.from(this.subjects.values()).filter(subject => subjectIds.includes(subject.id));
  }
  
  async getSubjectTeachers(subjectId: number): Promise<User[]> {
    const teacherIds = Array.from(this.teacherSubjects.keys())
      .filter(key => key.endsWith(`-${subjectId}`))
      .map(key => parseInt(key.split('-')[0]));
      
    return Array.from(this.users.values()).filter(user => 
      user.role === UserRoleEnum.TEACHER && teacherIds.includes(user.id)
    );
  }
  
  // User-Role operations
  async getUserRole(id: number): Promise<UserRoleModel | undefined> {
    return this.userRoles.get(id);
  }

  async getUserRoles(userId: number): Promise<UserRoleModel[]> {
    return Array.from(this.userRoles.values()).filter(userRole => userRole.userId === userId);
  }

  async addUserRole(userRole: InsertUserRole): Promise<UserRoleModel> {
    const id = this.userRoleId++;
    const newUserRole: UserRoleModel = { ...userRole, id };
    this.userRoles.set(id, newUserRole);
    return newUserRole;
  }

  async removeUserRole(id: number): Promise<void> {
    this.userRoles.delete(id);
  }
}

export const storage = new MemStorage();
