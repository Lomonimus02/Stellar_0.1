import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useLocation } from "wouter";
import { useRoleCheck } from "@/hooks/use-role-check";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  FiClock, 
  FiMapPin, 
  FiUser, 
  FiCheck, 
  FiPlus, 
  FiX,
  FiSave,
  FiUsers,
  FiList, 
  FiEdit3, 
  FiTrash2, 
  FiAlertCircle,
  FiSettings
} from "react-icons/fi";
import { Schedule, User, Subject, Class, UserRoleEnum, Grade, Homework, AssignmentTypeEnum, Assignment, TimeSlot, ClassTimeSlot, Attendance } from "@shared/schema";
import { HomeworkForm } from "./homework-form";
import { AssignmentForm } from "../assignments/assignment-form";
import { AttendanceForm } from "../attendance/attendance-form";

// Функция-хелпер для проверки роли учителя или администратора школы
const isTeacherOrAdmin = (user?: User | null): boolean => {
  if (!user) return false;
  return user.role === UserRoleEnum.TEACHER || 
         user.role === UserRoleEnum.SCHOOL_ADMIN ||
         user.role === UserRoleEnum.CLASS_TEACHER;
};

// Функция для получения цвета для типа задания
const getAssignmentTypeColor = (type?: string): string => {
  switch (type) {
    case AssignmentTypeEnum.CONTROL_WORK:
      return 'bg-red-100';
    case AssignmentTypeEnum.TEST_WORK:
      return 'bg-blue-100';
    case AssignmentTypeEnum.CURRENT_WORK:
      return 'bg-green-100';
    case AssignmentTypeEnum.HOMEWORK:
      return 'bg-amber-100';
    case AssignmentTypeEnum.CLASSWORK:
      return 'bg-emerald-100';
    case AssignmentTypeEnum.PROJECT_WORK:
      return 'bg-purple-100';
    case AssignmentTypeEnum.CLASS_ASSIGNMENT:
      return 'bg-indigo-100';
    default:
      return 'bg-gray-100';
  }
};

// Props for ScheduleDayCard (extracted for use in ScheduleCarousel)
export interface ScheduleDayCardProps {
  date: Date;
  dayName: string;
  schedules: Schedule[];
  subjects: Subject[];
  teachers: User[];
  classes: Class[];
  grades?: Grade[];
  homework?: Homework[];
  currentUser?: User | null;
  isAdmin?: boolean;
  canView?: boolean;
  subgroups?: any[];
  showClassNames?: boolean;
  onAddSchedule?: (date: Date, scheduleToEdit?: Schedule) => void;
  onEditSchedule?: (schedule: Schedule) => void;
  onDeleteSchedule?: (scheduleId: number) => void;
  isDesktopActiveCard?: boolean; // New prop for desktop active indication
  // activeMobileIndex?: number; // Prop for mobile active indication (if needed differently)
}

// Функция для получения названия типа задания
const getAssignmentTypeName = (type?: string): string => {
  switch (type) {
    case AssignmentTypeEnum.CONTROL_WORK:
      return 'Контрольная';
    case AssignmentTypeEnum.TEST_WORK:
      return 'Тестирование';
    case AssignmentTypeEnum.CURRENT_WORK:
      return 'Текущая';
    case AssignmentTypeEnum.HOMEWORK:
      return 'Домашняя';
    case AssignmentTypeEnum.CLASSWORK:
      return 'Классная';
    case AssignmentTypeEnum.PROJECT_WORK:
      return 'Проект';
    case AssignmentTypeEnum.CLASS_ASSIGNMENT:
      return 'Задание';
    default:
      return 'Задание';
  }
};

interface ScheduleItemProps {
  schedule: Schedule;
  subject: Subject | undefined;
  teacherName: string;
  room: string;
  grades?: Grade[];
  homework?: Homework | undefined;
  isCompleted?: boolean;
  subgroups?: any[]; // Добавляем список подгрупп
  className?: string; // Добавляем имя класса для отображения в общем расписании
  showClass?: boolean; // Флаг для отображения класса (только в общем расписании)
  currentUser?: User | null; // Добавляем текущего пользователя для проверки прав
  onClick: (e?: React.MouseEvent, actionType?: string, assignment?: Assignment) => void;
  isDesktopActiveCard?: boolean; // Added to ScheduleItemProps for potential styling
}

