// client/src/pages/class-details.tsx
import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useRoleCheck } from "@/hooks/use-role-check";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Class, ClassWithStudentCount, User, UserRoleEnum, GradingSystemEnum } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  School,
  Users,
  UserPlus,
  Search,
  Loader2,
  UserX,
  Mail,
  Phone,
  Pencil,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getCurrentAcademicPeriod } from "@/utils/academic-period";
import { useAcademicPeriods, getPeriodDatesFromSettings, getAvailablePeriodsForClass, getPeriodTypeForClass } from "@/hooks/use-academic-periods";
import { AcademicPeriodTypeEnum } from "@shared/schema";

function ClassDetailsPageContent() {
  const { classId } = useParams<{ classId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPrincipal, isVicePrincipal, isSchoolAdmin } = useRoleCheck();
  const queryClient = useQueryClient();

  // State
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [hasError, setHasError] = useState(false);

  // Global error handler
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Global error caught in ClassDetailsPage:', error);
      setHasError(true);
      toast({
        title: "Произошла ошибка",
        description: "Обновите страницу или попробуйте позже",
        variant: "destructive",
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection in ClassDetailsPage:', event.reason);
      setHasError(true);
      toast({
        title: "Произошла ошибка",
        description: "Обновите страницу или попробуйте позже",
        variant: "destructive",
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [toast]);

  // Автоматически определяем текущий период при инициализации
  const currentPeriodInfo = getCurrentAcademicPeriod();

  // Период отображения и учебный год
  type PeriodSystemType = 'quarters' | 'trimesters' | 'semesters';
  const [periodSystem, setPeriodSystem] = useState<PeriodSystemType>('quarters');
  const [currentYear, setCurrentYear] = useState<number>(currentPeriodInfo.year);

  // Check for global errors first
  if (hasError) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Произошла ошибка</h1>
            <p className="text-gray-600 mb-4">Что-то пошло не так. Попробуйте обновить страницу.</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate('/classes-management')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Вернуться к списку классов
              </Button>
              <Button onClick={() => window.location.reload()}>
                Обновить страницу
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Check access
  const hasAccess = isPrincipal() || isVicePrincipal() || isSchoolAdmin();

  if (!hasAccess) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Доступ запрещен</h1>
            <p className="text-gray-600">У вас нет прав для просмотра этой страницы.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Data fetching
  const { data: classData, isLoading: classLoading, error: classError } = useQuery<ClassWithStudentCount>({
    queryKey: ["/api/classes", classId],
    queryFn: async () => {
      console.log('Fetching class data for classId:', classId);
      const res = await apiRequest(`/api/classes/${classId}`);
      if (!res.ok) {
        throw new Error(`Ошибка загрузки класса: ${res.status}`);
      }
      const data = await res.json();
      console.log('Class data received:', data);
      return data;
    },
    enabled: !!classId,
    retry: 2,
    retryDelay: 1000,
    onError: (error: any) => {
      console.error("Ошибка загрузки класса:", error);
      toast({
        title: "Ошибка загрузки класса",
        description: error.message || "Не удалось загрузить информацию о классе",
        variant: "destructive",
      });
    }
  });

  // Получаем настройки учебных периодов для класса
  const { data: academicPeriodsData, isLoading: periodsLoading } = useAcademicPeriods(classId ? parseInt(classId) : null);

  // Автоматически устанавливаем систему периодов на основе настроек класса
  const classPeriodType = getPeriodTypeForClass(academicPeriodsData);
  const effectivePeriodSystem = useMemo(() => {
    if (academicPeriodsData) {
      switch (classPeriodType) {
        case AcademicPeriodTypeEnum.QUARTERS:
          return 'quarters';
        case AcademicPeriodTypeEnum.TRIMESTERS:
          return 'trimesters';
        case AcademicPeriodTypeEnum.SEMESTERS:
          return 'semesters';
        default:
          return periodSystem;
      }
    }
    return periodSystem;
  }, [academicPeriodsData, classPeriodType, periodSystem]);

  // Get students for this class
  const { data: classStudents = [], isLoading: studentsLoading, error: studentsError } = useQuery<User[]>({
    queryKey: ["/api/students-by-class", classId],
    queryFn: async () => {
      console.log('Fetching students for class:', classId);
      const res = await apiRequest(`/api/students-by-class/${classId}`);
      if (!res.ok) {
        throw new Error(`Ошибка загрузки студентов: ${res.status}`);
      }
      const data = await res.json();
      console.log('Students data received:', data);
      return data;
    },
    enabled: !!classId,
    retry: 2,
    retryDelay: 1000,
    onError: (error: any) => {
      console.error("Ошибка загрузки студентов:", error);
      toast({
        title: "Ошибка загрузки студентов",
        description: error.message || "Не удалось загрузить список студентов",
        variant: "destructive",
      });
    }
  });

  // Get available students (not in any class)
  const { data: availableStudents = [] } = useQuery<User[]>({
    queryKey: ["/api/users", "students", classData?.schoolId],
    queryFn: async () => {
      if (!classData?.schoolId) return [];

      // Получаем всех пользователей
      const usersRes = await apiRequest(`/api/users`);
      const allUsers = await usersRes.json();

      // Фильтруем только студентов из нужной школы
      const studentsInSchool = allUsers.filter((user: any) => {
        // Проверяем activeRole или ищем роль STUDENT в массиве roles
        const hasStudentRole = user.activeRole === UserRoleEnum.STUDENT ||
          (user.roles && user.roles.some((role: any) => role.role === UserRoleEnum.STUDENT));

        return hasStudentRole && user.schoolId === classData.schoolId;
      });

      // Для простоты пока возвращаем всех студентов школы
      // TODO: Добавить фильтрацию студентов, которые уже в классах
      return studentsInSchool;
    },
    enabled: !!classData?.schoolId && isAddStudentDialogOpen,
  });

  // Функция для получения учебного года
  const getAcademicYear = useCallback((year: number) => {
    const currentMonth = new Date().getMonth();
    // Если текущий месяц сентябрь и позже, то учебный год начинается в текущем году
    // Иначе учебный год начался в предыдущем году
    return currentMonth >= 8 ? year : year - 1;
  }, []);

  // Определяем периоды на основе настроек класса или системы по умолчанию
  const periods = useMemo(() => {
    if (!academicPeriodsData) {
      // Если настройки не загружены, используем значения по умолчанию
      const academicYear = getAcademicYear(currentYear);

      switch (effectivePeriodSystem) {
        case 'quarters':
          return [
            { key: 'quarter1', name: '1 четверть', startDate: new Date(academicYear, 8, 1), endDate: new Date(academicYear, 9, 31) },
            { key: 'quarter2', name: '2 четверть', startDate: new Date(academicYear, 10, 1), endDate: new Date(academicYear, 11, 31) },
            { key: 'quarter3', name: '3 четверть', startDate: new Date(academicYear + 1, 0, 1), endDate: new Date(academicYear + 1, 2, 31) },
            { key: 'quarter4', name: '4 четверть', startDate: new Date(academicYear + 1, 3, 1), endDate: new Date(academicYear + 1, 4, 31) }
          ];
        case 'trimesters':
          return [
            { key: 'trimester1', name: '1 триместр', startDate: new Date(academicYear, 8, 1), endDate: new Date(academicYear, 10, 30) },
            { key: 'trimester2', name: '2 триместр', startDate: new Date(academicYear, 11, 1), endDate: new Date(academicYear + 1, 1, 31) },
            { key: 'trimester3', name: '3 триместр', startDate: new Date(academicYear + 1, 2, 1), endDate: new Date(academicYear + 1, 4, 31) }
          ];
        case 'semesters':
          return [
            { key: 'semester1', name: '1 полугодие', startDate: new Date(academicYear, 8, 1), endDate: new Date(academicYear, 11, 31) },
            { key: 'semester2', name: '2 полугодие', startDate: new Date(academicYear + 1, 0, 1), endDate: new Date(academicYear + 1, 4, 31) }
          ];
        default:
          return [];
      }
    }

    // Используем настройки класса
    const availablePeriods = getAvailablePeriodsForClass(academicPeriodsData);
    return availablePeriods.map(periodKey => {
      const periodData = getPeriodDatesFromSettings(periodKey, academicPeriodsData, currentYear);
      return {
        key: periodKey,
        name: periodData.label,
        startDate: periodData.startDate,
        endDate: periodData.endDate
      };
    });
  }, [academicPeriodsData, effectivePeriodSystem, currentYear, getAcademicYear]);

  // Период за весь год
  const yearPeriod = useMemo(() => {
    if (academicPeriodsData) {
      const yearPeriodData = getPeriodDatesFromSettings('year', academicPeriodsData, currentYear);
      return {
        key: 'year',
        name: yearPeriodData.label,
        startDate: yearPeriodData.startDate,
        endDate: yearPeriodData.endDate
      };
    }

    // Значения по умолчанию
    const academicYear = getAcademicYear(currentYear);
    return {
      key: 'year',
      name: 'Год',
      startDate: new Date(academicYear, 8, 1), // 1 сентября
      endDate: new Date(academicYear + 1, 4, 31) // 31 мая
    };
  }, [academicPeriodsData, currentYear, getAcademicYear]);

  // Получаем средние оценки для всех периодов
  const { data: periodAverages = {}, isLoading: averagesLoading, error: averagesError } = useQuery<Record<string, Record<string, { average: string, percentage: string }>>>({
    queryKey: ["/api/student-subject-averages", classId, periods, yearPeriod],
    queryFn: async () => {
      if (!classId) return {};

      const result: Record<string, Record<string, { average: string, percentage: string }>> = {};

      // Получаем оценки для каждого периода
      const allPeriods = [...periods, yearPeriod];

      for (const period of allPeriods) {
        const fromDate = format(period.startDate, 'yyyy-MM-dd');
        const toDate = format(period.endDate, 'yyyy-MM-dd');

        try {
          const res = await apiRequest(`/api/student-subject-averages?classId=${classId}&fromDate=${fromDate}&toDate=${toDate}`, "GET");
          if (res.ok) {
            const data = await res.json();
            result[period.key] = data;
          } else {
            console.warn(`Не удалось получить оценки для периода ${period.key}: ${res.status}`);
            result[period.key] = {};
          }
        } catch (error) {
          console.error(`Ошибка при получении оценок для периода ${period.key}:`, error);
          result[period.key] = {};
        }
      }

      return result;
    },
    enabled: !!classId && periods.length > 0,
    retry: 1,
    retryDelay: 1000,
    onError: (error: any) => {
      console.error("Ошибка загрузки средних оценок:", error);
      // Не показываем toast для ошибок оценок, так как это не критично
    }
  });

  // Функция для форматирования оценки в зависимости от системы оценивания
  const formatGrade = useCallback((average: { average: string, percentage: string } | undefined, isYearGrade = false) => {
    if (!average) return '-';

    if (classData?.gradingSystem === GradingSystemEnum.CUMULATIVE) {
      // Для накопительной системы показываем проценты
      return average.percentage;
    } else {
      // Для пятибалльной системы показываем средний балл
      const numericAverage = parseFloat(average.average);
      if (isNaN(numericAverage)) return '-';

      // Для итоговой оценки за год округляем до целого числа
      if (isYearGrade) {
        return Math.round(numericAverage).toString();
      }

      // Для периодических оценок показываем с одним знаком после запятой
      return numericAverage.toFixed(1);
    }
  }, [classData?.gradingSystem]);

  // Функция для получения цвета оценки
  const getGradeColor = useCallback((average: { average: string, percentage: string } | undefined) => {
    if (!average) return 'text-slate-400';

    if (classData?.gradingSystem === GradingSystemEnum.CUMULATIVE) {
      const percentage = parseFloat(average.percentage);
      if (percentage >= 90) return 'text-green-600 font-semibold';
      if (percentage >= 75) return 'text-blue-600 font-medium';
      if (percentage >= 60) return 'text-yellow-600 font-medium';
      return 'text-red-600 font-medium';
    } else {
      const numericAverage = parseFloat(average.average);
      if (numericAverage >= 4.5) return 'text-green-600 font-semibold';
      if (numericAverage >= 3.5) return 'text-blue-600 font-medium';
      if (numericAverage >= 2.5) return 'text-yellow-600 font-medium';
      return 'text-red-600 font-medium';
    }
  }, [classData?.gradingSystem]);

  // Filtered students based on search
  const filteredStudents = useMemo(() => {
    return classStudents.filter(student => {
      const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
      const username = (student.username || '').toLowerCase();
      const email = (student.email || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      return fullName.includes(searchLower) || username.includes(searchLower) || email.includes(searchLower);
    });
  }, [classStudents, searchTerm]);

  // Mutations
  const addStudentToClassMutation = useMutation({
    mutationFn: async ({ studentId, classId }: { studentId: number; classId: number }) => {
      const res = await apiRequest('/api/student-classes', 'POST', { studentId, classId });
      return res.json();
    },
    onSuccess: () => {
      // Инвалидируем конкретный запрос для этого класса
      queryClient.invalidateQueries({ queryKey: ['/api/students-by-class', classId] });
      // Также инвалидируем общий запрос для всех классов
      queryClient.invalidateQueries({ queryKey: ['/api/students-by-class'] });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsAddStudentDialogOpen(false);
      setSelectedStudentId("");
      toast({ title: "Ученик успешно добавлен в класс" });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка добавления ученика",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const removeStudentFromClassMutation = useMutation({
    mutationFn: async ({ studentId, classId }: { studentId: number; classId: number }) => {
      const res = await apiRequest(`/api/student-classes?studentId=${studentId}&classId=${classId}`, 'DELETE');
      return res.json();
    },
    onSuccess: () => {
      // Инвалидируем конкретный запрос для этого класса
      queryClient.invalidateQueries({ queryKey: ['/api/students-by-class', classId] });
      // Также инвалидируем общий запрос для всех классов
      queryClient.invalidateQueries({ queryKey: ['/api/students-by-class'] });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      toast({ title: "Ученик удален из класса" });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка удаления ученика",
        description: error.message,
        variant: "destructive"
      });
    }
  });



  // Event handlers
  const handleAddStudent = useCallback(() => {
    if (!selectedStudentId || !classId) return;

    addStudentToClassMutation.mutate({
      studentId: parseInt(selectedStudentId),
      classId: parseInt(classId)
    });
  }, [selectedStudentId, classId, addStudentToClassMutation]);

  const handleRemoveStudent = useCallback((studentId: number) => {
    if (!classId) return;

    removeStudentFromClassMutation.mutate({
      studentId,
      classId: parseInt(classId)
    });
  }, [classId, removeStudentFromClassMutation]);

  const closeAddStudentDialog = useCallback(() => {
    setIsAddStudentDialogOpen(false);
    setSelectedStudentId("");
  }, []);

  if (classLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Загрузка класса...</span>
        </div>
      </MainLayout>
    );
  }

  if (classError) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Ошибка загрузки</h1>
            <p className="text-gray-600 mb-4">Произошла ошибка при загрузке информации о классе.</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate('/classes-management')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Вернуться к списку классов
              </Button>
              <Button onClick={() => window.location.reload()}>
                Обновить страницу
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!classData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Класс не найден</h1>
            <p className="text-gray-600 mb-4">Запрашиваемый класс не существует или был удален.</p>
            <Button onClick={() => navigate('/classes-management')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Вернуться к списку классов
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => navigate('/classes-management')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад к классам
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                <School className="h-8 w-8 text-blue-600" />
                {classData.name}
              </h1>
              <p className="text-slate-600">
                {classData.gradeLevel} класс • {classData.academicYear} •
                Учеников: {classStudents.length} •
                Система оценивания: {classData.gradingSystem === GradingSystemEnum.CUMULATIVE ? 'Накопительная' : 'Пятибалльная'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск учеников..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button
                onClick={() => setIsAddStudentDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Добавить ученика
              </Button>
            </div>
          </div>
        </div>

        {/* Period Selection */}
        <div className="mb-6 p-4 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Система периодов:</span>
              </div>
              {academicPeriodsData ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    {classPeriodType === AcademicPeriodTypeEnum.QUARTERS && 'Четверти'}
                    {classPeriodType === AcademicPeriodTypeEnum.TRIMESTERS && 'Триместры'}
                    {classPeriodType === AcademicPeriodTypeEnum.SEMESTERS && 'Полугодия'}
                  </span>
                  <span className="text-xs text-slate-500">(настроено для класса)</span>
                </div>
              ) : (
                <Select value={periodSystem} onValueChange={(value: PeriodSystemType) => setPeriodSystem(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarters">Четверти</SelectItem>
                    <SelectItem value="trimesters">Триместры</SelectItem>
                    <SelectItem value="semesters">Полугодия</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentYear(prev => prev - 1)}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                {currentYear - 1}
              </Button>
              <span className="text-sm font-medium text-slate-700 px-3">
                {getAcademicYear(currentYear)}-{getAcademicYear(currentYear) + 1} уч. год
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentYear(prev => prev + 1)}
                className="flex items-center gap-1"
              >
                {currentYear + 1}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>


        </div>

        {/* Students Table */}
        <div className="p-0 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-700/10">
              <TableRow>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Имя</TableHead>
                {periods.map((period) => (
                  <TableHead key={period.key} className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                    {period.name}
                  </TableHead>
                ))}
                <TableHead className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                  {yearPeriod.name}
                </TableHead>
                <TableHead className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-white/10">
              {studentsLoading || averagesLoading ? (
                <TableRow>
                  <TableCell colSpan={periods.length + 3} className="text-center py-6 text-slate-600">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      {studentsLoading ? "Загрузка учеников..." : "Загрузка оценок..."}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={periods.length + 3} className="text-center py-6 text-slate-600">
                    {searchTerm ? "Ученики не найдены" : "В классе нет учеников"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                      {student.firstName} {student.lastName}
                    </TableCell>
                    {periods.map((period) => {
                      const studentAverages = periodAverages[period.key]?.[student.id];
                      const overallAverage = studentAverages?.overall;

                      return (
                        <TableCell
                          key={period.key}
                          className={cn(
                            "px-4 py-4 whitespace-nowrap text-sm text-center",
                            getGradeColor(overallAverage)
                          )}
                        >
                          {formatGrade(overallAverage)}
                        </TableCell>
                      );
                    })}
                    {/* Итоговая оценка за год */}
                    <TableCell
                      className={cn(
                        "px-4 py-4 whitespace-nowrap text-sm text-center font-bold",
                        (() => {
                          const yearAverages = periodAverages[yearPeriod.key]?.[student.id];
                          const overallAverage = yearAverages?.overall;
                          return getGradeColor(overallAverage);
                        })()
                      )}
                    >
                      {(() => {
                        const yearAverages = periodAverages[yearPeriod.key]?.[student.id];
                        const overallAverage = yearAverages?.overall;
                        return formatGrade(overallAverage, true);
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStudent(student.id)}
                          disabled={removeStudentFromClassMutation.isPending}
                          className="text-red-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add Student Dialog */}
        <Dialog open={isAddStudentDialogOpen} onOpenChange={closeAddStudentDialog}>
          <DialogContent className="p-6 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20 sm:max-w-md max-w-[95vw] w-full">
            <DialogHeader>
              <DialogTitle className="text-slate-800">Добавить ученика в класс</DialogTitle>
              <DialogDescription className="text-slate-600">
                Выберите ученика для добавления в класс {classData.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Выберите ученика:</label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger className="flex h-10 w-full items-center justify-between rounded-xl border border-white/20 bg-slate-100/20 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500/80 backdrop-filter backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70">
                    <SelectValue placeholder="Выберите ученика" />
                  </SelectTrigger>
                  <SelectContent className="relative z-50 p-1 min-w-[8rem] overflow-hidden rounded-2xl border border-white/20 bg-slate-100/50 backdrop-filter backdrop-blur-xl text-slate-800 shadow-lg">
                    {availableStudents.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500">
                        Нет доступных учеников
                      </div>
                    ) : (
                      availableStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id.toString()} className="relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm text-slate-800 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[rgb(2,191,122)]/20 data-[highlighted]:text-[rgb(2,191,122)] focus:bg-[rgb(2,191,122)]/20 focus:text-[rgb(2,191,122)]">
                          {student.lastName} {student.firstName} ({student.username})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={closeAddStudentDialog} className="text-slate-700 border-slate-300 hover:bg-slate-100">
                  Отмена
                </Button>
                <Button
                  onClick={handleAddStudent}
                  disabled={!selectedStudentId || addStudentToClassMutation.isPending}
                  className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium text-white bg-gradient-to-b from-[rgb(2,191,122)]/95 via-[rgb(2,191,122)]/90 to-[rgb(2,191,122)]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_0_0_1.5px_rgba(255,255,255,0.2),0_5px_15px_-3px_rgba(0,0,0,0.08),_0_8px_25px_-8px_rgba(0,0,0,0.07)] hover:from-[rgb(2,191,122)]/95 hover:via-[rgb(2,191,122)]/90 hover:to-[rgb(2,191,122)]/95 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_0_0_1.5px_rgba(255,255,255,0.3),0_6px_18px_-3px_rgba(0,0,0,0.1),0_10px_30px_-8px_rgba(0,0,0,0.09)] hover:-translate-y-px active:scale-[0.97] active:from-[rgb(2,191,122)]/95 active:via-[rgb(2,191,122)]/90 active:to-[rgb(2,191,122)]/95 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
                >
                  {addStudentToClassMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Добавление...
                    </>
                  ) : (
                    "Добавить"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

export default function ClassDetailsPage() {
  try {
    return <ClassDetailsPageContent />;
  } catch (error) {
    console.error('Error in ClassDetailsPage:', error);
    const [, navigate] = useLocation();
    const { toast } = useToast();

    useEffect(() => {
      toast({
        title: "Произошла ошибка",
        description: "Не удалось загрузить страницу класса",
        variant: "destructive",
      });
    }, [toast]);

    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Ошибка загрузки</h1>
            <p className="text-gray-600 mb-4">Произошла ошибка при загрузке страницы класса.</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate('/classes-management')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Вернуться к списку классов
              </Button>
              <Button onClick={() => window.location.reload()}>
                Обновить страницу
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }
}
