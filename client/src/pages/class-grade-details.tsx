import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useRoleCheck } from "@/hooks/use-role-check";
import { useNavigation } from "@/hooks/use-navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AttendanceForm } from "@/components/attendance/attendance-form";
import { 
  UserRoleEnum, 
  Grade,
  Schedule,
  Class as ClassType,
  Subject,
  User,
  GradingSystemEnum,
  AssignmentTypeEnum,
  Assignment
} from "@shared/schema";
import { GradeInputCell } from "@/components/grade-input-cell";
import { z } from "zod";



// Определяем интерфейс для слотов расписания
interface LessonSlot {
  date: string;
  scheduleId: number;
  formattedDate: string;
  startTime?: string;
  endTime?: string;
  status?: string; // Добавляем статус для проверки isLessonConducted
  assignments?: Assignment[];
}
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { 
  AlertCircle, 
  ArrowLeft,
  BookOpenIcon, 
  BookPlus,
  CalendarClock,
  CalendarIcon, 
  Download, 
  GraduationCapIcon, 
  Loader2, 
  PlusCircle 
} from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// Схема для формы добавления задания
const assignmentFormSchema = z.object({
  assignmentType: z.nativeEnum(AssignmentTypeEnum, {
    required_error: "Выберите тип задания",
  }),
  maxScore: z.string({
    required_error: "Укажите максимальный балл",
  }).min(1, "Минимальный балл - 1").refine((val) => !isNaN(Number(val)), {
    message: "Максимальный балл должен быть числом",
  }),
  description: z.string().optional().nullable(),
  scheduleId: z.number({
    required_error: "Необходимо указать ID занятия",
  }),
  subjectId: z.number({
    required_error: "Выберите предмет",
  }),
  classId: z.number({
    required_error: "Выберите класс",
  }),
  teacherId: z.number({
    required_error: "Выберите учителя",
  }),
  subgroupId: z.number().optional().nullable(),
  plannedFor: z.boolean().default(false),
});

// Схема для добавления оценки
// Динамическая схема оценки в зависимости от системы оценивания
const createGradeFormSchema = (gradingSystem: GradingSystemEnum | undefined, assignmentMaxScore?: number) => {
  // Базовая схема с общими полями
  const baseSchema = z.object({
    studentId: z.number({
      required_error: "Выберите ученика",
    }),
    subjectId: z.number({
      required_error: "Выберите предмет",
    }),
    classId: z.number({
      required_error: "Выберите класс",
    }),
    teacherId: z.number({
      required_error: "Выберите учителя",
    }),
    comment: z.string().nullable().optional(),
    gradeType: z.string({
      required_error: "Укажите тип оценки",
    }),
    date: z.string().optional().nullable(),
    scheduleId: z.number().optional().nullable(),
    subgroupId: z.number().optional().nullable(),
    assignmentId: z.number().optional().nullable(), // Для накопительной системы - ID задания
  });

  // Если накопительная система и задан максимальный балл
  if (gradingSystem === GradingSystemEnum.CUMULATIVE && assignmentMaxScore) {
    return baseSchema.extend({
      grade: z.number({
        required_error: "Укажите балл",
      }).min(0, "Минимальный балл - 0").max(assignmentMaxScore, `Максимальный балл - ${assignmentMaxScore}`),
    });
  }

  // Для пятибалльной системы или если система не определена
  return baseSchema.extend({
    grade: z.number({
      required_error: "Укажите оценку",
    }).min(1, "Минимальная оценка - 1").max(5, "Максимальная оценка - 5"),
  });
};