export const ScheduleItem: React.FC<ScheduleItemProps> = ({
  schedule,
  subject,
  teacherName,
  room,
  grades = [],
  homework,
  isCompleted = false,
  subgroups = [],
  className,
  showClass = false,
  currentUser,
  onClick,
  isDesktopActiveCard,
}) => {
  // VisionOS-like styling for ScheduleItem
  const scheduleItemBaseStyle = `p-1.5 sm:p-2 rounded-lg cursor-pointer transition-all duration-200 
                               bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30`;
  const scheduleItemCompletedStyle = `bg-green-500/20 hover:bg-green-500/30 border-green-500/30`;

  // Функция для получения названия подгруппы
  const getSubgroupName = () => {
    // Проверяем, есть ли уже готовое название подгруппы в объекте расписания
    if ((schedule as any).subgroupName) {
      return (schedule as any).subgroupName;
    }
    
    // Если нет готового имени, ищем в массиве подгрупп
    if (schedule.subgroupId) {
      const subgroup = subgroups.find(sg => sg.id === schedule.subgroupId);
      if (subgroup) {
        // Отображаем только название подгруппы, без предмета
        return subgroup.name;
      }
    }
    return "Подгруппа";
  };

  return (
    <div
      className={`${scheduleItemBaseStyle} ${isCompleted ? scheduleItemCompletedStyle : ''}`}
      onClick={onClick}
      title={`Кабинет: ${room || "—"} • Учитель: ${teacherName}`}
    >
      <div className="flex justify-between items-center">
        {/* Time and Subject/Subgroup Name - adjusted text colors for better contrast on semi-transparent bg */}
        <div className="font-medium text-xs sm:text-sm text-gray-800">
          <span className="inline-block min-w-[60px] sm:min-w-[65px]">{schedule.startTime}</span>
          <span className="ml-1 sm:ml-1.5 truncate max-w-[120px] sm:max-w-[150px] inline-block align-middle font-semibold">
            {schedule.subgroupId
              ? getSubgroupName() // Используем функцию для получения названия подгруппы
              : subject?.name || "Предмет"}
          </span>
          {/* Отображаем класс для общего расписания */}
          {showClass && className && (
            <span className="ml-1 text-xs text-gray-500"> {/* Adjusted color */}
              [{className}]
            </span>
          )}
        </div>
        
        {/* Action Icons Container */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Assignment Count Badge */}
          {schedule.assignments && schedule.assignments.length > 0 && (
            <div className="text-[10px] xs:text-xs text-gray-700 font-medium px-1.5 py-0.5 bg-gray-500/20 rounded-md">
              <span title="Количество заданий">{schedule.assignments.length} з.</span> {/* Shortened text */}
            </div>
          )}
          
          {/* Action Icons - styled for visionOS */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div 
              className="cursor-pointer p-0.5 rounded hover:bg-gray-500/20"
              onClick={(e) => { e.stopPropagation(); if (onClick) onClick(e, "assignment"); }}
            >
              <FiList className="text-blue-600 w-4 h-4 sm:w-4.5 sm:h-4.5" title={schedule.status === 'conducted' ? "Создать задание" : "Запланировать задание"} />
            </div>
            
            <div 
              className="cursor-pointer p-0.5 rounded hover:bg-gray-500/20"
              onClick={(e) => { e.stopPropagation(); if (onClick) onClick(e, "homework"); }}
            >
              {isCompleted ? (
                <FiEdit3 className="text-orange-600 w-4 h-4 sm:w-4.5 sm:h-4.5" title="Редактировать домашнее задание" />
              ) : (
                <FiPlus className="text-orange-600 w-4 h-4 sm:w-4.5 sm:h-4.5" title="Добавить домашнее задание" />
              )}
            </div>
            
            {schedule.status === 'conducted' && currentUser?.role === UserRoleEnum.TEACHER && (
              <div 
                className="cursor-pointer p-0.5 rounded hover:bg-gray-500/20"
                onClick={(e) => { e.stopPropagation(); if (onClick) onClick(e, "attendance"); }}
              >
                <FiUsers className="text-purple-600 w-4 h-4 sm:w-4.5 sm:h-4.5" title="Отметить посещаемость" />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Grades Display - styled for visionOS */}
      {grades.length > 0 && (
        <div className="mt-1.5 sm:mt-2">
          <div className="flex flex-wrap gap-1">
            {grades.map((grade) => (
              <div 
                key={grade.id}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-blue-500/80 text-white cursor-pointer hover:bg-blue-600/80 transition-colors"
                title={grade.comment || "Нажмите для просмотра деталей"}
                onClick={(e) => { e.stopPropagation(); if (onClick) onClick(e, "grade", grade as unknown as Assignment); }}
              >
                {grade.grade}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ScheduleDayCard: React.FC<ScheduleDayCardProps> = ({
  date,
  dayName,
  schedules,
  subjects,
  teachers,
  classes,
  grades = [],
  homework = [],
  currentUser = null,
  isAdmin = false,
  canView = false,
  subgroups = [],
  showClassNames = false,
  onAddSchedule,
  onEditSchedule,
  onDeleteSchedule,
  isDesktopActiveCard,
}) => {
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isHomeworkDialogOpen, setIsHomeworkDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | undefined>(undefined);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [studentAttendance, setStudentAttendance] = useState<any | null>(null);
  const [, navigate] = useLocation();
  const { isTeacher, isSchoolAdmin, isStudent } = useRoleCheck();
  const { toast } = useToast();
  
  // Получение временных слотов для отображения в сетке расписания
  const { data: timeSlots = [] } = useQuery<TimeSlot[]>({
    queryKey: ['/api/time-slots/defaults'],
  });
  
  // Получение настроенных слотов для класса (если это страница расписания класса)
  const [classId, setClassId] = useState<number | undefined>(undefined);
  
  // Определяем classId из первого расписания
  useEffect(() => {
    if (schedules.length > 0 && !showClassNames) {
      setClassId(schedules[0].classId);
    }
  }, [schedules, showClassNames]);
  
  // Получаем настроенные временные слоты для класса, если classId известен
  const { data: classTimeSlots = [] } = useQuery<ClassTimeSlot[]>({
    queryKey: [`/api/class/${classId}/time-slots`],
    enabled: !!classId && !showClassNames, // Только если это расписание для конкретного класса
  });
  
  const formattedDate = format(date, "dd.MM", { locale: ru });

  // Base visionOS styling for the card
  const visionOSBaseCardStyle = `w-full h-full flex flex-col 
                                 bg-white/30 backdrop-blur-md 
                                 shadow-xl rounded-2xl border border-white/20 
                                 transition-all duration-300 ease-in-out`;
  
  // Styling for active desktop card (subtle greenish tint and slightly more pronounced border/shadow)
  const visionOSActiveCardStyle = isDesktopActiveCard 
    ? `border-green-400/50 bg-green-500/10 shadow-2xl scale-105` 
    : `border-white/20`; // Default border for non-active

  // Max width for desktop cards to ensure 3-5 are visible in the carousel
  const desktopCardMaxWidth = "max-w-md"; // Approx 448px, can be adjusted e.g. max-w-[400px]

  const sortedSchedules = [...schedules].sort((a, b) => {
    const timeA = a.startTime.split(":").map(Number);
    const timeB = b.startTime.split(":").map(Number);
    
    if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0];
    return timeA[1] - timeB[1];
  });

  // Функция для получения эффективного слота (настроенный для класса или по умолчанию)
  const getEffectiveSlot = (slotNumber: number): TimeSlot | ClassTimeSlot | undefined => {
    const classSlot = classTimeSlots.find(slot => slot.slotNumber === slotNumber);
    if (classSlot) return classSlot;
    
    return timeSlots.find(slot => slot.slotNumber === slotNumber);
  };
  
  // Получаем максимальный номер слота, который нужно отобразить
  const getMaxDisplayedSlot = (): number => {
    if (sortedSchedules.length === 0) return -1;
    
    // Находим максимальный слот из имеющихся уроков
    let maxSlot = 0;
    sortedSchedules.forEach(schedule => {
      // Определяем номер слота по времени начала
      const startHour = parseInt(schedule.startTime.split(':')[0]);
      const startMin = parseInt(schedule.startTime.split(':')[1]);
      
      // Ищем соответствующий слот
      timeSlots.forEach(slot => {
        const slotStartHour = parseInt(slot.startTime.split(':')[0]);
        const slotStartMin = parseInt(slot.startTime.split(':')[1]);
        
        if (startHour === slotStartHour && startMin === slotStartMin) {
          maxSlot = Math.max(maxSlot, slot.slotNumber);
        } else if (Math.abs(startHour - slotStartHour) <= 1) {
          // Приближённое сопоставление (в пределах часа)
          if (Math.abs((startHour * 60 + startMin) - (slotStartHour * 60 + slotStartMin)) <= 20) {
            maxSlot = Math.max(maxSlot, slot.slotNumber);
          }
        }
      });
    });
    
    return maxSlot;
  };

  const getSubject = (subjectId: number) => {
    return subjects.find(s => s.id === subjectId);
  };

  const getTeacherName = (teacherId: number) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? `${teacher.lastName} ${teacher.firstName}` : "—";
  };

  const getClassName = (classId: number) => {
    const classObj = classes.find(c => c.id === classId);
    return classObj ? classObj.name : "—";
  };

  // Функция для получения оценок по конкретному расписанию
  const getScheduleGrades = (schedule: Schedule) => {
    if (!grades?.length || !currentUser) return [];
    
    // Если текущий пользователь - учитель, оценки должны относиться к его предмету и классу 
    if (currentUser.role === UserRoleEnum.TEACHER) {
      return [];
    }
    
    // Если текущий пользователь - ученик, показываем только его оценки для конкретного урока
    if (currentUser.role === UserRoleEnum.STUDENT) {
      // Фильтруем оценки по следующим критериям:
      return grades.filter(grade => {
        // Оценка должна принадлежать этому студенту
        const isStudentGrade = grade.studentId === currentUser.id;
        
        // Оценка привязана к конкретному уроку расписания
        const isScheduleMatch = grade.scheduleId === schedule.id;
        
        // Показываем ТОЛЬКО оценки, которые привязаны к конкретному уроку
        return isStudentGrade && isScheduleMatch;
      });
    }
    
    return [];
  };
  
  // Функция для получения домашнего задания для конкретного расписания
  const getScheduleHomework = (schedule: Schedule) => {
    if (!homework?.length) return undefined;
    
    // Ищем задание именно для этого урока (scheduleId)
    return homework.find(hw => hw.scheduleId === schedule.id);
  };

  // Состояния для диалоговых окон уже определены выше

  // Функция для загрузки данных о посещаемости студента
  const loadStudentAttendance = async (scheduleId: number, studentId: number) => {
    try {
      console.log(`Загрузка данных о посещаемости для студента ${studentId} и урока ${scheduleId}`);
      
      // Загружаем данные о посещаемости для текущего студента и урока
      const response = await fetch(`/api/attendance?scheduleId=${scheduleId}&studentId=${studentId}`);
      if (!response.ok) {
        throw new Error(`Ошибка при получении данных о посещаемости: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Данные о посещаемости для студента:", data);
      
      // Устанавливаем в состояние
      if (data && data.length > 0) {
        setStudentAttendance(data[0]);
      } else {
        setStudentAttendance(null);
      }
    } catch (error) {
      console.error("Ошибка при загрузке данных о посещаемости:", error);
      setStudentAttendance(null);
    }
  };

  // Функция для загрузки информации о задании по ID
  const fetchAssignmentById = async (assignmentId: number): Promise<Assignment | null> => {
    try {
      console.log(`Загрузка задания с ID: ${assignmentId}`);
      const response = await fetch(`/api/assignments/${assignmentId}`);
      if (response.ok) {
        return await response.json();
      } else {
        console.error(`Ошибка при загрузке задания: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error("Ошибка при загрузке задания:", error);
      return null;
    }
  };

  // Функция для загрузки заданий по scheduleId
  const fetchAssignmentsByScheduleId = async (scheduleId: number): Promise<Assignment[]> => {
    try {
      console.log(`Загрузка заданий для урока с ID: ${scheduleId}`);
      const response = await fetch(`/api/assignments/schedule/${scheduleId}`);
      if (response.ok) {
        return await response.json();
      } else {
        console.error(`Ошибка при загрузке заданий для урока: ${response.status}`);
        return [];
      }
    } catch (error) {
      console.error("Ошибка при загрузке заданий для урока:", error);
      return [];
    }
  };

  // Обработчик клика по оценке
  const handleGradeClick = async (grade: Grade) => {
    console.log("Клик по оценке:", grade);
    setSelectedGrade(grade);
    
    let assignment = null;
    
    // Сначала ищем по assignmentId (если есть)
    if (grade.assignmentId) {
      assignment = await fetchAssignmentById(grade.assignmentId);
    }
    
    // Если не найдено по assignmentId, ищем по scheduleId
    if (!assignment && grade.scheduleId) {
      const assignments = await fetchAssignmentsByScheduleId(grade.scheduleId);
      if (assignments.length > 0) {
        assignment = assignments[0];
      }
    }
    
    setSelectedAssignment(assignment || undefined);
    setIsGradeDialogOpen(true);
  };

  const handleScheduleClick = (schedule: Schedule, actionType?: string, assignment?: Assignment) => {
    setSelectedSchedule(schedule);
    
    if (actionType === "homework" && isTeacher()) {
      setIsHomeworkDialogOpen(true);
    } else if (actionType === "assignment" && isTeacher()) {
      // Разрешаем создавать задания независимо от статуса
      setSelectedAssignment(undefined); // Создание нового задания
      setIsAssignmentDialogOpen(true);
    } else if (actionType === "edit-assignment" && assignment && isTeacher()) {
      setSelectedAssignment(assignment); // Редактирование существующего задания
      setIsAssignmentDialogOpen(true);
    } else if (actionType === "attendance" && isTeacher() && schedule.status === 'conducted') {
      // Открываем диалог для отметки посещаемости (только для проведенных уроков)
      setIsAttendanceDialogOpen(true);
    } else if (actionType === "grade" && isStudent()) {
      // Обработка клика по оценке
      const grade = assignment as unknown as Grade; // Используем параметр assignment для передачи оценки
      handleGradeClick(grade);
    } else {
      // Для студентов загружаем данные о посещаемости при открытии диалога
      if (isStudent() && currentUser && schedule.status === 'conducted') {
        loadStudentAttendance(schedule.id, currentUser.id);
      } else {
        setStudentAttendance(null);
      }
      setIsDetailsOpen(true);
    }
  };

  return (
    <>
      {/* Apply visionOS styles and max width for desktop */}
      <Card className={`${visionOSBaseCardStyle} ${visionOSActiveCardStyle} ${desktopCardMaxWidth}`}>
        {/* Card Header: Day Name and Date - styled for visionOS */}
        <CardHeader 
          className={`text-center py-2 sm:py-3 sticky top-0 z-10 rounded-t-2xl 
                      border-b border-white/10
                      ${isDesktopActiveCard ? 'bg-green-500/5' : 'bg-transparent'} 
                      transition-colors duration-200`}
        >
          {/* Adjusted font sizes, weights, and colors */}
          <CardTitle className={`text-xl sm:text-2xl font-semibold ${isDesktopActiveCard ? 'text-green-700' : 'text-gray-800'}`}>
            {dayName}
          </CardTitle>
          <div className={`text-sm sm:text-base ${isDesktopActiveCard ? 'text-green-600' : 'text-gray-600'}`}>
            {formattedDate}
          </div>
          {schedules.length > 0 && !isDesktopActiveCard && ( // Hide lesson count when card is active to reduce clutter
            <div className="text-xs text-gray-500 mt-1">
              {schedules.length} {schedules.length === 1 ? 'урок' : 
                schedules.length < 5 ? 'урока' : 'уроков'}
            </div>
          )}
        </CardHeader>
        
        {/* Card Content: Fixed height for ~9 lessons, scrollable */}
        <CardContent 
          className={`px-2 sm:px-3 pt-1 pb-2 flex-grow overflow-y-auto 
                      h-[500px]`} // Fixed height for ~9 lessons (e.g., 9 * ~55px)
        >
          {sortedSchedules.length === 0 ? (
            // "No lessons" message - styled and centered
            <div className="flex flex-col items-center justify-center h-full text-gray-500/80">
              <FiClock className="w-14 h-14 mb-4 text-gray-400/70" />
              <p className="text-center text-sm sm:text-base">На этот день уроки не запланированы</p>
              {isAdmin && !canView && (
                // Button styling adjusted for visionOS
                <Button 
                  className="mt-6 bg-white/40 hover:bg-white/60 border border-white/30 text-gray-700 backdrop-blur-sm" 
                  variant="outline" 
                  onClick={() => onAddSchedule && onAddSchedule(date)}
                >
                  <FiPlus className="mr-2" /> Добавить урок
                </Button>
              )}
            </div>
          ) : (
            // Lessons list - using space-y for gaps between items
            <div className="space-y-1.5 sm:space-y-2">
              {isSchoolAdmin() && classId && !showClassNames && (
                <div className="mb-2 flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs inline-flex items-center gap-1 text-gray-500/90 hover:text-gray-700/90"
                    onClick={() => { if (classId) navigate(`/schedule-class/${classId}/time-slots`); }}
                  >
                    <FiSettings size={14} />
                    <span>Настроить слоты</span>
                  </Button>
                </div>
              )}
              
              {/* Render ScheduleItems directly without time slot grid for simplicity with fixed height */}
              {/* The time slot logic might need re-evaluation if it's essential for the fixed height design */}
              {sortedSchedules.map(schedule => (
                <ScheduleItem
                  key={schedule.id}
                  schedule={schedule}
                  subject={getSubject(schedule.subjectId)}
                  teacherName={getTeacherName(schedule.teacherId)}
                  room={schedule.room || ""}
                  grades={getScheduleGrades(schedule)}
                  homework={getScheduleHomework(schedule)}
                  isCompleted={getScheduleHomework(schedule) !== undefined}
                  subgroups={subgroups}
                  className={getClassName(schedule.classId)}
                  showClass={showClassNames}
                  onClick={(e, actionType, assignment) => handleScheduleClick(schedule, actionType, assignment)}
                  isDesktopActiveCard={isDesktopActiveCard} 
                />
              ))}
              
              {isAdmin && !canView && (
                <div className="flex justify-center mt-4">
                  <Button 
                    variant="outline"
                    className="bg-white/40 hover:bg-white/60 border border-white/30 text-gray-700 backdrop-blur-sm"
                    onClick={() => onAddSchedule && onAddSchedule(date)}
                  >
                    <FiPlus className="mr-2" /> Добавить урок
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs styling can be updated in a subsequent step if needed for visionOS consistency */}
      {/* For now, focusing on the card itself. */}
      
      {/* Диалог для создания домашнего задания */}
      <Dialog open={isHomeworkDialogOpen} onOpenChange={setIsHomeworkDialogOpen}>
        <DialogContent className="sm:max-w-2xl md:max-w-4xl lg:max-w-5xl max-h-[85vh] overflow-y-auto w-[95vw] md:w-auto">
          <DialogHeader>
            <DialogTitle>Добавить домашнее задание</DialogTitle>
            <DialogDescription>
              {selectedSchedule && (
                <>
                  Предмет: {getSubject(selectedSchedule.subjectId)?.name}, 
                  Класс: {getClassName(selectedSchedule.classId)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSchedule && currentUser && isTeacher() && (
            <HomeworkForm 
              schedule={selectedSchedule}
              existingHomework={getScheduleHomework(selectedSchedule)}
              onClose={() => setIsHomeworkDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог для создания/редактирования задания */}
      <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
        <DialogContent className="sm:max-w-2xl md:max-w-4xl lg:max-w-5xl max-h-[85vh] overflow-y-auto w-[95vw] md:w-auto">
          <DialogHeader>
            <DialogTitle>{selectedAssignment ? "Редактировать задание" : "Создать задание"}</DialogTitle>
            <DialogDescription>
              {selectedSchedule && (
                <>
                  Предмет: {getSubject(selectedSchedule.subjectId)?.name}, 
                  Класс: {getClassName(selectedSchedule.classId)}
                  {selectedSchedule.subgroupId && (
                    <>, Подгруппа: {selectedSchedule.subgroupName || "Подгруппа"}</>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSchedule && isTeacher() && (
            <AssignmentForm 
              schedule={selectedSchedule}
              existingAssignment={selectedAssignment}
              onClose={() => setIsAssignmentDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог с детальной информацией об уроке */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-2xl md:max-w-4xl lg:max-w-5xl max-h-[85vh] overflow-y-auto w-[95vw] md:w-auto">
          <DialogHeader>
            <DialogTitle>Информация об уроке</DialogTitle>
            <DialogDescription>
              {selectedSchedule && getSubject(selectedSchedule.subjectId)?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSchedule && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-medium">
                <FiClock className="text-primary" />
                <span>{selectedSchedule.startTime} - {selectedSchedule.endTime}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-gray-500 mb-1">Предмет</h4>
                  <p className="font-medium">{getSubject(selectedSchedule.subjectId)?.name}</p>
                </div>
                <div>
                  <h4 className="text-gray-500 mb-1">Класс</h4>
                  <p className="font-medium">{getClassName(selectedSchedule.classId)}</p>
                </div>
                <div>
                  <h4 className="text-gray-500 mb-1">Кабинет</h4>
                  <p className="font-medium flex items-center">
                    <FiMapPin className="text-gray-400 mr-1" size={14} />
                    {selectedSchedule.room || "—"}
                  </p>
                </div>
                <div>
                  <h4 className="text-gray-500 mb-1">Учитель</h4>
                  <p className="font-medium flex items-center">
                    <FiUser className="text-gray-400 mr-1" size={14} />
                    {getTeacherName(selectedSchedule.teacherId)}
                  </p>
                </div>
                {/* Информация о подгруппе */}
                {selectedSchedule.subgroupId && (
                  <div className="col-span-2">
                    <h4 className="text-gray-500 mb-1">Подгруппа</h4>
                    <p className="font-medium text-emerald-700">{selectedSchedule.subgroupName || "Подгруппа"}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-gray-500 mb-1">Дата</h4>
                  <p className="font-medium">
                    {selectedSchedule.scheduleDate 
                      ? format(new Date(
                          Date.UTC(
                            new Date(selectedSchedule.scheduleDate).getFullYear(),
                            new Date(selectedSchedule.scheduleDate).getMonth(),
                            new Date(selectedSchedule.scheduleDate).getDate()
                          )
                        ), "dd.MM.yyyy")
                      : format(date, "dd.MM.yyyy")
                    }
                  </p>
                </div>
                <div>
                  <h4 className="text-gray-500 mb-1">День недели</h4>
                  <p className="font-medium">{dayName}</p>
                </div>
              </div>
              
              {/* Отображение информации о заданиях */}
              {selectedSchedule.assignments && selectedSchedule.assignments.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h3 className="text-lg font-medium text-blue-800 mb-2">Задания</h3>
                  <div className="space-y-2">
                    {selectedSchedule.assignments.map((assignment) => (
                      <div 
                        key={assignment.id} 
                        className="p-3 bg-white rounded-md border border-blue-200"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-medium">
                            {getAssignmentTypeName(assignment.assignmentType)}
                          </div>
                          <div className="text-sm bg-blue-100 px-2 py-0.5 rounded-full">
                            {assignment.maxScore} баллов
                          </div>
                        </div>
                        
                        {assignment.description && (
                          <p className="text-sm text-gray-600">{assignment.description}</p>
                        )}
                        
                        {assignment.plannedFor && (
                          <div className="text-xs text-gray-500 mt-2 flex items-center">
                            <FiClock className="mr-1" />
                            Запланировано
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Отображение информации о домашнем задании */}
              {getScheduleHomework(selectedSchedule) && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
                  <h3 className="text-lg font-medium text-orange-800 mb-2">Домашнее задание</h3>
                  <div className="space-y-2">
                    <p className="font-medium">{getScheduleHomework(selectedSchedule)?.title}</p>
                    <p className="text-sm text-gray-700">{getScheduleHomework(selectedSchedule)?.description}</p>
                    {getScheduleHomework(selectedSchedule)?.dueDate && (
                      <p className="text-xs text-gray-500 mt-2">
                        Срок сдачи: {format(new Date(getScheduleHomework(selectedSchedule)?.dueDate || ''), "dd.MM.yyyy")}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Отображение информации о посещаемости для студента */}
              {isStudent() && selectedSchedule.status === 'conducted' && (
                <div className="mt-4 p-4 rounded-lg border">
                  <h3 className="text-lg font-medium mb-2">Посещаемость</h3>
                  {studentAttendance ? (
                    <div className="space-y-2">
                      {studentAttendance.attendance ? (
                        // Формат: { studentId, studentName, attendance: { id, status, ... } }
                        <div className={`p-3 rounded-lg ${
                          studentAttendance.attendance.status === 'present' ? 'bg-green-50 border border-green-100' : 
                          studentAttendance.attendance.status === 'absent' ? 'bg-red-50 border border-red-100' :
                          'bg-amber-50 border border-amber-100'
                        }`}>
                          <div className="font-medium mb-1">
                            {studentAttendance.attendance.status === 'present' ? 'Присутствовал(а)' : 
                            studentAttendance.attendance.status === 'absent' ? 'Отсутствовал(а)' : 'Опоздал(а)'}
                          </div>
                          {studentAttendance.attendance.comment && (
                            <div className="text-sm text-gray-700">
                              Комментарий: {studentAttendance.attendance.comment}
                            </div>
                          )}
                        </div>
                      ) : (
                        // Формат: { id, studentId, status, ... }
                        <div className={`p-3 rounded-lg ${
                          studentAttendance.status === 'present' ? 'bg-green-50 border border-green-100' : 
                          studentAttendance.status === 'absent' ? 'bg-red-50 border border-red-100' :
                          'bg-amber-50 border border-amber-100'
                        }`}>
                          <div className="font-medium mb-1">
                            {studentAttendance.status === 'present' ? 'Присутствовал(а)' : 
                            studentAttendance.status === 'absent' ? 'Отсутствовал(а)' : 'Опоздал(а)'}
                          </div>
                          {studentAttendance.comment && (
                            <div className="text-sm text-gray-700">
                              Комментарий: {studentAttendance.comment}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      Нет данных о посещаемости для этого урока
                    </div>
                  )}
                </div>
              )}
              
              <DialogFooter className="flex flex-wrap justify-between gap-2 sm:justify-between">
                {isAdmin && !canView && (
                  <>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => {
                        if (onDeleteSchedule) {
                          onDeleteSchedule(selectedSchedule.id);
                          setIsDetailsOpen(false);
                        }
                      }}
                    >
                      <FiTrash2 className="mr-2" />
                      Удалить
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (onEditSchedule) {
                          onEditSchedule(selectedSchedule);
                          setIsDetailsOpen(false);
                        }
                      }}
                    >
                      <FiEdit3 className="mr-2" />
                      Изменить
                    </Button>
                  </>
                )}
                
                {isTeacher() && (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => {
                        // Если урок привязан к подгруппе, добавляем ID подгруппы в путь URL
                        const url = selectedSchedule.subgroupId 
                          ? `/class-grade-details/${selectedSchedule.classId}/${selectedSchedule.subjectId}/${selectedSchedule.subgroupId}` 
                          : `/class-grade-details/${selectedSchedule.classId}/${selectedSchedule.subjectId}`;
                        navigate(url);
                        setIsDetailsOpen(false);
                      }}
                    >
                      <FiList className="mr-2" />
                      Оценки класса
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => {
                        setIsDetailsOpen(false);
                        setIsHomeworkDialogOpen(true);
                      }}
                    >
                      {getScheduleHomework(selectedSchedule) ? (
                        <>
                          <FiEdit3 className="mr-2" />
                          Изменить домашнее задание
                        </>
                      ) : (
                        <>
                          <FiPlus className="mr-2" />
                          Добавить домашнее задание
                        </>
                      )}
                    </Button>
                    
                    {/* Кнопка для добавления/просмотра заданий (для накопительной системы оценок) */}
                    {selectedSchedule.status === "conducted" && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setIsDetailsOpen(false);
                          setSelectedAssignment(undefined);
                          setIsAssignmentDialogOpen(true);
                        }}
                      >
                        {selectedSchedule.assignments && selectedSchedule.assignments.length > 0 ? (
                          <>
                            <FiEdit3 className="mr-2" />
                            Редактировать задания
                          </>
                        ) : (
                          <>
                            <FiPlus className="mr-2" />
                            Добавить задание
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}
                
                {/* Кнопка редактирования уже добавлена выше */}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог с формой для заданий (накопительная система оценок) */}
      <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
        <DialogContent className="sm:max-w-2xl md:max-w-4xl lg:max-w-5xl max-h-[85vh] overflow-y-auto w-[95vw] md:w-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedAssignment ? "Редактирование задания" : "Создание задания"}
            </DialogTitle>
            <DialogDescription>
              {selectedAssignment 
                ? "Отредактируйте данные задания" 
                : "Добавьте новое задание для урока"}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSchedule && (
            <AssignmentForm
              schedule={selectedSchedule}
              existingAssignment={selectedAssignment}
              onClose={() => setIsAssignmentDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог с формой для отметки посещаемости */}
      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-auto">
          <DialogHeader>
            <DialogTitle>Отметка посещаемости</DialogTitle>
            <DialogDescription>
              {selectedSchedule && (
                <>
                  Предмет: {getSubject(selectedSchedule.subjectId)?.name}, 
                  Класс: {getClassName(selectedSchedule.classId)}
                  {selectedSchedule.subgroupId && (
                    <>, Подгруппа: {subgroups.find(sg => sg.id === selectedSchedule.subgroupId)?.name || "Подгруппа"}</>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSchedule && currentUser && isTeacher() && (
            <AttendanceForm 
              schedule={selectedSchedule}
              onClose={() => setIsAttendanceDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог для просмотра детальной информации об оценке */}
      <Dialog open={isGradeDialogOpen} onOpenChange={setIsGradeDialogOpen}>
        <DialogContent className="sm:max-w-2xl md:max-w-4xl lg:max-w-5xl max-h-[85vh] overflow-y-auto w-[95vw] md:w-auto">
          <DialogHeader>
            <DialogTitle>Информация об оценке</DialogTitle>
            <DialogDescription>
              {selectedSchedule && selectedGrade && (
                <>
                  Предмет: {getSubject(selectedSchedule.subjectId)?.name}, 
                  Дата: {selectedSchedule.scheduleDate 
                    ? format(new Date(selectedSchedule.scheduleDate), "dd.MM.yyyy")
                    : format(date, "dd.MM.yyyy")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedGrade && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                <div className="p-4 rounded-full bg-primary text-primary-foreground text-2xl font-bold w-16 h-16 flex items-center justify-center">
                  {selectedGrade.grade}
                </div>
                {selectedAssignment && selectedAssignment.maxScore && (
                  <div className="text-sm text-gray-600">
                    {`${Math.round((Number(selectedGrade.grade) / Number(selectedAssignment.maxScore)) * 100)}% от максимума`}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-3 p-4 bg-gray-50 rounded-lg">
                {selectedAssignment && (
                  <>
                    <div>
                      <h4 className="text-gray-500 text-sm mb-1">Тип оценки</h4>
                      <p className="font-medium">{getAssignmentTypeName(selectedAssignment.assignmentType)}</p>
                    </div>
                    {selectedAssignment.description && (
                      <div>
                        <h4 className="text-gray-500 text-sm mb-1">Описание</h4>
                        <p className="text-sm">{selectedAssignment.description}</p>
                      </div>
                    )}
                    <div>
                      <h4 className="text-gray-500 text-sm mb-1">Максимальный балл</h4>
                      <p className="font-medium">{selectedAssignment.maxScore}</p>
                    </div>
                  </>
                )}
                
                {selectedGrade.comment && (
                  <div>
                    <h4 className="text-gray-500 text-sm mb-1">Комментарий учителя</h4>
                    <p className="text-sm italic">{selectedGrade.comment}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="text-gray-500 text-sm mb-1">Дата выставления</h4>
                  <p className="text-sm">
                    {selectedGrade.createdAt 
                      ? format(new Date(selectedGrade.createdAt), "dd.MM.yyyy HH:mm") 
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};