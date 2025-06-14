import { useState, useEffect } from "react";
import { Link } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useRoleCheck } from "@/hooks/use-role-check";
import { UserRoleEnum, Grade, Class, Subject, User, Schedule } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, BookOpen, UserCheck, Calendar as CalendarIcon, Search, Filter, Check, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";

// Тип для комбинации класс-предмет
interface ClassSubjectCombination {
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
}

export default function TeacherClasses() {
  const { user } = useAuth();
  const { isTeacher } = useRoleCheck();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCombination, setSelectedCombination] = useState<ClassSubjectCombination | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | "all">("all");
  
  // Стейт для модальных окон
  const [lessonStatusDialogOpen, setLessonStatusDialogOpen] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [gradeData, setGradeData] = useState<{
    studentId: number;
    scheduleId: number;
    grade?: number;
    comment?: string;
    gradeId?: number;
    gradeType?: string;
  } | null>(null);
  
  // Мутации для обновления данных
  const updateScheduleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest(`/api/schedules/${id}/status`, "PATCH", { status });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Не удалось обновить статус урока");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Статус урока обновлен",
        description: "Статус урока успешно обновлен",
        variant: "default"
      });
      setLessonStatusDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const createGradeMutation = useMutation({
    mutationFn: async (data: { studentId: number; scheduleId: number; grade: number; comment?: string; classId: number; subjectId: number; gradeType: string }) => {
      const res = await apiRequest(`/api/grades`, "POST", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Не удалось создать оценку");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grades"] });
      toast({
        title: "Оценка добавлена",
        description: "Оценка успешно добавлена",
        variant: "default"
      });
      setGradeDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const updateGradeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { grade: number; comment?: string; gradeType?: string } }) => {
      const res = await apiRequest(`/api/grades/${id}`, "PATCH", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Не удалось обновить оценку");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grades"] });
      toast({
        title: "Оценка обновлена",
        description: "Оценка успешно обновлена",
        variant: "default"
      });
      setGradeDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Открытие диалога для изменения статуса урока
  const openLessonStatusDialog = (schedule: Schedule) => {
    setCurrentSchedule(schedule);
    setLessonStatusDialogOpen(true);
  };
  
  // Открытие диалога для выставления оценки
  const openGradeDialog = (studentId: number, scheduleId: number, existingGrade?: number, existingComment?: string, gradeId?: number, gradeType?: string) => {
    setGradeData({
      studentId,
      scheduleId,
      grade: existingGrade,
      comment: existingComment,
      gradeId,
      gradeType: gradeType || 'classwork' // Используем существующий тип или 'classwork' по умолчанию
    });
    setGradeDialogOpen(true);
  };

  // Проверяем, что пользователь является учителем
  useEffect(() => {
    if (user && !isTeacher()) {
      toast({
        title: "Ошибка доступа",
        description: "Эта страница доступна только для учителей",
        variant: "destructive",
      });
    }
  }, [user, isTeacher, toast]);

  // Получаем расписания, в которых преподаватель ведет занятия
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules", { teacherId: user?.id }],
    queryFn: async () => {
      const res = await apiRequest(`/api/schedules?teacherId=${user?.id}`, "GET");
      if (!res.ok) throw new Error("Не удалось загрузить расписание");
      return res.json();
    },
    enabled: !!user && isTeacher()
  });

  // Получаем список предметов, которые преподает учитель
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/teacher-subjects", user?.id],
    queryFn: async () => {
      const res = await apiRequest(`/api/teacher-subjects/${user?.id}`, "GET");
      if (!res.ok) throw new Error("Не удалось загрузить предметы");
      return res.json();
    },
    enabled: !!user && isTeacher()
  });

  // Получаем список классов
  const { data: classes = [], isLoading: classesLoading } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    enabled: !!user
  });

  // Получаем список студентов выбранного класса
  const { data: students = [], isLoading: studentsLoading } = useQuery<User[]>({
    queryKey: ["/api/students-by-class", selectedCombination?.classId],
    queryFn: async () => {
      if (!selectedCombination) return [];
      const res = await apiRequest(`/api/students-by-class/${selectedCombination.classId}`, "GET");
      if (!res.ok) throw new Error("Не удалось загрузить студентов класса");
      return res.json();
    },
    enabled: !!selectedCombination?.classId
  });

  // Получаем оценки
  const { data: grades = [], isLoading: gradesLoading } = useQuery<Grade[]>({
    queryKey: ["/api/grades"],
    enabled: !!user
  });

  // Создаем список уникальных комбинаций класс-предмет на основе расписания
  const classSubjectCombinations: ClassSubjectCombination[] = schedules
    .reduce((combinations, schedule) => {
      // Проверяем, что у расписания есть и класс, и предмет
      if (!schedule.classId || !schedule.subjectId) return combinations;

      // Найдем класс и предмет в соответствующих списках
      const classInfo = classes.find(c => c.id === schedule.classId);
      const subjectInfo = subjects.find(s => s.id === schedule.subjectId);

      // Если информация о классе или предмете не найдена, пропускаем
      if (!classInfo || !subjectInfo) return combinations;

      // Проверяем, есть ли уже такая комбинация в списке
      const existingCombination = combinations.find(
        c => c.classId === schedule.classId && c.subjectId === schedule.subjectId
      );

      // Если комбинации нет в списке, добавляем
      if (!existingCombination) {
        combinations.push({
          classId: schedule.classId,
          className: classInfo.name,
          subjectId: schedule.subjectId,
          subjectName: subjectInfo.name
        });
      }

      return combinations;
    }, [] as ClassSubjectCombination[]);

  // Используем непосредственно данные из students, так как мы уже загружаем их через API
  const classStudents = students;

  // Фильтруем оценки на основе выбранной комбинации класс-предмет и студента
  const filteredGrades = grades.filter(grade => {
    if (!selectedCombination) return false;
    
    const combinationMatches = 
      grade.classId === selectedCombination.classId && 
      grade.subjectId === selectedCombination.subjectId;
    
    const studentMatches = selectedStudentId === "all" || grade.studentId === selectedStudentId;
    
    // Поиск по комментарию
    const commentMatches = !searchQuery || 
      (grade.comment && grade.comment.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return combinationMatches && studentMatches && (searchQuery === "" || commentMatches);
  });

  // Вспомогательные функции для получения имен
  const getStudentName = (id: number) => {
    const student = students.find(u => u.id === id);
    return student ? `${student.lastName} ${student.firstName}` : `Ученик ${id}`;
  };

  const getGradeTypeName = (type: string) => {
    const types = {
      "homework": "Домашнее задание",
      "classwork": "Классная работа",
      "test": "Тест",
      "exam": "Экзамен",
      "project": "Проект",
    };
    return types[type as keyof typeof types] || type;
  };

  // Рассчитываем среднюю оценку
  const calculateAverage = () => {
    if (filteredGrades.length === 0) return 0;
    
    const sum = filteredGrades.reduce((acc, g) => acc + g.grade, 0);
    return (sum / filteredGrades.length).toFixed(1);
  };

  // Группируем оценки по студентам для построения сводной таблицы
  type StudentGradeSummary = {
    studentId: number;
    studentName: string;
    grades: Grade[];
    averageGrade: number;
  };

  const studentGradeSummaries: StudentGradeSummary[] = classStudents
    .map(student => {
      const studentGrades = filteredGrades.filter(g => g.studentId === student.id);
      
      // Рассчитываем среднюю оценку студента
      const averageGrade = studentGrades.length > 0
        ? studentGrades.reduce((sum, g) => sum + g.grade, 0) / studentGrades.length
        : 0;
      
      return {
        studentId: student.id,
        studentName: `${student.lastName} ${student.firstName}`,
        grades: studentGrades,
        averageGrade
      };
    })
    // Сортируем по фамилии
    .sort((a, b) => a.studentName.localeCompare(b.studentName));

  if (!user || !isTeacher()) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка доступа</AlertTitle>
            <AlertDescription>
              Эта страница доступна только для учителей.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  if (schedulesLoading || subjectsLoading || classesLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-6">
          <h2 className="text-2xl font-heading font-bold text-gray-800 mb-6">Мои классы</h2>
          <div className="flex items-center justify-center h-64">
            <p className="text-lg">Загрузка данных...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-2xl font-heading font-bold text-gray-800 mb-6">Мои классы</h2>
        
        {classSubjectCombinations.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Нет данных</AlertTitle>
            <AlertDescription>
              У вас пока нет назначенных классов или предметов. Обратитесь к администратору школы.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Выбор класса и предмета */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Выберите класс и предмет</CardTitle>
                <CardDescription>
                  Выберите комбинацию класса и предмета, чтобы просмотреть информацию
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  onValueChange={(value) => {
                    const [classId, subjectId] = value.split(':').map(Number);
                    const combination = classSubjectCombinations.find(
                      c => c.classId === classId && c.subjectId === subjectId
                    );
                    setSelectedCombination(combination || null);
                    // Сбрасываем другие фильтры при смене класса/предмета
                    setSelectedStudentId("all");
                    setSearchQuery("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите класс и предмет" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Доступные классы и предметы</SelectLabel>
                      {classSubjectCombinations.map((combination) => (
                        <SelectItem 
                          key={`${combination.classId}:${combination.subjectId}`} 
                          value={`${combination.classId}:${combination.subjectId}`}
                        >
                          {combination.className} - {combination.subjectName}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
            
            {selectedCombination && (
              <>
                <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-6">
                  <h3 className="text-xl font-semibold mb-2">
                    {selectedCombination.className} - {selectedCombination.subjectName}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>Предмет: {selectedCombination.subjectName}</span>
                    <Separator orientation="vertical" className="h-4" />
                    <UserCheck className="h-4 w-4" />
                    <span>Класс: {selectedCombination.className}</span>
                  </div>
                </div>
                
                <Tabs defaultValue="grades" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="grades">
                      Журнал оценок
                    </TabsTrigger>
                    <TabsTrigger value="summary">
                      Сводная таблица
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="grades">
                    {/* Фильтры и поиск */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="Поиск по комментарию..."
                          className="pl-10"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      
                      <Select
                        value={selectedStudentId.toString()}
                        onValueChange={(value) => setSelectedStudentId(value === "all" ? "all" : parseInt(value))}
                      >
                        <SelectTrigger>
                          <div className="flex items-center">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Все ученики" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все ученики</SelectItem>
                          {classStudents.map((student) => (
                            <SelectItem key={student.id} value={student.id.toString()}>
                              {student.lastName} {student.firstName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <div className="bg-white p-3 rounded-md shadow-sm flex items-center justify-between">
                        <span className="text-sm font-medium">Средний балл:</span>
                        <span className="text-lg font-semibold">{calculateAverage()}</span>
                      </div>
                    </div>
                    
                    {/* Журнал оценок - ученики в рядах, даты уроков в столбцах */}
                    <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 bg-white">Ученик</TableHead>
                            {/* Показываем даты всех уроков в качестве заголовков столбцов */}
                            {schedules
                              .filter(schedule => 
                                schedule.classId === selectedCombination.classId && 
                                schedule.subjectId === selectedCombination.subjectId
                              )
                              .sort((a, b) => {
                                // Сортируем по дате
                                const dateA = a.scheduleDate ? new Date(a.scheduleDate) : new Date(0);
                                const dateB = b.scheduleDate ? new Date(b.scheduleDate) : new Date(0);
                                return dateA.getTime() - dateB.getTime();
                              })
                              .map(schedule => {
                                const isLessonConducted = schedule.status === 'conducted';
                                return (
                                  <TableHead 
                                    key={schedule.id} 
                                    className={`text-center cursor-pointer ${isLessonConducted ? 'bg-green-50' : 'bg-gray-50'}`}
                                    onClick={() => openLessonStatusDialog(schedule)}
                                  >
                                    <div className="flex flex-col items-center justify-center">
                                      {schedule.scheduleDate ? new Date(schedule.scheduleDate).toLocaleDateString('ru-RU') : 'Без даты'}
                                      {schedule.startTime && 
                                        <span className="text-xs text-gray-500">
                                          ({schedule.startTime.slice(0, 5)})
                                        </span>
                                      }
                                      {isLessonConducted && (
                                        <span className="text-green-600 ml-1">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                          </svg>
                                        </span>
                                      )}
                                    </div>
                                  </TableHead>
                                );
                              })}
                            <TableHead className="text-center">Средний балл</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {gradesLoading || studentsLoading ? (
                            <TableRow>
                              <TableCell colSpan={100} className="text-center py-6">
                                Загрузка...
                              </TableCell>
                            </TableRow>
                          ) : classStudents.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={100} className="text-center py-6">
                                В этом классе нет учеников
                              </TableCell>
                            </TableRow>
                          ) : (
                            // Для каждого ученика создаем строку
                            classStudents.map(student => {
                              // Получаем все оценки этого ученика по выбранному предмету и классу
                              const studentGrades = grades.filter(grade => 
                                grade.studentId === student.id && 
                                grade.classId === selectedCombination.classId && 
                                grade.subjectId === selectedCombination.subjectId
                              );
                              
                              // Вычисляем средний балл
                              const avgGrade = studentGrades.length > 0 
                                ? (studentGrades.reduce((sum, grade) => sum + grade.grade, 0) / studentGrades.length).toFixed(1)
                                : "-";
                              
                              return (
                                <TableRow key={student.id}>
                                  <TableCell className="sticky left-0 bg-white font-medium">
                                    {student.lastName} {student.firstName}
                                  </TableCell>
                                  
                                  {/* Для каждого урока показываем оценку или возможность её выставить */}
                                  {schedules
                                    .filter(schedule => 
                                      schedule.classId === selectedCombination.classId && 
                                      schedule.subjectId === selectedCombination.subjectId
                                    )
                                    .sort((a, b) => {
                                      const dateA = a.scheduleDate ? new Date(a.scheduleDate) : new Date(0);
                                      const dateB = b.scheduleDate ? new Date(b.scheduleDate) : new Date(0);
                                      return dateA.getTime() - dateB.getTime();
                                    })
                                    .map(schedule => {
                                      // Ищем оценку для данного урока и ученика
                                      const gradeForSchedule = studentGrades.find(grade => 
                                        grade.scheduleId === schedule.id
                                      );
                                      
                                      const isLessonConducted = schedule.status === 'conducted';
                                      
                                      return (
                                        <TableCell key={schedule.id} className={`text-center ${isLessonConducted ? '' : 'bg-gray-50'}`}>
                                          {isLessonConducted ? (
                                            <div className="w-full">
                                              {gradeForSchedule ? (
                                                <span 
                                                  className={`px-2 py-1 rounded-full cursor-pointer ${
                                                    gradeForSchedule.grade >= 4 ? 'bg-green-100 text-green-800' : 
                                                    gradeForSchedule.grade >= 3 ? 'bg-yellow-100 text-yellow-800' : 
                                                    'bg-red-100 text-red-800'
                                                  }`}
                                                  onClick={() => openGradeDialog(student.id, schedule.id, gradeForSchedule.grade, gradeForSchedule.comment || '', gradeForSchedule.id, gradeForSchedule.gradeType)}
                                                >
                                                  <div className="flex flex-col">
                                                    <span>{gradeForSchedule.grade}</span>
                                                    <span className="text-xs text-gray-500">{getGradeTypeName(gradeForSchedule.gradeType || 'classwork')}</span>
                                                  </div>
                                                </span>
                                              ) : (
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="text-xs"
                                                  onClick={() => openGradeDialog(student.id, schedule.id)}
                                                >
                                                  Оценить
                                                </Button>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-gray-400">—</span>
                                          )}
                                        </TableCell>
                                      );
                                    })
                                  }
                                  
                                  {/* Показываем средний балл */}
                                  <TableCell className="text-center font-bold">
                                    {avgGrade !== "-" ? (
                                      <span className={`px-2 py-1 rounded-full ${
                                        Number(avgGrade) >= 4 ? 'bg-green-100 text-green-800' : 
                                        Number(avgGrade) >= 3 ? 'bg-yellow-100 text-yellow-800' : 
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {avgGrade}
                                      </span>
                                    ) : "–"}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <Button asChild>
                        <Link href="/grades">Добавить оценку</Link>
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="summary">
                    {/* Сводная таблица по ученикам */}
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ученик</TableHead>
                            <TableHead>Количество оценок</TableHead>
                            <TableHead>Средний балл</TableHead>
                            <TableHead>Действия</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentsLoading ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-6">
                                Загрузка...
                              </TableCell>
                            </TableRow>
                          ) : studentGradeSummaries.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-6">
                                Нет учеников для отображения
                              </TableCell>
                            </TableRow>
                          ) : (
                            studentGradeSummaries.map((summary) => (
                              <TableRow key={summary.studentId}>
                                <TableCell className="font-medium">{summary.studentName}</TableCell>
                                <TableCell>{summary.grades.length}</TableCell>
                                <TableCell>
                                  <div className={`px-2 py-1 rounded-full text-center w-12 ${
                                    summary.averageGrade >= 4 ? 'bg-green-100 text-green-800' : 
                                    summary.averageGrade >= 3 ? 'bg-yellow-100 text-yellow-800' : 
                                    summary.grades.length > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {summary.grades.length > 0 ? summary.averageGrade.toFixed(1) : '-'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedStudentId(summary.studentId)}
                                  >
                                    Подробно
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}
      </div>
      
      {/* Модальное окно для изменения статуса урока */}
      <Dialog open={lessonStatusDialogOpen} onOpenChange={setLessonStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить статус урока</DialogTitle>
            <DialogDescription>
              {currentSchedule && (
                <div className="mt-2">
                  <p className="mb-2">
                    Дата: {currentSchedule.scheduleDate ? new Date(currentSchedule.scheduleDate).toLocaleDateString('ru-RU') : 'Без даты'}
                  </p>
                  <p className="mb-2">
                    Время: {currentSchedule.startTime ? currentSchedule.startTime.slice(0, 5) : 'Не указано'} 
                    {currentSchedule.endTime ? ` - ${currentSchedule.endTime.slice(0, 5)}` : ''}
                  </p>
                  <p className="mb-4">
                    Текущий статус: <span className={currentSchedule.status === 'conducted' ? 'text-green-600 font-medium' : 'text-gray-600'}>
                      {currentSchedule.status === 'conducted' ? 'Проведен' : 'Запланирован'}
                    </span>
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={currentSchedule?.status === 'conducted' ? "default" : "outline"}
                className="flex-1 flex items-center gap-2"
                onClick={() => {
                  if (currentSchedule) {
                    updateScheduleStatusMutation.mutate({
                      id: currentSchedule.id,
                      status: 'conducted'
                    });
                  }
                }}
              >
                <Check className="h-4 w-4" />
                Проведен
              </Button>
              
              <Button
                variant={currentSchedule?.status !== 'conducted' ? "default" : "outline"}
                className="flex-1 flex items-center gap-2"
                onClick={() => {
                  if (currentSchedule) {
                    updateScheduleStatusMutation.mutate({
                      id: currentSchedule.id,
                      status: 'scheduled'
                    });
                  }
                }}
              >
                <X className="h-4 w-4" />
                Не проведен
              </Button>
            </div>
            
            {/* Опция для запланированного задания для всех уроков, удалено условие на проверку статуса */}
            {currentSchedule && 
             currentSchedule.scheduleDate && (
              <div className="mt-4">
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
                  <div className="flex items-start">
                    <CalendarIcon className="h-5 w-5 text-amber-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-amber-700">Запланировать задание</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Вы можете запланировать задание к этому уроку заранее. Запланированные задания не влияют на среднюю оценку до проведения урока.
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full mt-3 text-amber-600 border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                        onClick={() => {
                          setLessonStatusDialogOpen(false);
                          // Открываем форму создания задания
                          if (currentSchedule && selectedCombination) {
                            setGradeData({
                              studentId: 0,
                              scheduleId: currentSchedule.id,
                              gradeType: 'homework'
                              // Поле plannedFor будет добавлено на серверной стороне
                            });
                            // Здесь нужно открыть форму задания
                            // Если у вас есть отдельный компонент для создания заданий, используйте его
                            toast({
                              title: "Запланированное задание",
                              description: "Возможность добавления запланированных заданий доступна в журнале оценок",
                              variant: "default"
                            });
                          }
                        }}
                      >
                        Запланировать задание
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonStatusDialogOpen(false)}>
              Отмена
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Модальное окно для выставления оценки */}
      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {gradeData?.grade ? "Редактировать оценку" : "Добавить оценку"}
            </DialogTitle>
            <DialogDescription>
              {gradeData && (
                <div className="mt-2">
                  <p className="mb-2">
                    Ученик: {students.find(s => s.id === gradeData.studentId)?.lastName} {students.find(s => s.id === gradeData.studentId)?.firstName}
                  </p>
                  <p className="mb-2">
                    Урок: {schedules.find(s => s.id === gradeData.scheduleId)?.scheduleDate ? 
                      new Date(schedules.find(s => s.id === gradeData.scheduleId)?.scheduleDate || '').toLocaleDateString('ru-RU') : 
                      'Без даты'}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="grade">Оценка</Label>
                <Select
                  defaultValue={gradeData?.grade?.toString() || ""}
                  onValueChange={(value) => {
                    if (gradeData) {
                      setGradeData({
                        ...gradeData,
                        grade: parseInt(value)
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите оценку" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 (Отлично)</SelectItem>
                    <SelectItem value="4">4 (Хорошо)</SelectItem>
                    <SelectItem value="3">3 (Удовлетворительно)</SelectItem>
                    <SelectItem value="2">2 (Неудовлетворительно)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="gradeType">Тип оценки</Label>
                <Select
                  defaultValue={gradeData?.gradeType || "classwork"}
                  onValueChange={(value) => {
                    if (gradeData) {
                      setGradeData({
                        ...gradeData,
                        gradeType: value
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип оценки" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classwork">Классная работа</SelectItem>
                    <SelectItem value="homework">Домашнее задание</SelectItem>
                    <SelectItem value="test">Тест</SelectItem>
                    <SelectItem value="exam">Экзамен</SelectItem>
                    <SelectItem value="project">Проект</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="comment">Комментарий (необязательно)</Label>
                <Textarea
                  id="comment"
                  placeholder="Введите комментарий к оценке"
                  value={gradeData?.comment || ""}
                  onChange={(e) => {
                    if (gradeData) {
                      setGradeData({
                        ...gradeData,
                        comment: e.target.value
                      });
                    }
                  }}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradeDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (gradeData && selectedCombination && gradeData.grade) {
                  if (gradeData.gradeId) {
                    // Обновляем существующую оценку
                    updateGradeMutation.mutate({
                      id: gradeData.gradeId,
                      data: {
                        grade: gradeData.grade,
                        comment: gradeData.comment,
                        gradeType: gradeData.gradeType
                      }
                    });
                  } else {
                    // Создаем новую оценку
                    createGradeMutation.mutate({
                      studentId: gradeData.studentId,
                      scheduleId: gradeData.scheduleId,
                      grade: gradeData.grade,
                      comment: gradeData.comment,
                      classId: selectedCombination.classId,
                      subjectId: selectedCombination.subjectId,
                      gradeType: gradeData.gradeType || 'classwork' // Используем выбранный тип оценки или значение по умолчанию
                    });
                  }
                } else {
                  toast({
                    title: "Ошибка",
                    description: "Пожалуйста, заполните все обязательные поля",
                    variant: "destructive"
                  });
                }
              }}
              disabled={!gradeData?.grade || updateScheduleStatusMutation.isPending || createGradeMutation.isPending || updateGradeMutation.isPending}
            >
              {gradeData?.gradeId ? "Обновить" : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}