export default function ClassGradeDetailsPage() {
  const params = useParams();
  const classId = parseInt(params.classId || "0");
  const subjectId = parseInt(params.subjectId || "0");
  const [location, navigate] = useLocation();
  
  // Извлекаем subgroupId из параметров URL или из query параметров (для обратной совместимости)
  let subgroupId: number | undefined;
  
  // Сначала проверяем, есть ли subgroupId в пути URL
  if (params.subgroupId) {
    subgroupId = parseInt(params.subgroupId);
  } else {
    // Если нет в пути, пробуем извлечь из query параметров (старый способ)
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const subgroupIdParam = urlParams.get('subgroupId');
    if (subgroupIdParam) {
      subgroupId = parseInt(subgroupIdParam);
    }
  }
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { isTeacher, isSchoolAdmin, isSuperAdmin, isClassTeacher } = useRoleCheck();
  const { goBack } = useNavigation();
  const canEditGrades = isTeacher() || isSuperAdmin() || isClassTeacher();
  
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isContextDialogOpen, setIsContextDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [selectedAssignmentForEdit, setSelectedAssignmentForEdit] = useState<Assignment | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [editingGradeId, setEditingGradeId] = useState<number | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  
  // Fetch class details
  const { data: classData, isLoading: isClassLoading } = useQuery<ClassType>({
    queryKey: ["/api/classes", classId],
    queryFn: async () => {
      const res = await apiRequest(`/api/classes/${classId}`);
      return res.json();
    },
    enabled: !!classId && !!user,
  });
  
  // Fetch subject details
  const { data: subjectData, isLoading: isSubjectLoading } = useQuery<Subject>({
    queryKey: ["/api/subjects", subjectId],
    queryFn: async () => {
      const res = await apiRequest(`/api/subjects/${subjectId}`);
      return res.json();
    },
    enabled: !!subjectId && !!user,
  });
  
  // Получаем все подгруппы 
  const { data: allSubgroups = [], isLoading: isAllSubgroupsLoading } = useQuery<Array<{id: number, name: string, classId: number}>>({
    queryKey: ["/api/subgroups"],
    queryFn: async () => {
      const res = await apiRequest(`/api/subgroups`);
      return res.json();
    },
    enabled: !!user,
  });

  // Fetch subgroup details if subgroupId is provided
  const { data: subgroupData, isLoading: isSubgroupLoading } = useQuery<{id: number, name: string, classId: number}>({
    queryKey: ["/api/subgroups", subgroupId],
    queryFn: async () => {
      const res = await apiRequest(`/api/subgroups/${subgroupId}`);
      return res.json();
    },
    enabled: !!subgroupId && !!user,
  });
  
  // Fetch students in class
  const { data: students = [], isLoading: isStudentsLoading } = useQuery<User[]>({
    queryKey: ["/api/students-by-class", classId],
    queryFn: async () => {
      const res = await apiRequest(`/api/students-by-class/${classId}`);
      return res.json();
    },
    enabled: !!classId && !!user,
  });
  
  // Получаем студентов, связанных с подгруппой, если указан ID подгруппы
  const { data: studentSubgroups = [], isLoading: isStudentSubgroupsLoading } = useQuery<Array<{studentId: number, subgroupId: number}>>({
    queryKey: ["/api/student-subgroups", subgroupId],
    queryFn: async () => {
      if (subgroupId) {
        const res = await apiRequest(`/api/student-subgroups?subgroupId=${subgroupId}`);
        return res.json();
      }
      return [];
    },
    enabled: !!subgroupId && !!user,
  });
  

  
  // Отфильтрованный список студентов, учитывая подгруппу, если она указана
  const filteredStudents = useMemo(() => {
    if (subgroupId && studentSubgroups.length > 0) {
      // Получаем ID студентов, которые принадлежат конкретной подгруппе
      const subgroupStudentIds = studentSubgroups
        .filter(sg => sg.subgroupId === subgroupId)
        .map(sg => sg.studentId);
      
      // Возвращаем только студентов из этой подгруппы
      return students.filter(student => 
        subgroupStudentIds.includes(student.id)
      );
    }
    
    // Если подгруппа не указана или нет данных о студентах подгруппы, 
    // возвращаем всех студентов класса
    return students;
  }, [students, subgroupId, studentSubgroups]);
  

  
  // Fetch schedules for this class and subject, filtered by subgroup if specified
  const { data: schedules = [], isLoading: isSchedulesLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules", { classId, subjectId, subgroupId }],
    queryFn: async () => {
      let url = `/api/schedules?classId=${classId}&subjectId=${subjectId}`;
      
      // Если указана подгруппа, добавляем параметр для фильтрации расписаний только для этой подгруппы
      if (subgroupId) {
        url += `&subgroupId=${subgroupId}`;
      }
      
      const res = await apiRequest(url);
      return res.json();
    },
    enabled: !!classId && !!subjectId && !!user,
  });
  
  // Получаем расписание для текущего учителя (все предметы)
  const { data: teacherSchedules = [], isLoading: isTeacherSchedulesLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules", { teacherId: user?.id }],
    queryFn: async () => {
      const res = await apiRequest(`/api/schedules?teacherId=${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });
  
  // Fetch grades for this class, subject, and optionally subgroup
  const { data: grades = [], isLoading: isGradesLoading } = useQuery<Grade[]>({
    queryKey: ["/api/grades", { classId, subjectId, subgroupId }],
    queryFn: async () => {
      let url = `/api/grades?classId=${classId}&subjectId=${subjectId}`;
      
      // Если указана подгруппа, получаем только оценки из уроков этой подгруппы
      // Оценки фильтруются на клиенте после получения
      
      const res = await apiRequest(url);
      return res.json();
    },
    enabled: !!classId && !!subjectId && !!user,
  });
  
  // Используем тип Assignment импортированный из schema

// Получаем задания для этого класса и предмета, чтобы знать, какие ячейки активировать для выставления оценок
  const { data: assignments = [], isLoading: isAssignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ["/api/assignments", { classId, subjectId, subgroupId }],
    queryFn: async () => {
      let url = `/api/assignments?classId=${classId}&subjectId=${subjectId}`;
      if (subgroupId) {
        url += `&subgroupId=${subgroupId}`;
      }
      const res = await apiRequest(url);
      return res.json();
    },
    enabled: !!classId && !!subjectId && !!user && classData?.gradingSystem === GradingSystemEnum.CUMULATIVE,
  });
  
  // Функция для определения, есть ли задания для конкретного урока
  const getAssignmentsForSchedule = useCallback((scheduleId: number) => {
    return assignments.filter(a => a.scheduleId === scheduleId);
  }, [assignments]);

  // Функция для получения цвета фона ячейки на основе типа задания (visionOS inspired)
  const getAssignmentTypeColor = useCallback((assignmentType: string): string => {
    // console.log("Получение цвета для типа задания:", assignmentType);
    switch(assignmentType) {
      case AssignmentTypeEnum.CONTROL_WORK:
        return 'bg-red-500/15 text-red-700 border-red-700/30 hover:border-red-700/50 hover:bg-red-500/25';
      case AssignmentTypeEnum.TEST_WORK:
        return 'bg-sky-500/15 text-sky-700 border-sky-700/30 hover:border-sky-700/50 hover:bg-sky-500/25'; // Changed blue to sky for better differentiation
      case AssignmentTypeEnum.CURRENT_WORK:
        return 'bg-green-500/15 text-green-700 border-green-700/30 hover:border-green-700/50 hover:bg-green-500/25';
      case AssignmentTypeEnum.HOMEWORK:
        return 'bg-amber-500/15 text-amber-700 border-amber-700/30 hover:border-amber-700/50 hover:bg-amber-500/25';
      case AssignmentTypeEnum.CLASSWORK:
        return 'bg-purple-500/15 text-purple-700 border-purple-700/30 hover:border-purple-700/50 hover:bg-purple-500/25';
      case AssignmentTypeEnum.PROJECT_WORK:
        return 'bg-emerald-500/15 text-emerald-700 border-emerald-700/30 hover:border-emerald-700/50 hover:bg-emerald-500/25';
      case AssignmentTypeEnum.CLASS_ASSIGNMENT: // Often similar to classwork or current_work
        return 'bg-indigo-500/15 text-indigo-700 border-indigo-700/30 hover:border-indigo-700/50 hover:bg-indigo-500/25';
      default:
        // console.warn("Неизвестный тип задания:", assignmentType);
        return 'bg-slate-500/15 text-slate-700 border-slate-700/30 hover:border-slate-700/50 hover:bg-slate-500/25';
    }
  }, []);

  // Функция для получения названия типа задания
  const getAssignmentTypeName = useCallback((assignmentType: string) => {
    switch(assignmentType) {
      case AssignmentTypeEnum.CONTROL_WORK:
        return 'Контрольная работа';
      case AssignmentTypeEnum.TEST_WORK:
        return 'Проверочная работа';
      case AssignmentTypeEnum.CURRENT_WORK:
        return 'Текущая работа';
      case AssignmentTypeEnum.HOMEWORK:
        return 'Домашнее задание';
      case AssignmentTypeEnum.CLASSWORK:
        return 'Работа на уроке';
      case AssignmentTypeEnum.PROJECT_WORK:
        return 'Работа с проектом';
      case AssignmentTypeEnum.CLASS_ASSIGNMENT:
        return 'Классная работа';
      default:
        return assignmentType;
    }
  }, []);

  // Get unique lesson slots (date + scheduleId pairs) from schedules for this class and subject
  // Используем useState вместо useMemo, чтобы можно было обновлять данные
  const [lessonSlots, setLessonSlots] = useState<LessonSlot[]>([]);
  
  // Обновляем lessonSlots при изменении зависимостей
  useEffect(() => {
    // Фильтруем расписания для текущего предмета
    const newLessonSlots = schedules
      .filter(s => s.scheduleDate && s.subjectId === subjectId) // Filter schedules for this subject only
      .sort((a, b) => {
        // Сортируем по дате, затем по времени начала урока (если есть)
        const dateCompare = new Date(a.scheduleDate as string).getTime() - new Date(b.scheduleDate as string).getTime();
        if (dateCompare !== 0) return dateCompare;
        
        // Если даты одинаковые, сортируем по времени начала
        return a.startTime && b.startTime ? 
          a.startTime.localeCompare(b.startTime) : 0;
      })
      .map(s => ({
        date: s.scheduleDate as string,
        scheduleId: s.id,
        startTime: s.startTime || '',
        endTime: s.endTime || '',
        status: s.status || 'not_conducted',
        formattedDate: format(new Date(s.scheduleDate as string), "dd.MM", { locale: ru }),
        assignments: getAssignmentsForSchedule(s.id)
      }));
    
    setLessonSlots(newLessonSlots);
  }, [schedules, subjectId, getAssignmentsForSchedule, assignments]);
  
  // Группируем расписания учителя по предметам
  const schedulesBySubject = useMemo(() => {
    return teacherSchedules.reduce((acc, schedule) => {
      if (!schedule.subjectId || !schedule.scheduleDate) return acc;
      
      if (!acc[schedule.subjectId]) {
        acc[schedule.subjectId] = [];
      }
      
      // Добавляем, если такой даты еще нет
      if (!acc[schedule.subjectId].includes(schedule.scheduleDate)) {
        acc[schedule.subjectId].push(schedule.scheduleDate);
      }
      
      return acc;
    }, {} as Record<number, string[]>);
  }, [teacherSchedules]);
  
  // Определяем схему на основе системы оценивания класса
  const gradeFormSchema = useMemo(() => {
    // Находим максимальный балл для выбранного задания (если выбрано)
    const maxScore = selectedAssignment ? parseInt(selectedAssignment.maxScore) : undefined;
    return createGradeFormSchema(classData?.gradingSystem, maxScore);
  }, [classData?.gradingSystem, selectedAssignment]);

  // Grade form
  const gradeForm = useForm<z.infer<ReturnType<typeof createGradeFormSchema>>>({
    resolver: zodResolver(gradeFormSchema),
    defaultValues: {
      studentId: undefined,
      grade: undefined,
      comment: "",
      gradeType: "Текущая",
      subjectId: subjectId,
      classId: classId,
      teacherId: user?.id,
      scheduleId: null, // Добавляем scheduleId с изначальным значением null
      subgroupId: subgroupId || null, // Важно! Устанавливаем subgroupId если открыт журнал подгруппы
      assignmentId: null, // Добавляем поле для связи с заданием (для накопительной системы)
    },
  });
  
  // Обновляем форму при изменении выбранного задания
  useEffect(() => {
    if (selectedAssignment) {
      gradeForm.setValue('assignmentId', selectedAssignment.id);
      // Перевалидируем форму с новыми ограничениями на максимальный балл
      gradeForm.trigger('grade');
    } else {
      gradeForm.setValue('assignmentId', null);
    }
  }, [selectedAssignment, gradeForm]);
  
  // Mutation to add grade
  const addGradeMutation = useMutation({
    mutationFn: async (data: z.infer<ReturnType<typeof createGradeFormSchema>>) => {
      // Убедимся, что scheduleId всегда передается, если был выбран конкретный урок
      const gradeData = {
        ...data,
        scheduleId: data.scheduleId || null,
      };
      const res = await apiRequest("/api/grades", "POST", gradeData);
      return res.json();
    },
    onMutate: async (newGradeData) => {
      // Отменяем исходящие запросы за оценками
      await queryClient.cancelQueries({ queryKey: ["/api/grades"] });
      
      // Сохраняем предыдущее состояние
      const previousGrades = queryClient.getQueryData<Grade[]>(["/api/grades"]) || [];
      const previousGradesWithFilter = queryClient.getQueryData<Grade[]>(["/api/grades", { classId, subjectId }]) || [];
      
      // Создаём временную оценку для оптимистичного обновления
      // Учитываем выбранную дату, если она есть
      let createdAtDate = new Date();
      
      // Если у нас есть selectedDate, используем его вместо текущей даты
      if (selectedDate) {
        // Правильная обработка строки даты - убеждаемся, что у нас всегда строка
        const dateString = selectedDate || '';
        if (dateString.trim() !== '') {
          createdAtDate = new Date(dateString);
        }
      }
      
      // Преобразуем Date в строку ISO для совместимости с типом в Grade
      const createdAt = createdAtDate.toISOString();
      
      // Создаём временную оценку для оптимистичного обновления интерфейса
      const tempGrade: Grade = {
        id: Date.now(), // Временный ID для локального отображения
        studentId: newGradeData.studentId!, 
        subjectId: newGradeData.subjectId!,
        classId: newGradeData.classId!,
        teacherId: newGradeData.teacherId!,
        grade: newGradeData.grade!,
        comment: newGradeData.comment || null,
        gradeType: newGradeData.gradeType || "Текущая",
        // Добавляем scheduleId для привязки к конкретному уроку
        scheduleId: newGradeData.scheduleId || null,
        // Добавляем assignmentId для привязки к конкретному заданию
        assignmentId: newGradeData.assignmentId || null,
        // Очень важно! Добавляем subgroupId, если оценка ставится в подгруппе
        subgroupId: newGradeData.subgroupId || null,
        // Используем строковое представление даты для отображения в UI
        // В БД сама дата будет приведена к нужному типу
        createdAt: createdAt as unknown as Date,
      };
      
      // Оптимистично обновляем кеш react-query для обоих запросов
      queryClient.setQueryData<Grade[]>(["/api/grades"], [...previousGrades, tempGrade]);
      queryClient.setQueryData<Grade[]>(["/api/grades", { classId, subjectId }], [...previousGradesWithFilter, tempGrade]);
      
      // Возвращаем контекст с предыдущим состоянием
      return { previousGrades, previousGradesWithFilter };
    },
    onSuccess: (newGrade) => {
      // После успешного запроса обновляем кеш актуальными данными
      // Обновляем все запросы связанные с оценками
      queryClient.invalidateQueries({ 
        queryKey: ["/api/grades"]
      });
      
      // Инвалидируем запрос с конкретными параметрами класса и предмета (для основного журнала)
      queryClient.invalidateQueries({ 
        queryKey: ["/api/grades", { classId, subjectId }]
      });
      
      // Если оценка добавлена в подгруппе, инвалидируем запрос этой подгруппы
      if (subgroupId) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/grades", { classId, subjectId, subgroupId }]
        });
      }
      
      console.log("Запрос данных обновлен после добавления оценки:", { 
        classId, 
        subjectId, 
        subgroupId,
        grade: newGrade 
      });
      
      console.log("Оценка добавлена:", newGrade, "для подгруппы:", subgroupId);
      
      // Закрываем диалог только после успешного добавления
      setIsGradeDialogOpen(false);
      
      // Очищаем форму
      gradeForm.reset({
        studentId: undefined,
        grade: undefined,
        comment: "",
        gradeType: "Текущая",
        subjectId: subjectId,
        classId: classId,
        teacherId: user?.id,
        scheduleId: null, // Добавляем scheduleId с изначальным значением null
        subgroupId: subgroupId || null, // Сохраняем текущую подгруппу, если мы в контексте подгруппы
      });
      
      toast({
        title: "Оценка добавлена",
        description: "Оценка успешно добавлена в журнал",
      });
    },
    onError: (error, newGrade, context) => {
      // При ошибке возвращаем предыдущее состояние
      if (context?.previousGrades) {
        queryClient.setQueryData(["/api/grades"], context.previousGrades);
      }
      if (context?.previousGradesWithFilter) {
        queryClient.setQueryData(["/api/grades", { classId, subjectId }], context.previousGradesWithFilter);
      }
      
      toast({
        title: "Ошибка",
        description: "Не удалось добавить оценку. Попробуйте позже.",
        variant: "destructive",
      });
    },
    // Всегда возвращаемся к актуальному состоянию после выполнения мутации
    onSettled: () => {
      // Добавляем дополнительную инвалидацию для запроса с параметрами подгруппы
      queryClient.invalidateQueries({ queryKey: ["/api/grades"] });
      // Явно инвалидируем запрос с параметрами для текущего класса, предмета и подгруппы
      queryClient.invalidateQueries({ 
        queryKey: ["/api/grades", { classId, subjectId, subgroupId }] 
      });
      console.log("Запрос данных для подгруппы после сохранения оценки:", { classId, subjectId, subgroupId });
    },
  });
  
  // Mutation to update grade
  const updateGradeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<z.infer<typeof gradeFormSchema>> }) => {
      // Если мы обновляем только тип оценки, используем PATCH для частичного обновления
      if (Object.keys(data).length === 1 && 'gradeType' in data) {
        const res = await apiRequest(`/api/grades/${id}`, "PATCH", data);
        return res.json();
      } else {
        // Для полного обновления используем PUT 
        const res = await apiRequest(`/api/grades/${id}`, "PUT", data);
        return res.json();
      }
    },
    onMutate: async ({ id, data }) => {
      // Отменяем исходящие запросы
      await queryClient.cancelQueries({ queryKey: ["/api/grades"] });
      
      // Сохраняем предыдущее состояние
      const previousGrades = queryClient.getQueryData<Grade[]>(["/api/grades"]) || [];
      const previousGradesWithFilter = queryClient.getQueryData<Grade[]>(["/api/grades", { classId, subjectId }]) || [];
      
      // Функция обновления данных оценки
      const updateGradeData = (oldData: Grade[] = []) => {
        return oldData.map(grade => {
          if (grade.id === id) {
            // Обновляем существующую оценку
            return {
              ...grade,
              ...data,
              grade: data.grade || grade.grade, // Обновляем оценку, если она есть в data
              comment: data.comment !== undefined ? data.comment : grade.comment,
              gradeType: data.gradeType || grade.gradeType,
            };
          }
          return grade;
        });
      };
      
      // Оптимистично обновляем кеш в обоих запросах
      queryClient.setQueryData<Grade[]>(["/api/grades"], updateGradeData);
      queryClient.setQueryData<Grade[]>(["/api/grades", { classId, subjectId }], updateGradeData);
      
      return { previousGrades, previousGradesWithFilter };
    },
    onSuccess: (updatedGrade) => {
      // Обновляем все запросы связанные с оценками
      queryClient.invalidateQueries({ 
        queryKey: ["/api/grades"]
      });
      
      // Инвалидируем запрос с конкретными параметрами класса и предмета (для основного журнала)
      queryClient.invalidateQueries({ 
        queryKey: ["/api/grades", { classId, subjectId }]
      });
      
      // Если оценка обновлена в подгруппе, инвалидируем запрос этой подгруппы
      if (subgroupId) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/grades", { classId, subjectId, subgroupId }]
        });
      }
      
      console.log("Запрос данных обновлен после обновления оценки:", { 
        classId, 
        subjectId, 
        subgroupId,
        grade: updatedGrade 
      });
      
      // Закрываем диалог и очищаем форму после успешного обновления
      setIsGradeDialogOpen(false);
      setEditingGradeId(null);
      
      gradeForm.reset({
        studentId: undefined,
        grade: undefined,
        comment: "",
        gradeType: "Текущая",
        subjectId: subjectId,
        classId: classId,
        teacherId: user?.id,
        scheduleId: null, // Добавляем scheduleId с изначальным значением null
        subgroupId: subgroupId || null, // Сохраняем текущую подгруппу, если мы в контексте подгруппы
      });
      
      toast({
        title: "Оценка обновлена",
        description: "Оценка успешно обновлена в журнале",
      });
    },
    onError: (error, variables, context) => {
      // При ошибке возвращаем предыдущее состояние
      if (context?.previousGrades) {
        queryClient.setQueryData(["/api/grades"], context.previousGrades);
      }
      if (context?.previousGradesWithFilter) {
        queryClient.setQueryData(["/api/grades", { classId, subjectId }], context.previousGradesWithFilter);
      }
      
      toast({
        title: "Ошибка",
        description: "Не удалось обновить оценку. Попробуйте позже.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Добавляем дополнительную инвалидацию для запроса с параметрами подгруппы
      queryClient.invalidateQueries({ queryKey: ["/api/grades"] });
      
      // Явно инвалидируем запрос с параметрами для текущего класса, предмета и подгруппы
      queryClient.invalidateQueries({ 
        queryKey: ["/api/grades", { classId, subjectId, subgroupId }] 
      });
      
      console.log("Запрос данных после обновления оценки:", { classId, subjectId, subgroupId });
    },
  });
  
  // Форма для добавления задания
  const assignmentForm = useForm<z.infer<typeof assignmentFormSchema>>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      assignmentType: undefined,
      maxScore: "",
      description: "",
      scheduleId: undefined,
      subjectId: subjectId,
      classId: classId,
      teacherId: user?.id,
      subgroupId: subgroupId || undefined,
    },
  });

  // Mutation to add assignment
  const addAssignmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof assignmentFormSchema>) => {
      const res = await apiRequest("/api/assignments", "POST", data);
      return res.json();
    },
    onSuccess: (newAssignment) => {
      toast({
        title: "Задание создано",
        description: "Задание успешно добавлено к уроку",
      });
      
      // Ручное обновление lessonSlots
      // Добавляем созданное задание в соответствующий слот расписания
      const updatedLessonSlots = [...lessonSlots];
      const slotIndex = updatedLessonSlots.findIndex(
        slot => slot.scheduleId === newAssignment.scheduleId
      );
      
      if (slotIndex !== -1) {
        // Если нашли слот расписания, добавляем к нему задание
        if (!updatedLessonSlots[slotIndex].assignments) {
          updatedLessonSlots[slotIndex].assignments = [];
        }
        updatedLessonSlots[slotIndex].assignments?.push(newAssignment);
        
        // Обновляем состояние lessonSlots
        setLessonSlots(updatedLessonSlots);
        
        console.log('Задание добавлено в слот:', {
          slotIndex,
          slot: updatedLessonSlots[slotIndex],
          newAssignment
        });
      }
      
      // Обновляем кеш запросов
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/assignments", { classId, subjectId, subgroupId }] 
      });
      
      // Закрываем диалог и сбрасываем форму
      setIsAssignmentDialogOpen(false);
      assignmentForm.reset({
        assignmentType: undefined,
        maxScore: "",
        description: "",
        scheduleId: undefined,
        subjectId: subjectId,
        classId: classId,
        teacherId: user?.id,
        subgroupId: subgroupId || undefined,
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось создать задание: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutation to update assignment
  const updateAssignmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof assignmentFormSchema> & { id: number }) => {
      const { id, ...updateData } = data;
      const res = await apiRequest(`/api/assignments/${id}`, "PATCH", updateData);
      return res.json();
    },
    onSuccess: (updatedAssignment) => {
      toast({
        title: "Задание обновлено",
        description: "Задание успешно изменено",
      });
      
      // Обновляем кеш запросов
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/assignments", { classId, subjectId, subgroupId }] 
      });
      
      // Закрываем диалог и сбрасываем форму
      setIsAssignmentDialogOpen(false);
      setEditingAssignmentId(null);
      setSelectedAssignmentForEdit(null);
      
      assignmentForm.reset({
        assignmentType: undefined,
        maxScore: "",
        description: "",
        scheduleId: undefined,
        subjectId: subjectId,
        classId: classId,
        teacherId: user?.id,
        subgroupId: subgroupId || undefined,
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось обновить задание: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutation to delete assignment
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/assignments/${id}`, "DELETE");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Задание удалено",
        description: "Задание успешно удалено",
      });
      
      // Обновляем кеш запросов
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/assignments", { classId, subjectId, subgroupId }] 
      });
    },
    onError: (error) => {
      console.error("Ошибка при удалении задания:", error);
      toast({
        title: "Ошибка",
        description: `Не удалось удалить задание: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Mutation to update schedule status
  const updateScheduleStatusMutation = useMutation({
    mutationFn: async ({ scheduleId, status }: { scheduleId: number, status: string }) => {
      const res = await apiRequest(`/api/schedules/${scheduleId}/status`, "PATCH", { status });
      return res.json();
    },
    onSuccess: (updatedSchedule) => {
      // После успешного запроса обновляем кеш актуальными данными
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      
      // Закрываем диалог
      setIsStatusDialogOpen(false);
      setSelectedSchedule(null);
      
      toast({
        title: "Статус урока обновлен",
        description: updatedSchedule.status === "conducted" 
          ? "Урок отмечен как проведенный" 
          : "Урок отмечен как не проведенный",
      });
    },
    onError: (error: any) => {
      // Показываем ошибку пользователю
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус урока",
        variant: "destructive",
      });

      // Если ошибка из-за того, что урок еще не закончился, показываем подробности
      if (error.response) {
        error.response.json().then((data: any) => {
          if (data.message === "Cannot mark lesson as conducted before it ends") {
            toast({
              title: "Урок еще не закончился",
              description: "Вы не можете отметить урок как проведенный до его окончания",
              variant: "destructive",
            });
          }
        }).catch(() => {});
      }
    }
  });
  
  // Mutation to delete grade
  const deleteGradeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/grades/${id}`, "DELETE");
      return res.json();
    },
    onMutate: async (id) => {
      // Отменяем исходящие запросы
      await queryClient.cancelQueries({ queryKey: ["/api/grades"] });
      
      // Сохраняем предыдущее состояние
      const previousGrades = queryClient.getQueryData<Grade[]>(["/api/grades"]) || [];
      const previousGradesWithFilter = queryClient.getQueryData<Grade[]>(["/api/grades", { classId, subjectId }]) || [];
      
      // Функция фильтрации для удаления оценки
      const filterGradeData = (oldData: Grade[] = []) => {
        return oldData.filter(grade => grade.id !== id);
      };
      
      // Оптимистично обновляем кеш удаляя оценку из обоих запросов
      queryClient.setQueryData<Grade[]>(["/api/grades"], filterGradeData);
      queryClient.setQueryData<Grade[]>(["/api/grades", { classId, subjectId }], filterGradeData);
      
      return { previousGrades, previousGradesWithFilter };
    },
    onSuccess: () => {
      // Обновляем все запросы связанные с оценками
      queryClient.invalidateQueries({ 
        queryKey: ["/api/grades"]
      });
      
      // Инвалидируем запрос с конкретными параметрами класса и предмета (для основного журнала)
      queryClient.invalidateQueries({ 
        queryKey: ["/api/grades", { classId, subjectId }]
      });
      
      // Если оценка удалена в подгруппе, инвалидируем запрос этой подгруппы
      if (subgroupId) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/grades", { classId, subjectId, subgroupId }]
        });
      }
      
      console.log("Запрос данных обновлен после удаления оценки:", { 
        classId, 
        subjectId, 
        subgroupId
      });
      
      toast({
        title: "Оценка удалена",
        description: "Оценка успешно удалена из журнала",
      });
    },
    onError: (error, id, context) => {
      // При ошибке возвращаем предыдущее состояние
      if (context?.previousGrades) {
        queryClient.setQueryData(["/api/grades"], context.previousGrades);
      }
      if (context?.previousGradesWithFilter) {
        queryClient.setQueryData(["/api/grades", { classId, subjectId }], context.previousGradesWithFilter);
      }
      
      toast({
        title: "Ошибка",
        description: "Не удалось удалить оценку. Попробуйте позже.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Добавляем дополнительную инвалидацию для запроса с параметрами подгруппы
      queryClient.invalidateQueries({ queryKey: ["/api/grades"] });
      
      // Явно инвалидируем запрос с параметрами для текущего класса, предмета и подгруппы
      queryClient.invalidateQueries({ 
        queryKey: ["/api/grades", { classId, subjectId, subgroupId }] 
      });
      
      console.log("Запрос данных после удаления оценки:", { classId, subjectId, subgroupId });
    },
  });
  
  // Function to get schedule by its ID
  const getScheduleById = (scheduleId: number) => {
    return schedules.find(s => s.id === scheduleId);
  };
  
  // Open schedule status dialog
  const openStatusDialog = (scheduleId: number) => {
    const schedule = getScheduleById(scheduleId);
    if (schedule) {
      setSelectedSchedule(schedule);
      setIsStatusDialogOpen(true);
    }
  };
  
  // Handle schedule status update
  const handleScheduleStatusUpdate = (status: string) => {
    if (!selectedSchedule) return;
    
    updateScheduleStatusMutation.mutate({
      scheduleId: selectedSchedule.id,
      status
    });
  };
  
  // Функция для обработки выбора действия в контекстном диалоге
  const handleContextAction = (action: 'status' | 'assignment' | 'attendance') => {
    if (!selectedSchedule) return;
    
    // Закрываем контекстный диалог
    setIsContextDialogOpen(false);
    
    // Открываем соответствующий диалог в зависимости от выбранного действия
    if (action === 'status') {
      openStatusDialog(selectedSchedule.id);
    } else if (action === 'assignment') {
      openAssignmentDialog(selectedSchedule.id);
    } else if (action === 'attendance') {
      // Проверяем, что урок проведен
      if (selectedSchedule.status === 'conducted') {
        setIsAttendanceDialogOpen(true);
      } else {
        toast({
          title: "Ошибка",
          description: "Отметка посещаемости доступна только для проведенных уроков",
          variant: "destructive"
        });
      }
    }
  };
  
  // Open dialog to create a new assignment
  const openAssignmentDialog = (scheduleId?: number) => {
    // Сбрасываем информацию о редактировании задания
    setEditingAssignmentId(null);
    setSelectedAssignmentForEdit(null);
    
    // Если передан ID урока, находим его в списке
    if (scheduleId) {
      const schedule = getScheduleById(scheduleId);
      if (schedule) {
        // Убрана проверка статуса урока - теперь можно добавлять задания для любых уроков
        setSelectedSchedule(schedule);
      }
    } else {
      setSelectedSchedule(null);
    }
    
    // Сбрасываем форму и устанавливаем значения по умолчанию
    assignmentForm.reset({
      assignmentType: undefined,
      maxScore: "",
      description: "",
      scheduleId: scheduleId || undefined,
      subjectId: subjectId,
      classId: classId,
      teacherId: user?.id,
      subgroupId: subgroupId || undefined,
    });
    
    setIsAssignmentDialogOpen(true);
  };
  
  // Open dialog to edit an existing assignment
  const openEditAssignmentDialog = (assignment: Assignment) => {
    setEditingAssignmentId(assignment.id);
    setSelectedAssignmentForEdit(assignment);
    
    // Находим урок, к которому привязано задание
    if (assignment.scheduleId) {
      const schedule = getScheduleById(assignment.scheduleId);
      if (schedule) {
        setSelectedSchedule(schedule);
      }
    }
    
    // Заполняем форму данными задания
    assignmentForm.reset({
      assignmentType: assignment.assignmentType as any,
      maxScore: assignment.maxScore.toString(),
      description: assignment.description || "",
      scheduleId: assignment.scheduleId || undefined,
      subjectId: assignment.subjectId,
      classId: assignment.classId,
      teacherId: assignment.teacherId,
      subgroupId: assignment.subgroupId || undefined,
    });
    
    setIsAssignmentDialogOpen(true);
  };
  
  // Handle assignment deletion
  const handleDeleteAssignment = (id: number) => {
    if (window.confirm("Вы действительно хотите удалить задание? Все оценки, связанные с этим заданием, будут удалены.")) {
      deleteAssignmentMutation.mutate(id);
    }
  };
  
  // Open grade dialog to edit existing grade
  const openEditGradeDialog = (grade: Grade) => {
    setSelectedStudentId(grade.studentId);
    setSelectedDate(null);
    setEditingGradeId(grade.id);
    
    // Если есть scheduleId и в накопительной системе, нужно найти задание
    if (grade.scheduleId && classData?.gradingSystem === GradingSystemEnum.CUMULATIVE) {
      // Ищем урок
      const slot = lessonSlots.find(slot => slot.scheduleId === grade.scheduleId);
      
      if (slot && slot.assignments && slot.assignments.length > 0) {
        // Если есть привязка к заданию, используем ее
        if ('assignmentId' in grade && grade.assignmentId) {
          const assignment = slot.assignments.find(a => a.id === grade.assignmentId);
          if (assignment) {
            setSelectedAssignment(assignment);
            setSelectedAssignmentId(assignment.id);
          }
        } 
        // Иначе берем первое задание (для обратной совместимости)
        else if (slot.assignments.length > 0) {
          setSelectedAssignment(slot.assignments[0]);
          setSelectedAssignmentId(slot.assignments[0].id);
        }
      }
    } else {
      // Сбрасываем выбранное задание
      setSelectedAssignment(null);
      setSelectedAssignmentId(null);
    }
    
    // Сбрасываем и заполняем форму данными существующей оценки
    gradeForm.reset({
      studentId: grade.studentId,
      grade: grade.grade,
      comment: grade.comment || "", // Преобразуем null в пустую строку для полей формы
      gradeType: grade.gradeType,
      subjectId: grade.subjectId,
      classId: grade.classId,
      teacherId: grade.teacherId,
      scheduleId: grade.scheduleId || null,
      subgroupId: grade.subgroupId || null, // Важно! Сохраняем связь с подгруппой при редактировании
      assignmentId: 'assignmentId' in grade ? grade.assignmentId : null, // Для накопительной системы
    });
    
    setIsGradeDialogOpen(true);
  };
  
  // Open grade dialog to add new grade
  const openGradeDialog = (studentId: number, date?: string, scheduleId?: number) => {
    setSelectedStudentId(studentId);
    setSelectedDate(date || null);
    setEditingGradeId(null);
    
    // Сбросим выбранное задание
    setSelectedAssignment(null);
    setSelectedAssignmentId(null);
    
    // Убираем ограничение для добавления заданий на непроведенные уроки
    // Теперь учитель может добавлять задания на любые уроки, включая непроведенные
    let canAddGrade = true;
    
    // Оставляем ссылку на расписание, чтобы использовать её в форме для установки статуса "plannedFor"
    const schedule = scheduleId ? getScheduleById(scheduleId) : null;
    
    if (canAddGrade) {
      // Сбрасываем форму и устанавливаем значения по умолчанию
      gradeForm.reset({
        studentId: studentId,
        grade: undefined,
        comment: "",
        gradeType: "Текущая",
        subjectId: subjectId,
        classId: classId,
        teacherId: user?.id,
        date: date || null,
        scheduleId: scheduleId || null,
        subgroupId: subgroupId || null, // Важно! Сохраняем связь с подгруппой при создании новой оценки
        assignmentId: null, // Сбрасываем ID задания
      });
      
      setIsGradeDialogOpen(true);
    }
  };
  
  // Handle grade form submission
  const onGradeSubmit = (data: z.infer<typeof gradeFormSchema>) => {
    if (editingGradeId) {
      // Updating existing grade
      updateGradeMutation.mutate({
        id: editingGradeId, 
        data
      });
    } else {
      // Проверяем, существует ли уже оценка для данного ученика и задания
      const studentId = data.studentId;
      const assignmentId = data.assignmentId;
      const scheduleId = data.scheduleId;
      
      // Проверяем, не пытаемся ли мы выставить оценку за запланированное задание 
      // в непроведенном уроке
      if (assignmentId) {
        const assignment = assignments.find(a => a.id === assignmentId);
        const schedule = schedules.find(s => s.id === scheduleId);
        
        if (assignment?.plannedFor && schedule?.status !== 'conducted') {
          toast({
            title: "Ошибка",
            description: "Невозможно выставить оценку за запланированное задание, пока урок не проведен",
            variant: "destructive"
          });
          return; // Прерываем выполнение функции
        }
      }
      
      // Если у нас есть scheduleId и assignmentId и урок проведен, проверяем на дублирование
      if (assignmentId && scheduleId) {
        const schedule = lessonSlots.find(s => s.scheduleId === scheduleId);
        const isConducted = schedule?.status === "conducted";
        
        if (isConducted) {
          const existingGrade = grades.find(g => 
            g.studentId === studentId && 
            g.assignmentId === assignmentId
          );
          
          if (existingGrade) {
            toast({
              title: "Оценка уже существует",
              description: "Для этого ученика уже выставлена оценка за данное задание. Отредактируйте существующую оценку.",
              variant: "destructive",
            });
            return; // Прерываем выполнение функции
          }
        }
      }
      
      // Adding new grade - обеспечиваем, что scheduleId, assignmentId и subgroupId всегда будут корректно установлены,
      // так как это критически важно для правильного отображения оценок в журналах
      const finalData = {
        ...data,
        scheduleId: data.scheduleId || null,
        subgroupId: data.subgroupId || null, // Сохраняем связь с подгруппой
        assignmentId: data.assignmentId || null // Для накопительной системы - ID задания
      };
      addGradeMutation.mutate(finalData);
    }
  };
  
  // Функция для прямого ввода оценки
  const handleDirectGradeInput = (studentId: number, scheduleId: number, assignmentId: number, value: string) => {
    // Преобразуем строку в число
    const grade = parseInt(value, 10);
    
    // Получаем детали задания для проверки максимального балла
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) {
      toast({
        title: "Ошибка",
        description: "Задание не найдено",
        variant: "destructive"
      });
      return;
    }
    
    // Получаем максимальный балл для задания
    const maxScore = parseInt(assignment.maxScore);
    
    // Проверка на корректность ввода и на максимальный балл
    if (isNaN(grade) || grade < 0) {
      toast({
        title: "Некорректная оценка",
        description: "Оценка должна быть неотрицательным числом",
        variant: "destructive"
      });
      return;
    }
    
    // Проверка на превышение максимального балла за конкретное задание
    if (grade > maxScore) {
      toast({
        title: "Превышен максимальный балл",
        description: `Оценка не может быть больше ${maxScore} баллов для этого задания`,
        variant: "destructive"
      });
      return;
    }
    
    // Проверяем, существует ли уже оценка за данное задание для этого ученика
    const existingGrade = grades.find(g => 
      g.studentId === studentId && 
      g.assignmentId === assignmentId
    );
    
    if (existingGrade) {
      // Если оценка уже существует, обновляем её
      updateGradeMutation.mutate({
        id: existingGrade.id,
        data: { grade: grade }
      });
    } else {
      // Если оценки нет, создаем новую
      const newGrade: any = {
        studentId: studentId,
        subjectId: subjectId,
        classId: classId,
        teacherId: user?.id || 0,
        grade: grade,
        gradeType: assignment.assignmentType, // Используем тип задания как тип оценки
        scheduleId: scheduleId,
        subgroupId: subgroupId || null,
        assignmentId: assignmentId, // Важно: привязываем оценку к конкретному заданию
        comment: null
      };
      
      addGradeMutation.mutate(newGrade);
    }
  };

  // Handle grade deletion
  const handleDeleteGrade = (id: number) => {
    if (window.confirm("Вы действительно хотите удалить оценку?")) {
      deleteGradeMutation.mutate(id);
    }
  };
  
  // Function to format date as "DD Month" (e.g. "15 марта")
  const formatFullDate = (dateString: string) => {
    return format(new Date(dateString), "d MMMM", { locale: ru });
  };
  
  // Get all grades for a specific student and schedule slot
  const getStudentGradeForSlot = (studentId: number, slot: { date: string, scheduleId: number }, allGrades: Grade[]) => {
    // Фильтруем оценки для конкретного ученика
    const studentGrades = allGrades.filter(g => g.studentId === studentId);
    
    // Проверяем оценки - теперь только те, которые привязаны к конкретному scheduleId
    return studentGrades.filter(g => 
      // Проверяем только оценки, привязанные к конкретному уроку по scheduleId
      g.scheduleId === slot.scheduleId
    );
  };
  
  // Функция для получения читаемого названия типа оценки
  const getGradeTypeName = (gradeType: string): string => {
    const gradeTypes: Record<string, string> = {
      'test': 'Контрольная работа',
      'exam': 'Экзамен',
      'homework': 'Домашняя работа',
      'project': 'Проект',
      'classwork': 'Классная работа',
      'Текущая': 'Текущая оценка',
      'Контрольная': 'Контрольная работа',
      'Экзамен': 'Экзамен',
      'Практическая': 'Практическая работа',
      'Домашняя': 'Домашняя работа'
    };
    
    return gradeTypes[gradeType] || gradeType;
  };

  // Function to get styling for grade pills (5-point system) - visionOS inspired
  const getGradePillStyle = useCallback((grade: number): string => {
    if (grade === 5) return 'bg-green-500/20 text-green-700 border border-green-600/40';
    if (grade === 4) return 'bg-sky-500/20 text-sky-700 border border-sky-600/40';
    if (grade === 3) return 'bg-amber-500/20 text-amber-700 border border-amber-600/40';
    if (grade === 2) return 'bg-orange-500/20 text-orange-700 border border-orange-600/40';
    if (grade === 1) return 'bg-red-500/20 text-red-700 border border-red-600/40';
    return 'bg-slate-500/20 text-slate-700 border border-slate-600/40'; // Default/fallback
  }, []);

  // Фильтрация оценок в зависимости от подгруппы
  const filteredGrades = useMemo(() => {
    // Защита от пустых данных
    if (!grades || !grades.length) {
      return [];
    }
    
    // Логируем для отладки
    console.log("Фильтрация оценок:", {
      subgroupId,
      gradeCount: grades.length,
      scheduleCount: schedules.length,
      subjectId,
      studentSubgroupCount: studentSubgroups.length
    });
    
    // Если выбрана конкретная подгруппа (просмотр журнала подгруппы)
    if (subgroupId) {
      // 1. Получаем ID студентов этой подгруппы
      const subgroupStudentIds = studentSubgroups
        .filter(ss => ss.subgroupId === subgroupId)
        .map(ss => ss.studentId);
      
      console.log(`Студенты в подгруппе ${subgroupId}:`, subgroupStudentIds);
      
      // 2. Получаем все расписания (уроки) для этой подгруппы
      const subgroupScheduleIds = schedules
        .filter(schedule => schedule.subgroupId === subgroupId)
        .map(schedule => schedule.id);
      
      console.log(`Расписания для подгруппы ${subgroupId}:`, subgroupScheduleIds);
      
      // 3. Фильтруем оценки только для этой подгруппы
      const result = grades.filter(grade => {
        // Базовая проверка - оценка должна быть для этого предмета
        if (grade.subjectId !== subjectId) {
          return false;
        }
        
        // Используем два основных критерия проверки:
        
        // КРИТЕРИЙ 1: Оценка привязана к уроку этой конкретной подгруппы
        const isLinkedToSubgroupSchedule = grade.scheduleId && 
                                           subgroupScheduleIds.includes(grade.scheduleId);
        
        if (isLinkedToSubgroupSchedule) {
          return true; // Это главный критерий - показываем такие оценки всегда
        }
        
        // КРИТЕРИЙ 2: Студент в этой подгруппе и оценка либо:
        // - явно маркирована этой подгруппой через subgroupId
        // - не привязана ни к какому расписанию вообще (общая оценка)
        if (subgroupStudentIds.includes(grade.studentId)) {
          // Есть явная метка подгруппы, и это именно наша подгруппа
          if (grade.subgroupId === subgroupId) {
            return true;
          }
          
          // Оценка без привязки к расписанию, но студент в нашей подгруппе
          // Показываем ТОЛЬКО если нет явной привязки к другой подгруппе
          if (!grade.scheduleId && grade.subgroupId === null) {
            return true;
          }
        }
        
        return false;
      });
      
      console.log(`Отфильтровано ${result.length} оценок для подгруппы ${subgroupId}`);
      return result;
    } 
    // Если просматриваем журнал основного предмета (не подгруппы)
    else {
      // 1. Собираем все ID подгрупп, связанных с этим предметом
      const relatedSubgroupIds = schedules
        .filter(schedule => 
          schedule.subjectId === subjectId && 
          schedule.subgroupId !== null
        )
        .map(schedule => schedule.subgroupId)
        .filter((id): id is number => id !== null);
      
      // Убираем дубликаты, если есть
      const uniqueSubgroupIds = Array.from(new Set(relatedSubgroupIds));
      console.log(`Подгруппы для предмета ${subjectId}:`, uniqueSubgroupIds);
      
      // 2. Собираем все расписания (уроки) этих подгрупп
      const subgroupScheduleIds = schedules
        .filter(schedule => 
          schedule.subjectId === subjectId && 
          schedule.subgroupId !== null
        )
        .map(schedule => schedule.id);
      
      console.log(`Расписания подгрупп предмета ${subjectId}:`, subgroupScheduleIds);
      
      // 3. Собираем ID студентов, входящих в эти подгруппы
      const subgroupStudentIds = new Set<number>();
      
      // Обрабатываем каждую подгруппу связанную с этим предметом
      uniqueSubgroupIds.forEach(sgId => {
        const studentsInSubgroup = studentSubgroups
          .filter(ss => ss.subgroupId === sgId)
          .map(ss => ss.studentId);
        
        studentsInSubgroup.forEach(id => subgroupStudentIds.add(id));
      });
      
      console.log(`Студенты в подгруппах предмета ${subjectId}:`, Array.from(subgroupStudentIds));
      
      // 4. Фильтруем оценки для основного предмета, исключая подгруппы
      const result = grades.filter(grade => {
        // Базовая проверка - оценка должна быть для этого предмета
        if (grade.subjectId !== subjectId) {
          return false;
        }
        
        // КРИТЕРИЙ 1: Оценка не должна быть связана с уроком в подгруппе
        if (grade.scheduleId && subgroupScheduleIds.includes(grade.scheduleId)) {
          return false; // Оценка связана с уроком подгруппы, не показываем в основном журнале
        }
        
        // КРИТЕРИЙ 2: Оценка не должна быть явно помечена как оценка подгруппы
        if (grade.subgroupId !== null && uniqueSubgroupIds.includes(grade.subgroupId)) {
          return false; // Явная метка подгруппы, не показываем в основном журнале
        }
        
        // КРИТЕРИЙ 3: Если студент состоит в подгруппе по этому предмету,
        // то не показываем его оценки без расписания в основном журнале
        // (они должны быть только в журнале подгруппы)
        if (Array.from(subgroupStudentIds).includes(grade.studentId) && !grade.scheduleId) {
          return false;
        }
        
        // В остальных случаях показываем оценку в основном журнале
        return true;
      });
      
      console.log(`Отфильтровано ${result.length} оценок для основного предмета ${subjectId}`);
      return result;
    }
  }, [grades, subgroupId, schedules, filteredStudents, subjectId, studentSubgroups]);

  // Calculate average grade for a student with weight based on grade type
  const calculateAverageGrade = (studentId: number) => {
    const studentGrades = filteredGrades.filter(g => g.studentId === studentId);
    if (studentGrades.length === 0) return "-";
    
    // Если используется накопительная система оценивания
    if (classData?.gradingSystem === GradingSystemEnum.CUMULATIVE) {
      // Для накопительной системы используем другой алгоритм расчета
      // Считаем сумму полученных баллов и максимально возможных для всех заданий
      
      let totalEarnedScore = 0;
      let totalMaxScore = 0;
      
      // Для каждой оценки находим соответствующее задание, чтобы получить максимальный балл
      studentGrades.forEach(grade => {
        // Находим урок, на который эта оценка
        const slot = lessonSlots.find(slot => slot.scheduleId === grade.scheduleId);
        if (slot && slot.assignments && slot.assignments.length > 0) {
          // Если нет конкретной связи с заданием, берем первое задание урока
          const assignmentId = grade.assignmentId || slot.assignments[0].id;
          
          // Находим задание с соответствующим ID
          const assignment = slot.assignments.find(a => a.id === assignmentId);
          
          if (assignment) {
            // Если нашли задание, добавляем баллы
            totalEarnedScore += grade.grade;
            totalMaxScore += Number(assignment.maxScore);
          }
        }
      });
      
      // Если нет максимального балла, возвращаем прочерк
      if (totalMaxScore === 0) return "-";
      
      // Вычисляем процент выполнения и форматируем его
      const percentage = (totalEarnedScore / totalMaxScore) * 100;
      return `${percentage.toFixed(1)}%`;
    } else {
      // Для пятибалльной системы оценивания - используем старый алгоритм с весами
      
      // Весовые коэффициенты для разных типов оценок
      const weights: Record<string, number> = {
        'test': 2,
        'exam': 3,
        'homework': 1,
        'project': 2,
        'classwork': 1,
        'Текущая': 1,
        'Контрольная': 2,
        'Экзамен': 3,
        'Практическая': 1.5,
        'Домашняя': 1
      };
      
      let weightedSum = 0;
      let totalWeight = 0;
      
      studentGrades.forEach(grade => {
        const weight = weights[grade.gradeType] || 1;
        weightedSum += grade.grade * weight;
        totalWeight += weight;
      });
      
      // Если нет оценок с весами, возвращаем "-"
      if (totalWeight === 0) return "-";
      
      const average = weightedSum / totalWeight;
      return average.toFixed(1);
    }
  };
  
  // Determine if a lesson is conducted
  const isLessonConducted = (scheduleId: number) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    return schedule?.status === 'conducted';
  };
  

  
  // Проверяет, можно ли добавить оценку для урока в накопительной системе
  const canAddGradeToLesson = (scheduleId: number, slot: LessonSlot) => {
    // Для пятибалльной системы больше не требуется, чтобы урок был проведен
    if (!classData || classData.gradingSystem !== GradingSystemEnum.CUMULATIVE) {
      // Убрана проверка statusa урока - можно добавлять оценки на любой урок
      return true;
    }
    
    // Для накопительной системы важно, чтобы были задания, но не требуется, чтобы урок был проведен
    // Это позволяет добавлять задания и для непроведенных уроков
    return slot.assignments && slot.assignments.length > 0;
  };
  
  // Функция для определения должен ли клик по заголовку колонки открыть диалог статуса или диалог добавления задания
  const handleHeaderClick = (slot: LessonSlot) => {
    if (!canEditGrades) return;
    
    // Находим урок и проверяем его статус
    const schedule = getScheduleById(slot.scheduleId);
    if (!schedule) return;
    
    // Открываем диалог с выбором действия (просмотр/изменение статуса или добавление задания)
    // Используем контекстное меню или диалог с выбором
    setSelectedSchedule(schedule);
    setIsContextDialogOpen(true);
  };
  
  // Loading state
  const isLoading = isClassLoading || isSubjectLoading || isStudentsLoading || isSchedulesLoading || isGradesLoading;
  
  // Redirect if user is not logged in
  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);
  
  // Функция экспорта данных таблицы в CSV
  const exportToCSV = () => {
    if (!classData || !subjectData || !filteredStudents.length) return;
    
    // Создаем заголовок таблицы
    let csvContent = "Ученик,";
    
    // Добавляем даты уроков в заголовок
    lessonSlots.forEach(slot => {
      csvContent += `${slot.formattedDate},`;
    });
    
    csvContent += "Средний балл\n";
    
    // Добавляем данные по каждому ученику
    filteredStudents.forEach(student => {
      const studentName = `${student.lastName} ${student.firstName}`;
      csvContent += `${studentName},`;
      
      // Добавляем оценки по каждому уроку
      lessonSlots.forEach(slot => {
        const grades = getStudentGradeForSlot(student.id, slot, filteredGrades);
        if (grades.length > 0) {
          // Если есть несколько оценок для одного урока, разделяем их точкой с запятой
          csvContent += grades.map(g => g.grade).join(";");
        }
        csvContent += ",";
      });
      
      // Добавляем средний балл
      csvContent += calculateAverageGrade(student.id) + "\n";
    });
    
    // Создаем Blob для скачивания
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Создаем временную ссылку для скачивания файла
    const link = document.createElement("a");
    const fileName = `Оценки_${subjectData?.name}_${classData?.name}_${new Date().toLocaleDateString()}.csv`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <MainLayout> {/* Applied page background */}
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8"> {/* Adjusted padding and spacing */}
        <Button
          onClick={goBack}
          className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-medium text-slate-800 bg-white/15 backdrop-filter backdrop-blur-lg shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.45),inset_0_1px_2px_rgba(0,0,0,0.05),0_15px_30px_-8px_rgba(0,0,0,0.08),_0_8px_20px_-12px_rgba(0,0,0,0.05)] hover:bg-white/25 hover:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.55),inset_0_1px_2px_rgba(0,0,0,0.08),0_18px_35px_-8px_rgba(0,0,0,0.1),0_10px_25px_-12px_rgba(0,0,0,0.07)] hover:-translate-y-px active:scale-[0.98] active:bg-white/20 active:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3),inset_0_1px_3px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out mb-6" // Added mb-6 for spacing
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к списку
        </Button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"> {/* Adjusted for responsiveness */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900"> {/* Styled title */}
              Журнал оценок
              {subgroupData ? (
                <span className="text-[rgb(2,191,122)] font-semibold ml-2"> {/* Styled subgroup name */}
                  ({subgroupData.name})
                </span>
              ) : null}
            </h1>
            <p className="text-slate-600 mt-1"> {/* Styled description */}
              {subgroupData 
                ? `Просмотр и редактирование оценок учеников подгруппы "${subgroupData.name}"`
                : "Просмотр и редактирование оценок учеников класса"}
            </p>
          </div>
          <div className="flex gap-3 self-start sm:self-center"> {/* Adjusted gap and alignment */}
            {/* Показываем кнопку создания задания только если выбран накопительный тип оценивания */}
            {classData?.gradingSystem === GradingSystemEnum.CUMULATIVE && canEditGrades && (
              <Button
                onClick={() => openAssignmentDialog()}
                disabled={isLoading}
                className="bg-[rgb(2,191,122)] text-white hover:bg-[rgb(2,191,122)]/90 focus:ring-2 focus:ring-[rgb(2,191,122)]/50 rounded-md px-4 py-2 flex items-center gap-2" // Primary button style
              >
                <PlusCircle className="h-4 w-4" />
                Добавить задание
              </Button>
            )}
            <Button
              onClick={exportToCSV}
              disabled={isLoading || !filteredStudents.length}
              className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-medium text-slate-800 bg-white/15 backdrop-filter backdrop-blur-lg shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.45),inset_0_1px_2px_rgba(0,0,0,0.05),0_15px_30px_-8px_rgba(0,0,0,0.08),_0_8px_20px_-12px_rgba(0,0,0,0.05)] hover:bg-white/25 hover:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.55),inset_0_1px_2px_rgba(0,0,0,0.08),0_18px_35px_-8px_rgba(0,0,0,0.1),0_10px_25px_-12px_rgba(0,0,0,0.07)] hover:-translate-y-px active:scale-[0.98] active:bg-white/20 active:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3),inset_0_1px_3px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
            >
              <Download className="h-4 w-4" />
              Экспорт
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-[300px]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8"> {/* Increased spacing for better separation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Increased gap */}
              {/* Class Info Card - Applying Glassmorphism */}
              <Card className="bg-white/30 backdrop-filter backdrop-blur-xl rounded-2xl shadow-lg border border-white/20">
                <CardHeader className="bg-transparent">
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    <div className="bg-white/20 p-2 rounded-full backdrop-filter backdrop-blur-sm shadow-sm mr-3"> {/* mr-3 for spacing from title */}
                      <GraduationCapIcon className="h-5 w-5 text-slate-700" />
                    </div>
                    Информация о классе
                  </CardTitle>
                </CardHeader>
                <CardContent className="bg-transparent">
                  {classData && (
                    <div className="space-y-3"> {/* Adjusted spacing */}
                      <div>
                        <h3 className="font-medium text-slate-700">Класс:</h3>
                        <p className="text-lg text-slate-800">{classData.name}</p>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-700">Всего учеников:</h3>
                        <p className="text-lg text-slate-800">
                          {subgroupId 
                            ? `${filteredStudents.length} (из подгруппы)`
                            : students.length}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Subject Info Card - Applying Glassmorphism */}
              <Card className="bg-white/30 backdrop-filter backdrop-blur-xl rounded-2xl shadow-lg border border-white/20">
                <CardHeader className="bg-transparent">
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    <div className="bg-white/20 p-2 rounded-full backdrop-filter backdrop-blur-sm shadow-sm mr-3"> {/* mr-3 for spacing from title */}
                      <BookOpenIcon className="h-5 w-5 text-slate-700" />
                    </div>
                    Информация о предмете
                  </CardTitle>
                </CardHeader>
                <CardContent className="bg-transparent">
                  {subjectData && (
                    <div className="space-y-3"> {/* Adjusted spacing */}
                      <div>
                        <h3 className="font-medium text-slate-700">Предмет:</h3>
                        <p className="text-lg text-slate-800">{subjectData.name}</p>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-700">Всего уроков:</h3>
                        <p className="text-lg text-slate-800">{lessonSlots.length}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <Card className="bg-white/30 backdrop-filter backdrop-blur-xl rounded-2xl shadow-lg border border-white/20">
              <CardHeader className="bg-transparent pt-4 pb-3"> {/* Adjusted padding */}
                <CardTitle className="flex items-center gap-2 text-slate-800 text-xl"> {/* Adjusted size */}
                  <CalendarIcon className="h-5 w-5 text-slate-700" />
                  Оценки по предмету
                  {subgroupId && subgroupData && (
                    <span className="ml-2 text-sm bg-[rgb(2,191,122)]/10 text-[rgb(2,191,122)] px-2.5 py-1 rounded-lg font-semibold"> {/* Styled subgroup badge */}
                      Подгруппа: {subgroupData.name}
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-slate-600 mt-1"> {/* Adjusted margin */}
                  {subgroupId 
                    ? `Журнал показывает только учеников из выбранной подгруппы. `
                    : ''}
                  Нажмите на пустую ячейку, чтобы добавить оценку. Нажмите на заголовок даты урока для действий с уроком.
                </CardDescription>
              </CardHeader>
              <CardContent className="bg-transparent p-0"> {/* Removed CardContent padding, will apply to div.overflow-auto */}
                <div className="overflow-auto rounded-b-2xl p-0.5"> {/* Added rounding to match card, added slight padding for table border visibility */}
                  <Table className="min-w-full border-collapse"> {/* Removed default Table border, using cell borders */}
                    <TableHeader>
                      <TableRow className="border-b border-slate-300/50">
                        <TableHead className="bg-white/15 backdrop-blur-md sticky left-0 z-20 px-4 py-3 text-left text-sm font-semibold text-slate-800 shadow-sm border-b border-slate-300/50"> {/* Styled sticky student header */}
                          Ученик
                        </TableHead>
                        {/* Для каждого урока (lessonSlot) */}
                        {lessonSlots.map((slot) => {
                          const isLessonConducted = schedules.find(s => s.id === slot.scheduleId)?.status === 'conducted';
                          
                          if (classData?.gradingSystem === GradingSystemEnum.CUMULATIVE && 
                              slot.assignments && slot.assignments.length > 0) {
                            return (
                              <React.Fragment key={`header-${slot.date}-${slot.scheduleId}`}>
                                <TableHead 
                                  colSpan={slot.assignments.length}
                                  className="bg-white/15 backdrop-blur-md text-center border-b border-l border-slate-300/50 px-1 pt-2 pb-1 text-sm font-semibold text-slate-800 cursor-pointer hover:bg-white/20 transition-colors"
                                  onClick={() => canEditGrades ? handleHeaderClick(slot) : null}
                                >
                                  <div className="flex flex-col items-center justify-center mb-1">
                                    <span className="font-semibold">{slot.formattedDate}</span>
                                    {slot.startTime && <span className="text-xs text-slate-600">({slot.startTime.slice(0, 5)})</span>}
                                    {isLessonConducted && (
                                      <div className="flex items-center text-green-600" title="Урок проведен">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        {canEditGrades && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); openAssignmentDialog(slot.scheduleId); }}
                                            className="ml-1 text-[rgb(2,191,122)] hover:text-[rgb(2,191,122)]/90 focus:outline-none"
                                            title="Добавить задание к этому уроку"
                                          >
                                            <PlusCircle className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex justify-center space-x-0.5">
                                    {slot.assignments.map(assignment => (
                                      <div key={assignment.id} className="flex-1 text-xs min-w-[40px] max-w-[60px]"> {/* Added max-width */}
                                        <span 
                                          className={`px-1.5 py-1 rounded-md border block cursor-pointer transition-colors truncate ${getAssignmentTypeColor(assignment.assignmentType)}`} // Using new getAssignmentTypeColor
                                          title={`${getAssignmentTypeName(assignment.assignmentType)}: ${assignment.maxScore} баллов. Нажмите для редактирования.`}
                                          onClick={(e) => { e.stopPropagation(); openEditAssignmentDialog(assignment); }}
                                        >
                                          {getAssignmentTypeName(assignment.assignmentType).substring(0, 1)}{assignment.maxScore} {/* Compact display */}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </TableHead>
                              </React.Fragment>
                            );
                          } else {
                            return (
                              <TableHead 
                                key={`${slot.date}-${slot.scheduleId}`} 
                                className="bg-white/15 backdrop-blur-md text-center border-b border-l border-slate-300/50 px-3 py-3 text-sm font-semibold text-slate-800 cursor-pointer hover:bg-white/20 transition-colors"
                                onClick={() => canEditGrades ? handleHeaderClick(slot) : null}
                              >
                                <div className="flex flex-col items-center justify-center">
                                  {slot.formattedDate}
                                  {slot.startTime && <span className="text-xs text-slate-600">({slot.startTime.slice(0, 5)})</span>}
                                  {isLessonConducted && (
                                    <div className="flex items-center text-green-600" title="Урок проведен">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      {classData?.gradingSystem === GradingSystemEnum.CUMULATIVE && canEditGrades && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); openAssignmentDialog(slot.scheduleId);}}
                                            className="ml-1 text-[rgb(2,191,122)] hover:text-[rgb(2,191,122)]/90 focus:outline-none"
                                          title="Добавить задание к этому уроку"
                                        >
                                          <PlusCircle className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableHead>
                            );
                          }
                        })}
                        <TableHead className="bg-white/15 backdrop-blur-md text-center sticky right-0 z-20 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm border-b border-l border-slate-300/50">
                          Средний балл
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => (
                        <TableRow key={student.id} className="border-b border-slate-300/50 hover:bg-slate-500/5"> {/* Styled TableRow */}
                          <TableCell className="font-medium bg-slate-50/70 backdrop-blur-sm sticky left-0 z-10 px-4 py-2 text-sm text-slate-800 border-r border-slate-300/50"> {/* Styled sticky student cell */}
                            {student.lastName} {student.firstName}
                          </TableCell>
                          {/* Для каждого урока (lessonSlot) */}
                          {lessonSlots.map((slot) => {
                            const studentGrades = getStudentGradeForSlot(student.id, slot, filteredGrades);
                            
                            if (classData?.gradingSystem === GradingSystemEnum.CUMULATIVE && 
                                slot.assignments && slot.assignments.length > 0) {
                              return (
                                <React.Fragment key={`${slot.date}-${slot.scheduleId}-${student.id}`}> {/* Ensure unique key for fragment */}
                                  {slot.assignments.map((assignment) => {
                                    const assignmentGrade = studentGrades.find(g => g.assignmentId === assignment.id);
                                    return (
                                      <TableCell 
                                        key={`${slot.scheduleId}-${assignment.id}-${student.id}`} // Ensure unique key for cell
                                        className={`text-center p-1 border-r border-slate-200/60 ${getAssignmentTypeColor(assignment.assignmentType).split(' ').find(cls => cls.startsWith('bg-'))}`} // Apply only bg color part
                                      >
                                        {assignmentGrade ? (
                                          <div className="relative group">
                                            <span 
                                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-help bg-white/80"
                                              title={assignmentGrade.comment ? assignmentGrade.comment : 'Нажмите для редактирования'}
                                            >
                                              {assignmentGrade.grade}
                                            </span>
                                            
                                            {canEditGrades && (
                                              <div className="absolute invisible group-hover:visible -top-2 -right-2 flex space-x-1">
                                                <Button
                                                  variant="outline"
                                                  size="icon"
                                                  className="h-5 w-5 p-0 bg-background border-muted-foreground/50"
                                                  onClick={() => openEditGradeDialog(assignmentGrade)}
                                                  title="Редактировать оценку"
                                                >
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 20h9"></path>
                                                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                                                  </svg>
                                                </Button>
                                                <Button
                                                  variant="outline"
                                                  size="icon"
                                                  className="h-5 w-5 p-0 bg-background border-destructive text-destructive"
                                                  onClick={() => handleDeleteGrade(assignmentGrade.id)}
                                                  title="Удалить оценку"
                                                >
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 6h18"></path>
                                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                                  </svg>
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        ) : canEditGrades && isLessonConducted(slot.scheduleId) ? (
                                          <div className="flex items-center justify-center">
                                            <input
                                              type="text"
                                              className="w-10 h-7 text-center text-sm border border-slate-300/70 rounded-md bg-white/50 focus:ring-1 focus:ring-[rgb(2,191,122)] focus:border-[rgb(2,191,122)] placeholder:text-slate-400/70" // Styled input
                                              placeholder={`/${assignment.maxScore}`}
                                              maxLength={assignment.maxScore.toString().length} // Dynamic maxLength
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  const value = e.currentTarget.value;
                                                  handleDirectGradeInput(student.id, slot.scheduleId, assignment.id, value);
                                                  e.currentTarget.value = ''; // Clear after submit
                                                }
                                              }}
                                              title={`Введите оценку (макс. ${assignment.maxScore}) и нажмите Enter`}
                                            />
                                          </div>
                                        ) : (
                                          <span className="text-slate-400">-</span> // Softer placeholder for empty/non-editable
                                        )}
                                      </TableCell>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            } else {
                              // Standard 5-point system or no assignments
                              return (
                                <TableCell 
                                  key={`${slot.date}-${slot.scheduleId}-${student.id}`} // Ensure unique key for cell
                                  className="text-center p-2 border-r border-slate-200/60" // Adjusted padding and border
                                >
                                  {studentGrades.length > 0 ? (
                                    <div className="flex flex-wrap justify-center gap-1 items-center">
                                      {studentGrades.map((grade) => (
                                        <div key={grade.id} className="relative group">
                                          <span 
                                            className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold cursor-help ${getGradePillStyle(grade.grade)}`} // Applied new getGradePillStyle, increased padding & rounding
                                            title={`${getGradeTypeName(grade.gradeType)}${grade.comment ? ': ' + grade.comment : ''}`}
                                          >
                                            {grade.grade}
                                          </span>
                                          {canEditGrades && (
                                            <div className="absolute invisible group-hover:visible -top-3 -right-3 z-30 flex space-x-1.5"> {/* Adjusted positioning and spacing */}
                                              <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7 p-0 bg-white/80 backdrop-blur-md border-slate-400/70 hover:bg-slate-200/80 rounded-full shadow-lg" // Enhanced button style
                                                onClick={() => openEditGradeDialog(grade)}
                                                title="Редактировать оценку"
                                              >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7 p-0 bg-white/80 backdrop-blur-md border-red-500/70 text-red-500 hover:bg-red-100/80 rounded-full shadow-lg" // Enhanced button style
                                                onClick={() => handleDeleteGrade(grade.id)}
                                                title="Удалить оценку"
                                              >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : canEditGrades && isLessonConducted(slot.scheduleId) ? (
                                    <div 
                                      className="w-10 h-7 border-2 border-dashed border-slate-300/70 rounded-lg flex items-center justify-center text-slate-400/90 cursor-pointer hover:border-[rgb(2,191,122)]/70 hover:text-[rgb(2,191,122)] transition-colors duration-150" // Enhanced placeholder
                                      onClick={() => openGradeDialog(student.id, slot.date, slot.scheduleId)}
                                      title="Нажмите для добавления оценки"
                                    >
                                      <PlusCircle className="h-4 w-4" />
                                    </div>
                                  ) : (
                                    <span className="text-slate-400/90">-</span> 
                                  )}
                                </TableCell>
                              );
                            }
                          })}
                          <TableCell className="text-center font-medium sticky right-0 z-10 bg-slate-50/80 backdrop-blur-sm px-3 py-2 text-sm text-slate-800 shadow-sm"> {/* Enhanced sticky average cell */}
                            {calculateAverageGrade(student.id)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>


          </div>
        )}
        
        {/* Dialog for changing lesson status */}
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white/50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl border border-white/20">
            <DialogHeader className="bg-transparent pt-2">
              <DialogTitle className="text-slate-800 text-xl">Статус урока</DialogTitle>
              <DialogDescription className="text-slate-600">
                {selectedSchedule && `Изменение статуса урока: ${
                  format(new Date(selectedSchedule.scheduleDate || ''), "dd.MM.yyyy", { locale: ru })
                } (${selectedSchedule.startTime.slice(0, 5)} - ${selectedSchedule.endTime.slice(0, 5)})`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant={selectedSchedule?.status === 'not_conducted' ? "default" : "outline"} 
                    className={`w-full py-8 flex flex-col items-center justify-center gap-2 rounded-lg transition-all
                                ${selectedSchedule?.status === 'not_conducted' 
                                  ? 'bg-orange-500/80 text-white hover:bg-orange-600/90 shadow-md ring-2 ring-orange-500/50' 
                                  : 'bg-slate-500/20 text-slate-700 hover:bg-slate-500/30 border-slate-400/50'}`}
                    onClick={() => handleScheduleStatusUpdate('not_conducted')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>Не проведен</span>
                  </Button>
                  
                  <Button 
                    variant={selectedSchedule?.status === 'conducted' ? "default" : "outline"} 
                    className={`w-full py-8 flex flex-col items-center justify-center gap-2 rounded-lg transition-all
                                ${selectedSchedule?.status === 'conducted' 
                                  ? 'bg-green-500/80 text-white hover:bg-green-600/90 shadow-md ring-2 ring-green-500/50' 
                                  : 'bg-slate-500/20 text-slate-700 hover:bg-slate-500/30 border-slate-400/50'}`}
                    onClick={() => handleScheduleStatusUpdate('conducted')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Проведен</span>
                  </Button>
                </div>
                
                <p className="text-sm text-slate-600">
                  Статус урока влияет на возможность выставления оценок.
                  Оценки можно ставить только для проведенных уроков.
                </p>
                
                {selectedSchedule && new Date() < new Date(`${selectedSchedule.scheduleDate}T${selectedSchedule.endTime}`) && (
                  <>
                    <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertTitle className="font-semibold">Внимание</AlertTitle>
                      <AlertDescription>
                        Урок еще не завершился. Отметить урок как проведенный можно только после его окончания.
                      </AlertDescription>
                    </Alert>
                    
                    {classData?.gradingSystem === GradingSystemEnum.CUMULATIVE && (
                      <div className="mt-4">
                        <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-700 rounded-lg">
                          <CalendarIcon className="h-4 w-4 text-amber-600" />
                          <AlertTitle className="font-semibold">Запланировать задание</AlertTitle>
                          <AlertDescription>
                            Вы можете запланировать задание к этому уроку заранее. Запланированные задания не влияют на среднюю оценку до проведения урока.
                          </AlertDescription>
                        </Alert>
                        
                        <Button 
                          variant="outline" 
                          className="w-full mt-2 text-amber-700 border-amber-500/50 hover:bg-amber-500/20 hover:text-amber-800 rounded-md"
                          onClick={() => {
                            setIsStatusDialogOpen(false);
                            if (selectedSchedule) {
                              assignmentForm.reset({
                                assignmentType: AssignmentTypeEnum.HOMEWORK,
                                maxScore: "10",
                                description: "",
                                scheduleId: selectedSchedule.id,
                                subjectId: subjectId,
                                classId: classId,
                                teacherId: user?.id || 0,
                                subgroupId: subgroupId || null,
                                plannedFor: true 
                              });
                              setSelectedSchedule(selectedSchedule);
                              setIsAssignmentDialogOpen(true);
                            }
                          }}
                        >
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Запланировать задание
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            <DialogFooter className="bg-transparent pt-4">
              <Button 
                variant="ghost" 
                onClick={() => setIsStatusDialogOpen(false)}
                className="bg-slate-500/20 text-slate-700 hover:bg-slate-500/30 focus:ring-2 focus:ring-slate-500/50 rounded-md"
              >
                Закрыть
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Диалог для отметки посещаемости */}
        <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Отметка посещаемости</DialogTitle>
              <DialogDescription>
                Отметьте присутствие студентов на уроке
              </DialogDescription>
            </DialogHeader>
            
            {selectedSchedule && (
              <AttendanceForm 
                schedule={selectedSchedule}
                onClose={() => setIsAttendanceDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
        
        {/* Dialog for adding an assignment */}
        <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingAssignmentId ? "Изменить задание" : "Добавить задание"}</DialogTitle>
              <DialogDescription>
                {editingAssignmentId 
                  ? "Измените параметры существующего задания" 
                  : "Создайте новое задание для накопительной системы оценивания."}
              </DialogDescription>
            </DialogHeader>
            <Form {...assignmentForm}>
              <form onSubmit={assignmentForm.handleSubmit(data => {
                if (editingAssignmentId) {
                  updateAssignmentMutation.mutate({
                    id: editingAssignmentId,
                    ...data
                  });
                } else {
                  addAssignmentMutation.mutate(data);
                }
              })}>
                <div className="grid gap-4 py-4">
                  <FormField
                    control={assignmentForm.control}
                    name="assignmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Тип задания</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите тип задания" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={AssignmentTypeEnum.CONTROL_WORK}>Контрольная работа</SelectItem>
                            <SelectItem value={AssignmentTypeEnum.TEST_WORK}>Проверочная работа</SelectItem>
                            <SelectItem value={AssignmentTypeEnum.CURRENT_WORK}>Текущая работа</SelectItem>
                            <SelectItem value={AssignmentTypeEnum.HOMEWORK}>Домашнее задание</SelectItem>
                            <SelectItem value={AssignmentTypeEnum.CLASSWORK}>Работа на уроке</SelectItem>
                            <SelectItem value={AssignmentTypeEnum.PROJECT_WORK}>Работа с проектом</SelectItem>
                            <SelectItem value={AssignmentTypeEnum.CLASS_ASSIGNMENT}>Классная работа</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={assignmentForm.control}
                    name="maxScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Максимальный балл</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Введите максимальный балл" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={assignmentForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Описание (опционально)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Введите описание задания"
                            onChange={field.onChange}
                            value={field.value || ""}
                            ref={field.ref}
                            name={field.name}
                            onBlur={field.onBlur}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={assignmentForm.control}
                    name="plannedFor"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Запланированное задание
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Оценки за это задание будут учитываться в среднем проценте только после проведения урока
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  {!selectedSchedule && !editingAssignmentId && (
                    <FormField
                      control={assignmentForm.control}
                      name="scheduleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Урок</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите урок" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {schedules
                                .filter(s => s.subjectId === subjectId && 
                                             (subgroupId ? s.subgroupId === subgroupId : true))
                                .map(schedule => (
                                  <SelectItem key={schedule.id} value={schedule.id.toString()}>
                                    {format(new Date(schedule.scheduleDate || ''), "dd.MM.yyyy", { locale: ru })} - {schedule.startTime}
                                    {schedule.subgroupId && ` (${allSubgroups.find(sg => sg.id === schedule.subgroupId)?.name || 'Подгруппа'})`}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                <DialogFooter className="flex justify-between">
                  {editingAssignmentId && (
                    <Button 
                      type="button" 
                      variant="destructive"
                      onClick={() => {
                        if (window.confirm("Вы уверены, что хотите удалить это задание? Все связанные оценки будут удалены.")) {
                          deleteAssignmentMutation.mutate(editingAssignmentId);
                          setIsAssignmentDialogOpen(false);
                        }
                      }}
                      disabled={deleteAssignmentMutation.isPending}
                    >
                      {deleteAssignmentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Удалить
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    disabled={editingAssignmentId 
                      ? updateAssignmentMutation.isPending 
                      : addAssignmentMutation.isPending}
                  >
                    {(editingAssignmentId 
                      ? updateAssignmentMutation.isPending 
                      : addAssignmentMutation.isPending) && 
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingAssignmentId ? "Сохранить изменения" : "Создать задание"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Dialog for adding a grade */}
        <Dialog open={isGradeDialogOpen} onOpenChange={setIsGradeDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingGradeId ? "Редактировать оценку" : "Добавить оценку"}</DialogTitle>
              <DialogDescription>
                {selectedStudentId ? 
                  `${editingGradeId ? "Редактирование" : "Добавление"} оценки для ученика: ${
                    filteredStudents.find(s => s.id === selectedStudentId)?.lastName || ""
                  } ${
                    filteredStudents.find(s => s.id === selectedStudentId)?.firstName || ""
                  }${selectedDate ? ` (${selectedDate})` : ""}` : 
                  `${editingGradeId ? "Редактирование" : "Добавление"} оценки`
                }
              </DialogDescription>
            </DialogHeader>
            
            <Form {...gradeForm}>
              <form onSubmit={gradeForm.handleSubmit(onGradeSubmit)} className="space-y-4">
                {!selectedStudentId && (
                  <FormField
                    control={gradeForm.control}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ученик</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите ученика" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredStudents.map((student) => (
                              <SelectItem key={student.id} value={student.id.toString()}>
                                {student.lastName} {student.firstName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {/* Разные элементы формы в зависимости от системы оценивания */}
                {classData?.gradingSystem === GradingSystemEnum.CUMULATIVE ? (
                  <>
                    {/* Форма выбора задания для накопительной системы */}
                    <FormField
                      control={gradeForm.control}
                      name="assignmentId"
                      render={({ field }) => {
                        // Получаем задания для этого урока
                        const scheduleId = gradeForm.getValues().scheduleId;
                        const slot = lessonSlots.find(s => s.scheduleId === scheduleId);
                        // Находим сам урок для проверки его статуса
                        const schedule = schedules.find(s => s.id === scheduleId);
                        const isLessonConducted = schedule?.status === 'conducted';
                        
                        // Фильтруем задания - показываем только те, которые не запланированные,
                        // или запланированные, но урок уже проведен
                        const availableAssignments = (slot?.assignments || []).filter(assignment => 
                          !assignment.plannedFor || (assignment.plannedFor && isLessonConducted)
                        );
                        
                        return (
                          <FormItem>
                            <FormLabel>Задание</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                // При выборе задания обновляем selectedAssignment
                                const assignmentId = parseInt(value);
                                field.onChange(assignmentId);
                                const assignment = availableAssignments.find(a => a.id === assignmentId);
                                if (assignment) {
                                  setSelectedAssignment(assignment);
                                  setSelectedAssignmentId(assignment.id);
                                  // Автоматически устанавливаем тип оценки на основе типа задания
                                  gradeForm.setValue('gradeType', assignment.assignmentType);
                                }
                              }}
                              defaultValue={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Выберите задание" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableAssignments.length > 0 ? (
                                  availableAssignments.map((assignment) => (
                                    <SelectItem key={assignment.id} value={assignment.id.toString()}>
                                      {getAssignmentTypeName(assignment.assignmentType)} ({assignment.maxScore} б.)
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem disabled value="none">
                                    Нет доступных заданий
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    
                    {/* Поле для ввода баллов */}
                    {selectedAssignment ? (
                      <FormField
                        control={gradeForm.control}
                        name="grade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Балл (макс. {selectedAssignment.maxScore})</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max={selectedAssignment.maxScore.toString()}
                                {...field}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  const maxScore = parseFloat(selectedAssignment.maxScore.toString());
                                  if (value > maxScore) {
                                    // Ограничиваем значение максимальным баллом
                                    field.onChange(maxScore);
                                    toast({
                                      title: "Внимание",
                                      description: `Максимальный балл для этого задания: ${maxScore}`,
                                    });
                                  } else {
                                    field.onChange(value);
                                  }
                                }}
                                placeholder={`Введите балл (от 0 до ${selectedAssignment.maxScore})`}
                              />
                            </FormControl>
                            <FormDescription>
                              Тип задания: {getAssignmentTypeName(selectedAssignment.assignmentType)}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground mb-4">
                        Выберите задание для выставления баллов
                      </div>
                    )}
                  </>
                ) : (
                  <FormField
                    control={gradeForm.control}
                    name="grade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Оценка</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите оценку" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((grade) => (
                              <SelectItem key={grade} value={grade.toString()}>
                                {grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {/* Скрытое поле для типа оценки, автоматически заполняется при выборе задания */}
                <input 
                  type="hidden" 
                  name="gradeType" 
                  value={gradeForm.getValues().gradeType || "Текущая"} 
                />
                
                {/* Информационное поле о типе оценки */}
                {selectedAssignment && (
                  <div className="text-sm text-muted-foreground mb-2 rounded-md p-2 bg-muted">
                    <p className="font-medium">Тип работы: {getAssignmentTypeName(selectedAssignment.assignmentType)}</p>
                  </div>
                )}
                
                {!selectedAssignment && (
                  <div className="text-sm text-muted-foreground mb-2 rounded-md p-2 bg-muted">
                    <p className="font-medium">Тип оценки: Текущая</p>
                    <p>Выберите задание чтобы изменить тип оценки</p>
                  </div>
                )}
                
                <FormField
                  control={gradeForm.control}
                  name="comment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Комментарий</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Комментарий к оценке"
                          className="resize-none"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {selectedDate && (
                  <div className="space-y-2">
                    <FormLabel>Дата урока</FormLabel>
                    <Input 
                      type="date" 
                      value={selectedDate || ''} 
                      disabled 
                    />
                    <p className="text-xs text-gray-500">
                      Оценка будет привязана к текущей дате
                    </p>
                  </div>
                )}
                
                <DialogFooter>
                  <Button type="submit" disabled={addGradeMutation.isPending || updateGradeMutation.isPending}>
                    {addGradeMutation.isPending || updateGradeMutation.isPending 
                      ? 'Сохранение...' 
                      : editingGradeId 
                        ? 'Обновить' 
                        : 'Сохранить'
                    }
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Контекстный диалог для выбора действия при клике на ячейку урока */}
        <Dialog open={isContextDialogOpen} onOpenChange={setIsContextDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Выберите действие</DialogTitle>
              <DialogDescription>
                {selectedSchedule && `Урок: ${
                  format(new Date(selectedSchedule.scheduleDate || ''), "dd.MM.yyyy", { locale: ru })
                } в ${selectedSchedule.startTime || ""}`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <Button 
                onClick={() => handleContextAction('status')}
                className="flex items-center justify-start gap-2"
              >
                <CalendarClock className="h-5 w-5" />
                Изменить статус урока
              </Button>
              
              <Button 
                onClick={() => handleContextAction('assignment')}
                className="flex items-center justify-start gap-2"
                variant="outline"
              >
                <BookPlus className="h-5 w-5" />
                Добавить задание
              </Button>
              
              {selectedSchedule?.status === 'conducted' && (
                <Button 
                  onClick={() => handleContextAction('attendance')}
                  className="flex items-center justify-start gap-2"
                  variant="outline"
                >
                  <AlertCircle className="h-5 w-5" />
                  Отметить посещаемость
                </Button>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                variant="secondary" 
                onClick={() => setIsContextDialogOpen(false)}
              >
                Отмена
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Attendance Dialog */}
        <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[800px] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Отметка посещаемости</DialogTitle>
              <DialogDescription>
                {selectedSchedule && `Урок: ${
                  format(new Date(selectedSchedule.scheduleDate || ''), "dd.MM.yyyy", { locale: ru })
                } в ${selectedSchedule.startTime || ""}`}
              </DialogDescription>
            </DialogHeader>
            
            {selectedSchedule && (
              <AttendanceForm 
                schedule={selectedSchedule}
                onClose={() => setIsAttendanceDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
















