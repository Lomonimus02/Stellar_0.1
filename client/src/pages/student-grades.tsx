import { useState, useMemo, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { 
  UserRoleEnum, 
  Grade, 
  Subject, 
  Class, 
  GradingSystemEnum, 
  Assignment, 
  AssignmentTypeEnum, 
  Subgroup 
} from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameDay, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Calculator, 
  Book, 
  BookOpen, 
  Info,
  Award,
  BarChart,
  Percent,
  AlertCircle,
  Loader2,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Progress
} from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Alert,
  AlertTitle,
  AlertDescription 
} from "@/components/ui/alert";

// Интерфейс для отображения оценок в гриде по дням
interface GradesByDate {
  [subjectId: number]: {
    [date: string]: {
      grades: Grade[];
      assignments?: Assignment[];
    }
  }
}

// Расширенный интерфейс для предмета с информацией о подгруппе и произвольным ID
interface ExtendedSubject extends Subject {
  subgroupId?: number | null;
  subgroupName?: string | null;
  customId?: string;
}

// Типы работ и их цвета
const assignmentTypeColors: Record<string, string> = {
  [AssignmentTypeEnum.CONTROL_WORK]: "bg-red-100 text-red-800 hover:bg-red-200",
  [AssignmentTypeEnum.TEST_WORK]: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  [AssignmentTypeEnum.CURRENT_WORK]: "bg-green-100 text-green-800 hover:bg-green-200",
  [AssignmentTypeEnum.HOMEWORK]: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  [AssignmentTypeEnum.CLASSWORK]: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  [AssignmentTypeEnum.PROJECT_WORK]: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  [AssignmentTypeEnum.CLASS_ASSIGNMENT]: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
};

// Типы оценок и их цвета
const gradeTypeColors: Record<string, string> = {
  "homework": "bg-amber-100 text-amber-800",
  "classwork": "bg-green-100 text-green-800",
  "test": "bg-blue-100 text-blue-800",
  "exam": "bg-purple-100 text-purple-800",
  "project": "bg-indigo-100 text-indigo-800",
};

// Функция для получения названия типа задания
const getAssignmentTypeName = (type: string): string => {
  const types: Record<string, string> = {
    [AssignmentTypeEnum.CONTROL_WORK]: "Контрольная работа",
    [AssignmentTypeEnum.TEST_WORK]: "Проверочная работа",
    [AssignmentTypeEnum.CURRENT_WORK]: "Текущая работа",
    [AssignmentTypeEnum.HOMEWORK]: "Домашнее задание",
    [AssignmentTypeEnum.CLASSWORK]: "Работа на уроке",
    [AssignmentTypeEnum.PROJECT_WORK]: "Проект",
    [AssignmentTypeEnum.CLASS_ASSIGNMENT]: "Классная работа",
  };
  return types[type] || type;
};

// Функция для получения названия типа оценки
const getGradeTypeName = (type: string): string => {
  const types: Record<string, string> = {
    "homework": "Домашнее задание",
    "classwork": "Классная работа",
    "test": "Тест",
    "exam": "Экзамен",
    "project": "Проект",
  };
  return types[type] || type;
};

export default function StudentGrades() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);
  // Определение типов четвертей и полугодий
  type QuarterType = 'quarter1' | 'quarter2' | 'quarter3' | 'quarter4' | 'semester1' | 'semester2' | 'year';
  
  // Период отображения: четверти, полугодия и год
  const [displayPeriod, setDisplayPeriod] = useState<QuarterType>('quarter1');
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  
  // Получение данных студента
  const { data: studentClass } = useQuery<Class[]>({
    queryKey: [`/api/student-classes?studentId=${user?.id}`],
    enabled: !!user && user.role === UserRoleEnum.STUDENT
  });
  
  // Получение предметов
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: !!user
  });
  
  // Получение подгрупп, в которых состоит ученик
  const { data: studentSubgroups = [] } = useQuery<Subgroup[]>({
    queryKey: ["/api/student-subgroups", { studentId: user?.id }],
    enabled: !!user && user.role === UserRoleEnum.STUDENT
  });
  
  // Получение оценок ученика
  const { data: grades = [], isLoading: gradesLoading } = useQuery<Grade[]>({
    queryKey: [`/api/grades?studentId=${user?.id}`],
    enabled: !!user && user.role === UserRoleEnum.STUDENT
  });
  
  // Получение заданий (для детальной информации об оценках)
  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ['/api/assignments', studentClass && studentClass.length > 0 ? studentClass[0].id : null, grades],
    queryFn: async ({ queryKey }) => {
      const classId = queryKey[1];
      if (!classId) return [];
      
      // Сначала загружаем все задания для класса
      const response = await fetch(`/api/assignments?classId=${classId}`);
      if (!response.ok) throw new Error('Failed to fetch assignments');
      const classAssignments = await response.json();
      
      // Для каждой оценки, которая ссылается на задание, но это задание не найдено в классе
      // делаем дополнительный запрос по конкретному assignmentId
      const allGrades = queryKey[2] as Grade[] || [];
      const assignmentIds = new Set<number>();
      
      // Получаем список ID заданий, которые присутствуют в оценках
      allGrades.forEach(grade => {
        if (grade.assignmentId) {
          assignmentIds.add(grade.assignmentId);
        }
      });
      
      // Проверяем, какие задания нужно дополнительно загрузить
      const missingAssignmentIds = Array.from(assignmentIds).filter(
        id => !classAssignments.some((a: Assignment) => a.id === id)
      );
      
      // Если есть отсутствующие задания, загружаем их
      if (missingAssignmentIds.length > 0) {
        const additionalAssignments = await Promise.all(
          missingAssignmentIds.map(async id => {
            try {
              const response = await fetch(`/api/assignments/${id}`);
              if (response.ok) {
                return await response.json();
              }
            } catch (error) {
              console.error(`Error fetching assignment ${id}:`, error);
            }
            return null;
          })
        );
        
        // Объединяем все задания, отфильтровывая null значения
        return [...classAssignments, ...additionalAssignments.filter(a => a !== null)];
      }
      
      return classAssignments;
    },
    enabled: !!user && user.role === UserRoleEnum.STUDENT && studentClass && studentClass.length > 0 && grades.length > 0
  });
  
  // Интерфейс для данных о средних оценках из журнала учителя
  interface SubjectAverage {
    average: string;
    percentage: string;
    maxScore?: string;
  }
  
  // Объект для хранения средних оценок по предметам из API
  const [subjectAverages, setSubjectAverages] = useState<Record<string, SubjectAverage>>({});
  
  // Состояние для отслеживания ошибок загрузки данных
  const [loadingErrors, setLoadingErrors] = useState<{
    auth?: string;
    averages?: string;
    subjects?: string;
    grades?: string;
  }>({});
  
  const { toast } = useToast();
  
  // Эффект для предварительной загрузки средних оценок для всех предметов
  useEffect(() => {
    if (!user) {
      setLoadingErrors(prev => ({ ...prev, auth: "Требуется авторизация для просмотра оценок" }));
      return;
    }
    
    if (user.role !== UserRoleEnum.STUDENT) {
      setLoadingErrors(prev => ({ ...prev, auth: "Доступ к оценкам разрешен только для учеников" }));
      return;
    }
    
    if (!subjects || !subjects.length) {
      return; // Предметы еще не загружены, ждем
    }
    
    const fetchSubjectAverages = async () => {
      const averagesData: Record<string, SubjectAverage> = {};
      let hasErrors = false;
      
      // Загружаем данные для всех предметов
      for (const subject of subjects) {
        try {
          if (!subject || !subject.id) continue; // Пропускаем невалидные предметы
          
          const subjectId = subject.id;
          const cacheKey = (subject as any).customId || `${subjectId}`;
          
          // Загружаем среднюю оценку для этого предмета
          const url = `/api/student-subject-average?studentId=${user.id}&subjectId=${subjectId}`;
          const response = await fetch(url);
          
          if (response.status === 401) {
            setLoadingErrors(prev => ({ ...prev, auth: "Проблема с авторизацией. Возможно, сессия истекла" }));
            hasErrors = true;
            break;
          }
          
          if (response.status === 403) {
            setLoadingErrors(prev => ({ ...prev, auth: "Недостаточно прав для просмотра оценок" }));
            hasErrors = true;
            break;
          }
          
          if (response.ok) {
            const data = await response.json();
            // Проверка на валидность данных
            if (data && (data.average !== undefined || data.percentage !== undefined)) {
              averagesData[cacheKey] = data;
            }
          } else {
            console.warn(`Ошибка при загрузке средней оценки для предмета ${subject.name}:`, response.statusText);
          }
        } catch (error) {
          console.error(`Ошибка при загрузке средней оценки для предмета:`, error);
          hasErrors = true;
        }
      }
      
      // Обновляем состояние только если не было критических ошибок
      if (!hasErrors) {
        setLoadingErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.averages;
          return newErrors;
        });
        
        setSubjectAverages(prev => ({
          ...prev,
          ...averagesData
        }));
      } else {
        // Если были ошибки, но нам удалось загрузить хотя бы часть оценок
        if (Object.keys(averagesData).length > 0) {
          setSubjectAverages(prev => ({
            ...prev,
            ...averagesData
          }));
          
          // Уведомляем пользователя о частичной загрузке
          toast({
            title: "Внимание",
            description: "Загружены не все средние оценки. Пожалуйста, обновите страницу или обратитесь к администратору."
          });
        }
      }
    };
    
    fetchSubjectAverages();
  }, [user, subjects, toast]);
  
  // Определяем систему оценивания класса
  const gradingSystem = useMemo(() => {
    if (studentClass && studentClass.length > 0) {
      return studentClass[0].gradingSystem;
    }
    return GradingSystemEnum.FIVE_POINT; // По умолчанию пятибалльная система
  }, [studentClass]);
  
  // Получаем начало и конец периода просмотра в зависимости от выбранного периода
  const { startDate, endDate, periodLabel } = useMemo(() => {
    let start: Date;
    let end: Date;
    let label = '';
    
    // Функция для получения учебного года
    const getAcademicYear = (year: number) => {
      const currentMonth = new Date().getMonth();
      // Если текущий месяц сентябрь и позже, то учебный год начинается в текущем году
      // Иначе учебный год начался в предыдущем году
      return currentMonth >= 8 ? year : year - 1;
    };
    
    const academicYear = getAcademicYear(currentYear);
    
    switch (displayPeriod) {
      case 'quarter1': // 1 четверть: сентябрь - октябрь
        start = new Date(academicYear, 8, 1); // 1 сентября
        end = new Date(academicYear, 9, 31); // 31 октября
        label = `1 четверть (сентябрь - октябрь ${academicYear})`;
        break;
        
      case 'quarter2': // 2 четверть: ноябрь - декабрь
        start = new Date(academicYear, 10, 1); // 1 ноября
        end = new Date(academicYear, 11, 31); // 31 декабря
        label = `2 четверть (ноябрь - декабрь ${academicYear})`;
        break;
        
      case 'quarter3': // 3 четверть: январь - март
        start = new Date(academicYear + 1, 0, 1); // 1 января
        end = new Date(academicYear + 1, 2, 31); // 31 марта
        label = `3 четверть (январь - март ${academicYear + 1})`;
        break;
        
      case 'quarter4': // 4 четверть: апрель - июнь
        start = new Date(academicYear + 1, 3, 1); // 1 апреля
        end = new Date(academicYear + 1, 5, 30); // 30 июня
        label = `4 четверть (апрель - июнь ${academicYear + 1})`;
        break;
        
      case 'semester1': // 1 полугодие: сентябрь - декабрь
        start = new Date(academicYear, 8, 1); // 1 сентября
        end = new Date(academicYear, 11, 31); // 31 декабря
        label = `1 полугодие (сентябрь - декабрь ${academicYear})`;
        break;
        
      case 'semester2': // 2 полугодие: январь - июнь
        start = new Date(academicYear + 1, 0, 1); // 1 января
        end = new Date(academicYear + 1, 5, 30); // 30 июня
        label = `2 полугодие (январь - июнь ${academicYear + 1})`;
        break;
        
      case 'year': // Учебный год: сентябрь - июнь
        start = new Date(academicYear, 8, 1); // 1 сентября
        end = new Date(academicYear + 1, 5, 30); // 30 июня
        label = `Учебный год ${academicYear}-${academicYear + 1}`;
        break;
        
      default:
        start = new Date(academicYear, 8, 1);
        end = new Date(academicYear, 9, 31);
        label = `1 четверть (сентябрь - октябрь ${academicYear})`;
    }
    
    return { 
      startDate: start, 
      endDate: end, 
      periodLabel: label 
    };
  }, [currentYear, displayPeriod]);
  
  // Определяем дни текущего периода
  const daysInPeriod = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);
  
  // Фильтруем оценки по выбранному периоду
  const filteredGradesByPeriod = useMemo(() => {
    return grades.filter(grade => {
      // Для каждой оценки проверяем, попадает ли она в выбранный период
      const gradeDate = new Date(grade.createdAt);
      return gradeDate >= startDate && gradeDate <= endDate;
    });
  }, [grades, startDate, endDate]);
  
  // Группируем оценки по предметам и датам
  const gradesBySubjectAndDate: GradesByDate = useMemo(() => {
    const result: GradesByDate = {};
    
    // Создаем структуру для всех предметов
    subjects.forEach(subject => {
      result[subject.id] = {};
    });
    
    // Заполняем оценками, только которые входят в выбранный период
    filteredGradesByPeriod.forEach(grade => {
      // Получаем дату в формате строки для использования как ключ
      const date = new Date(grade.createdAt).toISOString().split('T')[0];
      
      // Если нет такого предмета, создаем запись
      if (!result[grade.subjectId]) {
        result[grade.subjectId] = {};
      }
      
      // Если нет записи для этой даты, создаем
      if (!result[grade.subjectId][date]) {
        result[grade.subjectId][date] = { grades: [] };
      }
      
      // Добавляем оценку
      result[grade.subjectId][date].grades.push(grade);
      
      // Если оценка связана с заданием, добавляем информацию о задании
      if (grade.scheduleId) {
        const scheduleAssignments = assignments.filter(a => a.scheduleId === grade.scheduleId);
        if (scheduleAssignments.length > 0) {
          result[grade.subjectId][date].assignments = scheduleAssignments;
        }
      }
    });
    
    return result;
  }, [filteredGradesByPeriod, subjects, assignments]);
  
  // Функция для отображения оценок для конкретного предмета/подгруппы и даты
  const renderGradeCell = (subject: any, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Получаем ID предмета и подгруппы из customId, строки или из объекта предмета
    let subjectId, subgroupId;
    
    if (typeof subject === 'string') {
      // Если передан customId в виде строки (subjectId-subgroupId)
      [subjectId, subgroupId] = subject.split('-').map(id => id ? parseInt(id) : null);
    } else {
      // Если передан объект
      subjectId = subject.id;
      subgroupId = subject.subgroupId || null;
    }
    
    // Вначале найдем расписание на эту дату для данного предмета (и, возможно, подгруппы)
    // Это нужно, чтобы привязать оценки только к конкретным урокам
    const scheduleForDate = (() => {
      const scheduleDate = date.toISOString().split('T')[0];
      
      // Возможная проблема: в assignments нет scheduleDate, нужно получить его из schedules
      // Получим из API-запроса к /api/schedules
      // Для наших целей можем взять scheduleId из assignment и проверить, привязан ли он к нужной дате
      
      // Для каждого assignment найдем оценки, которые имеют scheduleId для урока на эту дату
      return filteredGradesByPeriod
        .filter(g => {
          // Проверяем, что оценка относится к текущему предмету
          if (g.subjectId !== subjectId) return false;
          
          // Проверяем, что дата оценки совпадает с выбранной датой
          const gradeDate = new Date(g.createdAt);
          const gradeStr = gradeDate.toISOString().split('T')[0];
          if (gradeStr !== scheduleDate) return false;
          
          // Проверяем, что подгруппа совпадает (если указана)
          if (subgroupId !== null && g.subgroupId !== subgroupId) return false;
          if (subgroupId === null && g.subgroupId) return false;
          
          // Считаем, что эта оценка относится к нужному уроку
          return g.scheduleId !== null && g.scheduleId !== undefined;
        })
        .map(g => g.scheduleId)
        .filter((id): id is number => id !== null && id !== undefined);
    })();
    
    // Получаем оценки для указанного предмета и даты, с учетом расписания
    const cellGrades = filteredGradesByPeriod.filter(grade => {
      // Проверяем предмет
      if (grade.subjectId !== subjectId) return false;
      
      // Проверяем соответствие дате
      const gradeDate = new Date(grade.createdAt);
      const gradeStr = gradeDate.toISOString().split('T')[0];
      if (gradeStr !== dateStr) return false;
      
      // Проверяем подгруппу (если указана)
      if (subgroupId !== null && grade.subgroupId !== subgroupId) {
        return false;
      } else if (subgroupId === null && grade.subgroupId) {
        return false;
      }
      
      // Если найдены расписания на эту дату, показываем только оценки с соответствующим scheduleId
      if (scheduleForDate.length > 0 && grade.scheduleId) {
        return scheduleForDate.includes(grade.scheduleId);
      }
      
      return true; // Показываем оценки без привязки к расписанию, если расписание не найдено
    });
    
    if (cellGrades.length === 0) {
      return null;
    }
    
    return (
      <div className="flex flex-wrap gap-1 justify-center">
        {cellGrades.map((grade) => {
          // Определяем, связано ли с заданием
          let assignment = null;
          
          // Сначала проверяем по assignmentId (если есть)
          if (grade.assignmentId) {
            assignment = assignments.find(a => a.id === grade.assignmentId);
          }
          
          // Если assignmentId не задан или не найден, ищем по scheduleId
          if (!assignment && grade.scheduleId) {
            assignment = assignments.find(a => a.scheduleId === grade.scheduleId);
          }
          
          const hasAssignment = !!assignment;
          
          // Определяем цвет в зависимости от типа задания или оценки
          const getColorClass = () => {
            if (hasAssignment && assignment) {
              return assignmentTypeColors[assignment.assignmentType] || 'bg-primary-100 text-primary-800 hover:bg-primary-200';
            } else if (grade.gradeType && gradeTypeColors[grade.gradeType]) {
              return gradeTypeColors[grade.gradeType];
            } else {
              return grade.grade >= 4 
                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                : grade.grade >= 3 
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                  : 'bg-red-100 text-red-800 hover:bg-red-200';
            }
          };
          
          return (
            <span 
              key={grade.id}
              onClick={() => handleGradeClick(grade, assignment || null)}
              className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium cursor-pointer ${getColorClass()}`}
              title={hasAssignment && assignment ? getAssignmentTypeName(assignment.assignmentType) : (grade.gradeType ? getGradeTypeName(grade.gradeType) : "")}
            >
              {grade.grade}
              {hasAssignment && (
                <span className="w-1 h-1 ml-1 rounded-full bg-current"></span>
              )}
            </span>
          );
        })}
      </div>
    );
  };
  
  // Обработчик клика по оценке
  const handleGradeClick = async (grade: Grade, initialAssignment: Assignment | null) => {
    console.log("Grade clicked:", grade);
    
    // Ищем соответствующее задание, приоритет assignmentId, затем scheduleId
    let assignment = initialAssignment;
    
    // Если не передано задание, но есть assignmentId в оценке, найдем задание
    if (!assignment && grade.assignmentId) {
      // Сначала ищем в локальном кэше
      assignment = assignments.find(a => a.id === grade.assignmentId) || null;
      
      // Если не нашли в кэше, делаем прямой запрос к API
      if (!assignment) {
        try {
          console.log(`Trying to load assignment directly by ID: ${grade.assignmentId}`);
          const response = await fetch(`/api/assignments/${grade.assignmentId}`);
          if (response.ok) {
            assignment = await response.json();
            console.log("Assignment loaded from API:", assignment);
          } else {
            console.log("Failed to load assignment from API:", response.status);
          }
        } catch (error) {
          console.error("Error fetching assignment:", error);
        }
      }
    }
    
    // Если не найдено по assignmentId, ищем по scheduleId
    if (!assignment && grade.scheduleId) {
      // Сначала ищем в локальном кэше
      assignment = assignments.find(a => a.scheduleId === grade.scheduleId) || null;
      
      // Если не нашли в кэше, делаем прямой запрос к API
      if (!assignment) {
        try {
          console.log(`Trying to load assignments by scheduleId: ${grade.scheduleId}`);
          const response = await fetch(`/api/assignments/schedule/${grade.scheduleId}`);
          if (response.ok) {
            const scheduleAssignments = await response.json();
            if (scheduleAssignments.length > 0) {
              assignment = scheduleAssignments[0];
              console.log("Assignment loaded from API by scheduleId:", assignment);
            }
          } else {
            console.log("Failed to load schedule assignments from API:", response.status);
          }
        } catch (error) {
          console.error("Error fetching schedule assignments:", error);
        }
      }
    }
    
    console.log("Assignment data (final):", assignment);
    
    setSelectedGrade(grade);
    setSelectedAssignment(assignment);
    setIsGradeDialogOpen(true);
  };
  
  // Функция для загрузки среднего балла из API
  const loadSubjectAverage = async (subjectId: number, subgroupId?: number) => {
    try {
      if (!user) return null;
      
      let url = `/api/student-subject-average?studentId=${user.id}&subjectId=${subjectId}`;
      if (subgroupId) {
        url += `&subgroupId=${subgroupId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error('Failed to fetch subject average:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      return data as SubjectAverage;
    } catch (error) {
      console.error('Error fetching subject average:', error);
      return null;
    }
  };
  
  // Расчет среднего балла по предмету или предмету+подгруппе для выбранного периода
  const calculateAverageForSubject = async (subject: any) => {
    // Получаем ID предмета и подгруппы из customId или из объекта предмета
    const subjectKey = typeof subject === 'string' ? subject : (subject.customId || `${subject.id}`);
    const [subjectId, subgroupId] = typeof subjectKey === 'string' 
      ? subjectKey.split('-').map(id => id ? parseInt(id) : null) 
      : [subject.id, subject.subgroupId];
    
    // Проверяем наличие оценок в данном периоде по этому предмету/подгруппе
    // Фильтруем оценки по предмету и подгруппе (если указана) и периоду
    const subjectGradesInPeriod = filteredGradesByPeriod.filter(g => {
      if (g.subjectId !== subjectId) return false;
      
      // Если указана подгруппа, проверяем соответствие
      if (subgroupId !== null) {
        return g.subgroupId === subgroupId;
      }
      
      // Если подгруппа не указана в ключе, включаем только оценки без подгрупп
      return !g.subgroupId;
    });
    
    // Если нет оценок за выбранный период, сразу возвращаем прочерк
    if (subjectGradesInPeriod.length === 0) return "-";
    
    try {
      // Фильтруем оценки, оставляя только те, что привязаны к конкретным урокам
      const uniqueGrades = subjectGradesInPeriod.filter(grade => {
        // Всегда используем оценки, которые имеют привязку к конкретному уроку
        return grade.scheduleId !== null && grade.scheduleId !== undefined;
      });
      
      // Используем уникальные оценки для расчёта если они есть
      // Иначе используем все оценки периода (обратная совместимость)
      const gradesToUse = uniqueGrades.length > 0 ? uniqueGrades : subjectGradesInPeriod;
      
      console.log(`Расчет среднего процента для предмета ${subjectId}, всего оценок: ${gradesToUse.length}`);
      
      // Накопительные переменные для всех оценок
      let totalEarnedPoints = 0;
      let totalMaxPoints = 0;
      
      // Для каждой оценки ищем соответствующее задание и получаем максимальный балл
      for (const grade of gradesToUse) {
        // Определяем связанное задание (сначала по assignmentId, затем по scheduleId)
        let relatedAssignment = null;
        
        if (grade.assignmentId) {
          relatedAssignment = assignments.find(a => a.id === grade.assignmentId);
          
          // Если не найдено в кэше, пробуем получить с сервера
          if (!relatedAssignment) {
            try {
              const assignmentResponse = await fetch(`/api/assignments/${grade.assignmentId}`);
              if (assignmentResponse.ok) {
                relatedAssignment = await assignmentResponse.json();
              }
            } catch (error) {
              console.error(`Ошибка при загрузке задания ${grade.assignmentId}:`, error);
            }
          }
        }
        
        if (!relatedAssignment && grade.scheduleId) {
          relatedAssignment = assignments.find(a => a.scheduleId === grade.scheduleId);
          
          // Если не найдено в кэше, пробуем получить задания для расписания
          if (!relatedAssignment) {
            try {
              const scheduleAssignmentsResponse = await fetch(`/api/assignments/schedule/${grade.scheduleId}`);
              if (scheduleAssignmentsResponse.ok) {
                const scheduleAssignments = await scheduleAssignmentsResponse.json();
                if (scheduleAssignments.length > 0) {
                  relatedAssignment = scheduleAssignments[0];
                }
              }
            } catch (error) {
              console.error(`Ошибка при загрузке заданий для урока ${grade.scheduleId}:`, error);
            }
          }
        }
        
        // Добавляем полученные баллы
        totalEarnedPoints += grade.grade;
        
        // Определяем максимальный балл для задания
        if (relatedAssignment) {
          totalMaxPoints += Number(relatedAssignment.maxScore);
          console.log(`Оценка: ${grade.grade}/${relatedAssignment.maxScore} за задание ${relatedAssignment.id}`);
        } else {
          // Если не нашли задание, используем виртуальный максимальный балл
          if (gradingSystem === GradingSystemEnum.CUMULATIVE) {
            totalMaxPoints += 10.0; // Для накопительной системы используем 10 как дефолт
            console.log(`Оценка: ${grade.grade}/10.0 (виртуальный максимум для накопительной системы)`);
          } else {
            totalMaxPoints += 5.0; // Для 5-балльной системы используем 5 как максимум
            console.log(`Оценка: ${grade.grade}/5.0 (максимум для 5-балльной системы)`);
          }
        }
      }
      
      // Если нет максимального балла, возвращаем прочерк
      if (totalMaxPoints === 0) return "-";
      
      // Вычисляем процент: сумма полученных баллов / сумма максимальных баллов * 100%
      const percentage = (totalEarnedPoints / totalMaxPoints) * 100;
      
      // Ограничиваем максимальный процент до 100%
      const cappedPercentage = Math.min(percentage, 100);
      
      console.log(`Итого: ${totalEarnedPoints}/${totalMaxPoints} = ${cappedPercentage.toFixed(1)}%`);
      
      return `${cappedPercentage.toFixed(1)}%`;
    } catch (error) {
      console.error("Ошибка при расчёте средней оценки:", error);
      return "-";
    }
  };
  
  // Получение цвета для среднего процента
  const getAverageGradeColor = (average: string) => {
    if (average === "-") return "";
    
    // Теперь всегда работаем с процентами
    const percent = parseFloat(average.replace('%', ''));
    
    if (percent >= 80) return "text-green-600";
    if (percent >= 60) return "text-yellow-600";
    return "text-red-600";
  };
  
  // Компонент для отображения среднего балла по предмету
  interface SubjectAverageCellProps {
    subject: any;
    displayPeriod: string;
    startDate: Date;
    endDate: Date;
    calculateAverage: (subject: any) => Promise<string>;
    getColorClass: (average: string) => string;
  }
  
  // Компонент для отображения среднего балла
  const SubjectAverageCell: React.FC<SubjectAverageCellProps> = ({ 
    subject, 
    displayPeriod, 
    startDate, 
    endDate, 
    calculateAverage,
    getColorClass
  }) => {
    const [average, setAverage] = useState<string>("-");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    
    useEffect(() => {
      const fetchAverage = async () => {
        setIsLoading(true);
        try {
          const result = await calculateAverage(subject);
          setAverage(result);
        } catch (error) {
          console.error("Error calculating average:", error);
          setAverage("-");
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchAverage();
    }, [subject, displayPeriod, startDate, endDate, calculateAverage]);
    
    if (isLoading) {
      return <span className="text-gray-400">·····</span>;
    }
    
    return (
      <span className={getColorClass(average)}>
        {average}
      </span>
    );
  };
  
  // Переключение на предыдущий месяц
  // Переключение на предыдущий учебный год
  const goToPreviousYear = () => {
    setCurrentYear(prevYear => prevYear - 1);
  };
  
  // Переключение на следующий учебный год
  const goToNextYear = () => {
    const nextYear = currentYear + 1;
    const currentDate = new Date();
    
    // Не позволяем выбирать будущие учебные годы
    // Если текущий месяц сентябрь или позже, то можно выбрать текущий год
    // Иначе можно выбрать только до предыдущего года
    const currentMonth = currentDate.getMonth();
    const maxAllowedYear = currentMonth >= 8 
      ? currentDate.getFullYear() 
      : currentDate.getFullYear() - 1;
      
    if (nextYear <= maxAllowedYear) {
      setCurrentYear(nextYear);
    }
  };
  
  // Получение названия предмета или подгруппы
  const getSubjectName = (subjectId: number, gradeSubgroupId?: number | null) => {
    // Если указана подгруппа, отображаем её название
    if (gradeSubgroupId) {
      const subgroup = studentSubgroups.find(sg => sg.id === gradeSubgroupId);
      if (subgroup) {
        const subject = subjects.find(s => s.id === subjectId);
        return `${subject?.name || `Предмет ${subjectId}`} (${subgroup.name})`;
      }
    }
    
    // Если подгруппа не указана, отображаем название предмета
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : `Предмет ${subjectId}`;
  };
  
  // Получение отображаемого названия для предмета/подгруппы
  const getDisplayName = (subject: any) => {
    const subjectId = subject.id;
    const subgroupId = subject.subgroupId;
    
    if (subgroupId) {
      const subgroup = studentSubgroups.find(sg => sg.id === subgroupId);
      if (subgroup) {
        return `${subject.name} (${subgroup.name})`;
      }
    }
    
    return subject.name;
  };
  
  // Получаем предметы и подгруппы с оценками
  const subjectsWithGrades = useMemo(() => {
    // Создаем комбинации предмет+подгруппа
    const subjectSubgroupMap = new Map();
    
    // Сначала добавляем все подгруппы студента
    studentSubgroups.forEach(subgroup => {
      // Находим предмет для подгруппы (если информация доступна)
      // Обычно подгруппы связаны с предметами через назначения
      const assignment = assignments.find(a => a.subgroupId === subgroup.id);
      if (assignment) {
        const subject = subjects.find(s => s.id === assignment.subjectId);
        if (subject) {
          const key = `${subject.id}-${subgroup.id}`;
          subjectSubgroupMap.set(key, {
            ...subject,
            subgroupId: subgroup.id,
            subgroupName: subgroup.name,
            customId: key
          });
        }
      }
    });
    
    // Затем добавляем предметы с оценками
    grades.forEach(grade => {
      const key = grade.subgroupId 
        ? `${grade.subjectId}-${grade.subgroupId}` 
        : `${grade.subjectId}`;
      
      if (!subjectSubgroupMap.has(key)) {
        const subject = subjects.find(s => s.id === grade.subjectId);
        if (subject) {
          // Если это подгруппа, находим её название
          let subgroupName = null;
          if (grade.subgroupId) {
            const subgroup = studentSubgroups.find(sg => sg.id === grade.subgroupId);
            subgroupName = subgroup ? subgroup.name : null;
          }
          
          // Сохраняем копию предмета с информацией о подгруппе
          subjectSubgroupMap.set(key, {
            ...subject,
            subgroupId: grade.subgroupId,
            subgroupName,
            // Используем customId для сравнения в дальнейшем
            customId: key
          });
        }
      }
    });
    
    return Array.from(subjectSubgroupMap.values());
  }, [grades, subjects]);
  
  // Функция для отображения состояния ошибок
  const renderErrorState = () => {
    if (!user) {
      return (
        <Alert variant="destructive" className="mb-6">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Ошибка доступа</AlertTitle>
          <AlertDescription>
            Требуется авторизация для просмотра оценок. Пожалуйста, войдите в систему.
          </AlertDescription>
        </Alert>
      );
    }
    
    if (user.role !== UserRoleEnum.STUDENT) {
      return (
        <Alert variant="destructive" className="mb-6">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Недостаточно прав</AlertTitle>
          <AlertDescription>
            Журнал оценок доступен только для учеников. Ваша роль: {user.role}
          </AlertDescription>
        </Alert>
      );
    }
    
    if (loadingErrors.auth) {
      return (
        <Alert variant="destructive" className="mb-6">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Ошибка доступа</AlertTitle>
          <AlertDescription>
            {loadingErrors.auth}
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  };
  
  // Проверка на наличие ошибок, требующих блокировки страницы
  const hasBlockingErrors = !user || user.role !== UserRoleEnum.STUDENT || !!loadingErrors.auth;
  
  return (
    <MainLayout>
      {/* Отображение ошибок доступа */}
      {renderErrorState()}
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-gray-800">Оценки</h2>
        
        {/* Переключатели периодов */}
        <div className="flex items-center space-x-2">
          {/* Переключатель типа периода */}
          <Select 
            value={displayPeriod} 
            onValueChange={(value) => setDisplayPeriod(value as QuarterType)}
            disabled={hasBlockingErrors}
          >
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quarter1">1 четверть</SelectItem>
              <SelectItem value="quarter2">2 четверть</SelectItem>
              <SelectItem value="quarter3">3 четверть</SelectItem>
              <SelectItem value="quarter4">4 четверть</SelectItem>
              <SelectItem value="semester1">1 полугодие</SelectItem>
              <SelectItem value="semester2">2 полугодие</SelectItem>
              <SelectItem value="year">Учебный год</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Навигация по периодам */}
          <div className="flex items-center space-x-2 border rounded-md p-1">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={goToPreviousYear}
              className="h-7 w-7"
              disabled={hasBlockingErrors}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center px-2">
              <Calendar className="mr-2 h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">
                {periodLabel}
              </span>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={goToNextYear}
              className="h-7 w-7"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="table">
        <TabsList className="mb-6">
          <TabsTrigger value="table">
            <BookOpen className="h-4 w-4 mr-2" />
            Табличный вид
          </TabsTrigger>
          <TabsTrigger value="list">
            <Book className="h-4 w-4 mr-2" />
            Список оценок
          </TabsTrigger>
        </TabsList>
        
        {/* Табличный вид с оценками по дням */}
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Успеваемость за {periodLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              {hasBlockingErrors ? (
                <div className="text-center py-10 text-red-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                  <div className="text-lg font-medium">Доступ запрещен</div>
                  <p className="text-sm opacity-80">У вас нет прав для просмотра журнала оценок</p>
                </div>
              ) : gradesLoading ? (
                <div className="text-center py-10">
                  <Loader2 className="h-12 w-12 mx-auto mb-2 animate-spin text-primary" />
                  <div className="text-lg font-medium">Загрузка оценок...</div>
                  <p className="text-sm text-gray-500">Пожалуйста, подождите</p>
                </div>
              ) : subjectsWithGrades.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Info className="h-12 w-12 mx-auto mb-2" />
                  <div className="text-lg font-medium">Нет данных</div>
                  <p className="text-sm opacity-80">За выбранный период оценок нет</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="border">
                    <TableHeader className="sticky top-0 bg-white">
                      <TableRow>
                        <TableHead className="min-w-[180px] sticky left-0 bg-white z-10">Предмет</TableHead>
                        {daysInPeriod.map((day) => (
                          <TableHead key={day.toString()} className="text-center min-w-[60px]">
                            <div className="flex flex-col items-center">
                              <div className="font-normal text-xs text-gray-500">
                                {format(day, 'E', { locale: ru })}
                              </div>
                              <div className="font-medium">
                                {format(day, 'dd', { locale: ru })}
                              </div>
                            </div>
                          </TableHead>
                        ))}
                        <TableHead className="text-center bg-gray-50 min-w-[80px] sticky right-0 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                          <div className="flex items-center justify-center">
                            <Percent className="h-4 w-4 mr-1 text-gray-500" />
                            <span>Ср. процент</span>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjectsWithGrades.map((subject: any) => (
                        <TableRow key={(subject as any).customId || subject.id}>
                          <TableCell className="font-medium sticky left-0 bg-white shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-10">
                            {subject.subgroupId 
                              ? getDisplayName(subject) 
                              : subject.name
                            }
                          </TableCell>
                          {daysInPeriod.map((day) => (
                            <TableCell key={day.toString()} className="text-center">
                              {renderGradeCell(subject, day)}
                            </TableCell>
                          ))}
                          <TableCell className={`text-center bg-gray-50 font-semibold sticky right-0 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]`}>
                            <SubjectAverageCell 
                              subject={subject} 
                              displayPeriod={displayPeriod} 
                              startDate={startDate} 
                              endDate={endDate} 
                              calculateAverage={calculateAverageForSubject}
                              getColorClass={getAverageGradeColor}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Список всех оценок за период */}
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Список оценок за {periodLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              {gradesLoading ? (
                <div className="text-center py-10">Загрузка оценок...</div>
              ) : grades.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  За выбранный период оценок нет
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Дата</TableHead>
                        <TableHead>Предмет</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Оценка</TableHead>
                        <TableHead>Комментарий</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGradesByPeriod
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map(grade => {
                          // Ищем соответствующее задание (сначала по assignmentId, затем по scheduleId)
                          let assignment = null;
                          
                          if (grade.assignmentId) {
                            assignment = assignments.find(a => a.id === grade.assignmentId);
                          }
                          
                          if (!assignment && grade.scheduleId) {
                            assignment = assignments.find(a => a.scheduleId === grade.scheduleId);
                          }
                          
                          return (
                            <TableRow 
                              key={grade.id} 
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => handleGradeClick(grade, assignment || null)}
                            >
                              <TableCell>
                                {format(new Date(grade.createdAt), 'dd.MM.yyyy')}
                              </TableCell>
                              <TableCell className="font-medium">
                                {getSubjectName(grade.subjectId, grade.subgroupId)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`${
                                  grade.gradeType && gradeTypeColors[grade.gradeType] 
                                    ? gradeTypeColors[grade.gradeType] 
                                    : 'bg-gray-100'
                                }`}>
                                  {getGradeTypeName(grade.gradeType)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={`${
                                  grade.grade >= 4 ? 'bg-green-100 text-green-800' : 
                                  grade.grade >= 3 ? 'bg-yellow-100 text-yellow-800' : 
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {grade.grade}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {grade.comment || "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Диалог для детальной информации об оценке */}
      <Dialog open={isGradeDialogOpen} onOpenChange={setIsGradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Детали оценки</DialogTitle>
            <DialogDescription>
              Информация об оценке и связанном задании
            </DialogDescription>
          </DialogHeader>
          
          {selectedGrade && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Предмет</div>
                  <div className="font-medium">{getSubjectName(selectedGrade.subjectId, selectedGrade.subgroupId)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Дата</div>
                  <div className="font-medium">
                    {format(new Date(selectedGrade.createdAt), 'dd.MM.yyyy')}
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500">Тип работы</div>
                <Badge className={`${
                  selectedGrade.gradeType && gradeTypeColors[selectedGrade.gradeType] 
                    ? gradeTypeColors[selectedGrade.gradeType] 
                    : 'bg-gray-100'
                }`}>
                  {selectedAssignment 
                    ? getAssignmentTypeName(selectedAssignment.assignmentType) 
                    : getGradeTypeName(selectedGrade.gradeType)
                  }
                </Badge>
              </div>
              
              <div>
                <div className="text-sm text-gray-500">Оценка</div>
                <div className="mt-1 flex flex-col space-y-2">
                  {/* Отображение оценки для всех систем с информацией о задании */}
                  {selectedAssignment ? (
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center">
                        <Badge className={`text-lg px-3 py-1 mr-2 ${
                          (selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) >= 0.8 ? 'bg-green-100 text-green-800' : 
                          (selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) >= 0.6 ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'
                        }`}>
                          {selectedGrade.grade}/{selectedAssignment.maxScore}
                        </Badge>
                      </div>
                      <Badge className={`text-lg px-3 py-1 ${
                        (selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) >= 0.8 ? 'bg-green-100 text-green-800' : 
                        (selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) >= 0.6 ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {((selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="text-xs text-gray-500 mb-1">Оценка</div>
                      <Badge className={`text-lg px-3 py-1 ${
                        selectedGrade.grade >= 4 ? 'bg-green-100 text-green-800' : 
                        selectedGrade.grade >= 3 ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedGrade.grade}
                      </Badge>
                    </div>
                  )}
                  
                  {/* Отображение оценки для пятибалльной системы */}
                  {gradingSystem === GradingSystemEnum.FIVE_POINT && selectedAssignment && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 items-center">
                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                          <div className="text-xs text-gray-500 mb-1">Оценка</div>
                          <Badge className={`text-lg px-3 py-1 ${
                            selectedGrade.grade >= 4 ? 'bg-green-100 text-green-800' : 
                            selectedGrade.grade >= 3 ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {selectedGrade.grade}
                          </Badge>
                        </div>
                        {selectedAssignment && (
                          <>
                            <div className="bg-gray-50 p-3 rounded-lg text-center">
                              <div className="text-xs text-gray-500 mb-1">Формат</div>
                              <Badge variant="outline" className="text-lg px-3 py-1">
                                {selectedGrade.grade}/{selectedAssignment.maxScore}
                              </Badge>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg text-center">
                              <div className="text-xs text-gray-500 mb-1">Процент</div>
                              <Badge className={`text-lg px-3 py-1 ${
                                (selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) >= 0.8 ? 'bg-green-100 text-green-800' : 
                                (selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) >= 0.6 ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'
                              }`}>
                                {((selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) * 100).toFixed(1)}%
                              </Badge>
                            </div>
                          </>
                        )}
                      </div>
                      
                      {selectedAssignment && (
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full ${
                              (selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) >= 0.8 ? 'bg-green-600' : 
                              (selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) >= 0.6 ? 'bg-yellow-500' : 
                              'bg-red-600'
                            }`}
                            style={{ width: `${(selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) * 100}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Отображение для накопительной системы */}
                  {gradingSystem === GradingSystemEnum.CUMULATIVE && selectedAssignment && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 items-center">
                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                          <div className="text-xs text-gray-500 mb-1">Получено</div>
                          <Badge className={`text-lg px-3 py-1 ${
                            (selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) >= 0.8 ? 'bg-green-100 text-green-800' : 
                            (selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) >= 0.6 ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {selectedGrade.grade}
                          </Badge>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                          <div className="text-xs text-gray-500 mb-1">Максимум</div>
                          <Badge variant="outline" className="text-lg px-3 py-1">
                            {selectedAssignment.maxScore}
                          </Badge>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                          <div className="text-xs text-gray-500 mb-1">Процент</div>
                          <Badge className={`text-lg px-3 py-1 ${
                            (selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) >= 0.8 ? 'bg-green-100 text-green-800' : 
                            (selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) >= 0.6 ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {((selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Индикатор прогресса */}
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full ${
                            (selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) >= 0.8 ? 'bg-green-600' : 
                            (selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) >= 0.6 ? 'bg-yellow-500' : 
                            'bg-red-600'
                          }`}
                          style={{ width: `${(selectedGrade.grade / parseFloat(selectedAssignment.maxScore.toString())) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Для накопительной системы, но без связанного задания */}
                  {gradingSystem === GradingSystemEnum.CUMULATIVE && !selectedAssignment && (
                    <div>
                      <Badge className="text-lg px-3 py-1 bg-gray-100 text-gray-800">
                        {selectedGrade.grade}
                      </Badge>
                      <div className="mt-1 text-sm text-gray-500 italic">
                        Отсутствует информация о максимальном балле
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedGrade.comment && (
                <div>
                  <div className="text-sm text-gray-500">Комментарий преподавателя</div>
                  <div className="p-3 bg-gray-50 rounded-md mt-1">
                    {selectedGrade.comment}
                  </div>
                </div>
              )}
              
              {selectedAssignment && (
                <div className="border-t pt-4 mt-4">
                  <div className="text-sm text-gray-500 mb-2 flex items-center">
                    <Info className="h-4 w-4 mr-1" />
                    <span>Информация о задании</span>
                  </div>
                  
                  <div className="space-y-3">
                    <Badge className={assignmentTypeColors[selectedAssignment.assignmentType] || 'bg-gray-100'}>
                      {getAssignmentTypeName(selectedAssignment.assignmentType)}
                    </Badge>
                    
                    {selectedAssignment.description && (
                      <div>
                        <div className="text-sm text-gray-500">Описание задания</div>
                        <div className="p-3 bg-gray-50 rounded-md mt-1">
                          {selectedAssignment.description}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setIsGradeDialogOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}