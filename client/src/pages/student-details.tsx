// client/src/pages/student-details.tsx
import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useRoleCheck } from "@/hooks/use-role-check";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Subject, Grade, GradingSystemEnum, AcademicPeriodTypeEnum } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  User as UserIcon,
  BookOpen,
  Search,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  FileDown
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function StudentDetailsPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPrincipal, isVicePrincipal, isSchoolAdmin, isTeacher, isClassTeacher } = useRoleCheck();

  // Проверяем, что studentId существует и является валидным числом
  if (!studentId || isNaN(parseInt(studentId))) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Ученик не найден</h1>
            <p className="text-gray-600 mb-4">
              {!studentId ? "Не указан идентификатор ученика." : "Неверный идентификатор ученика."}
            </p>
            <Button onClick={() => navigate('/classes-management')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Вернуться к списку классов
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("year");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("");
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  // Автоматически определяем текущий период при инициализации
  const currentPeriodInfo = getCurrentAcademicPeriod();
  const [currentYear, setCurrentYear] = useState<number>(currentPeriodInfo.year);

  // Check access - только администраторы, директора, завучи, учителя и классные руководители могут просматривать
  const hasAccess = isPrincipal() || isVicePrincipal() || isSchoolAdmin() || isTeacher() || isClassTeacher();

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

  // Data fetching - получаем информацию об ученике
  const { data: studentData, isLoading: studentLoading, error: studentError } = useQuery<User>({
    queryKey: ["/api/users", studentId],
    queryFn: async () => {
      const res = await apiRequest(`/api/users/${studentId}`);
      if (!res.ok) {
        throw new Error(`Ошибка загрузки ученика: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!studentId,
  });

  // Получаем класс ученика
  const { data: studentClass, isLoading: classLoading } = useQuery<any>({
    queryKey: ["/api/student-classes", studentId],
    queryFn: async () => {
      const res = await apiRequest(`/api/student-classes?studentId=${studentId}`);
      if (!res.ok) {
        throw new Error(`Ошибка загрузки класса ученика: ${res.status}`);
      }
      const data = await res.json();
      return data.length > 0 ? data[0] : null;
    },
    enabled: !!studentId,
  });

  // Получаем предметы ученика
  const { data: studentSubjects = [], isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/student-subjects", studentId],
    queryFn: async () => {
      const res = await apiRequest(`/api/student-subjects/${studentId}`);
      if (!res.ok) {
        throw new Error(`Ошибка загрузки предметов: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!studentId,
  });

  // Получаем настройки учебных периодов для класса ученика
  const { data: academicPeriodsData, isLoading: periodsLoading } = useAcademicPeriods(studentClass?.classId || null);

  // Определяем систему периодов на основе настроек класса
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
          return 'quarters';
      }
    }
    return 'quarters';
  }, [academicPeriodsData, classPeriodType]);

  // Функция для получения учебного года
  const getAcademicYear = useCallback((year: number) => {
    const currentMonth = new Date().getMonth();
    return currentMonth >= 8 ? year : year - 1;
  }, []);

  // Определяем периоды на основе настроек класса или системы по умолчанию
  const periods = useMemo(() => {
    if (!academicPeriodsData) {
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

    const academicYear = getAcademicYear(currentYear);
    return {
      key: 'year',
      name: 'Год',
      startDate: new Date(academicYear, 8, 1),
      endDate: new Date(academicYear + 1, 4, 31)
    };
  }, [academicPeriodsData, currentYear, getAcademicYear]);

  // Получаем оценки ученика по всем предметам
  const { data: studentGrades = [], isLoading: gradesLoading } = useQuery<Grade[]>({
    queryKey: ["/api/grades", { studentId: parseInt(studentId) }],
    queryFn: async () => {
      const res = await apiRequest(`/api/grades?studentId=${studentId}`);
      if (!res.ok) {
        throw new Error(`Ошибка загрузки оценок: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!studentId,
  });
  
  // Получаем данные о пропусках ученика
  const { data: studentAbsences = {}, isLoading: absencesLoading } = useQuery<Record<number, number>>({
    queryKey: ["/api/student-absences", studentId, selectedPeriod, currentYear],
    queryFn: async () => {
      try {
        if (!studentId || !studentClass) return {};
        
        const selectedPeriodData = selectedPeriod === 'year' ? yearPeriod : periods.find(p => p.key === selectedPeriod);
        if (!selectedPeriodData) return {};
        
        const fromDate = format(selectedPeriodData.startDate, 'yyyy-MM-dd');
        const toDate = format(selectedPeriodData.endDate, 'yyyy-MM-dd');
        
        // Для демонстрации используем случайные значения
        // В реальном приложении здесь должен быть запрос к API
        const absencesBySubject: Record<number, number> = {};
        
        studentSubjects.forEach(subject => {
          absencesBySubject[subject.id] = Math.floor(Math.random() * 5);
        });
        
        return absencesBySubject;
      } catch (error) {
        console.error("Ошибка при получении данных о пропусках:", error);
        return {};
      }
    },
    enabled: !!studentId && !!studentClass && !!selectedPeriod && studentSubjects.length > 0,
  });

  // Получаем средние оценки для выбранного периода
  const { data: periodAverages = {}, isLoading: averagesLoading } = useQuery<Record<string, { average: string, percentage: string }>>({
    queryKey: ["/api/student-subject-averages", studentId, selectedPeriod, currentYear],
    queryFn: async () => {
      try {
        if (!studentId || !studentClass) return {};

        const selectedPeriodData = selectedPeriod === 'year' ? yearPeriod : periods.find(p => p.key === selectedPeriod);
        if (!selectedPeriodData) return {};

        const fromDate = format(selectedPeriodData.startDate, 'yyyy-MM-dd');
        const toDate = format(selectedPeriodData.endDate, 'yyyy-MM-dd');
        
        const apiUrl = `/api/student-subject-averages?classId=${studentClass.classId}&studentId=${studentId}&fromDate=${fromDate}&toDate=${toDate}`;
        
        const res = await apiRequest(apiUrl);
        if (!res.ok) {
          console.warn(`Не удалось получить средние оценки: ${res.status}`);
          return {};
        }

        const data = await res.json();
        const studentData = data[studentId] || {};
        
        return studentData;
      } catch (error) {
        console.error("Ошибка при получении средних оценок:", error);
        return {};
      }
    },
    enabled: !!studentId && !!studentClass && (!!selectedPeriod),
  });

  // Функция для форматирования оценки в зависимости от системы оценивания
  const formatGrade = useCallback((average: { average: string, percentage: string } | undefined, isYearGrade = false) => {
    if (!average) {
      return '-';
    }

    if (studentClass?.gradingSystem === GradingSystemEnum.CUMULATIVE) {
      // Для накопительной системы отображаем процент с 1 знаком после запятой
      if (!average.percentage) return '-';
      
      // Удаляем символ '%' если он есть, преобразуем в число и форматируем
      const percentValue = parseFloat(average.percentage.replace('%', ''));
      if (isNaN(percentValue)) return '-';
      
      return `${percentValue.toFixed(1)}%`;
    } else {
      // Для 5-балльной системы отображаем средний балл с 2 знаками после запятой
      const numericAverage = parseFloat(average.average);
      
      if (isNaN(numericAverage)) {
        return '-';
      }

      if (isYearGrade) {
        // Для годовой оценки округляем до целого
        return Math.round(numericAverage).toString();
      }

      // Для обычной оценки отображаем 2 знака после запятой
      return numericAverage.toFixed(2);
    }
  }, [studentClass?.gradingSystem]);

  // Функция для получения цвета оценки
  const getGradeColor = useCallback((average: { average: string, percentage: string } | undefined) => {
    if (!average) {
      return 'text-slate-400';
    }

    if (studentClass?.gradingSystem === GradingSystemEnum.CUMULATIVE) {
      // Обрабатываем случай, когда percentage может быть строкой с символом '%'
      const percentageStr = average.percentage || '0%';
      const percentage = parseFloat(percentageStr.replace('%', ''));
      
      if (isNaN(percentage)) {
        return 'text-slate-400';
      }
      
      if (percentage >= 90) return 'text-green-600 font-semibold';
      if (percentage >= 75) return 'text-blue-600 font-medium';
      if (percentage >= 60) return 'text-yellow-600 font-medium';
      
      return 'text-red-600 font-medium';
    } else {
      const numericAverage = parseFloat(average.average);
      
      if (isNaN(numericAverage)) {
        return 'text-slate-400';
      }
      
      if (numericAverage >= 4.5) return 'text-green-600 font-semibold';
      if (numericAverage >= 3.5) return 'text-blue-600 font-medium';
      if (numericAverage >= 2.5) return 'text-yellow-600 font-medium';
      
      return 'text-red-600 font-medium';
    }
  }, [studentClass?.gradingSystem]);

  // Фильтрация предметов по поисковому запросу
  const filteredSubjects = useMemo(() => {
    return studentSubjects.filter(subject =>
      subject.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [studentSubjects, searchTerm]);

  // Группировка оценок по предметам с учетом выбранного периода
  const gradesBySubject = useMemo(() => {
    const grouped: Record<number, Grade[]> = {};
    
    // Определяем даты выбранного периода
    const selectedPeriodData = selectedPeriod === 'year' ? yearPeriod : periods.find(p => p.key === selectedPeriod);
    const periodStartDate = selectedPeriodData ? selectedPeriodData.startDate : null;
    const periodEndDate = selectedPeriodData ? selectedPeriodData.endDate : null;
    
    // Фильтруем оценки по выбранному периоду
    const filteredGrades = studentGrades.filter(grade => {
      if (!periodStartDate || !periodEndDate) return true;
      
      const gradeDate = new Date(grade.createdAt);
      return gradeDate >= periodStartDate && gradeDate <= periodEndDate;
    });
    
    // Группируем отфильтрованные оценки по предметам
    filteredGrades.forEach(grade => {
      if (!grouped[grade.subjectId]) {
        grouped[grade.subjectId] = [];
      }
      grouped[grade.subjectId].push(grade);
    });
    
    return grouped;
  }, [studentGrades, selectedPeriod, yearPeriod, periods]);

  // Вычисление общей средней оценки
  const overallAverage = useMemo(() => {
    // Если есть данные с сервера, используем их
    if (Object.keys(periodAverages).length > 0) {
      const subjectAverages = Object.values(periodAverages);
      if (subjectAverages.length === 0) return null;

      if (studentClass?.gradingSystem === GradingSystemEnum.CUMULATIVE) {
        const totalPercentage = subjectAverages.reduce((sum, avg) => {
          // Удаляем символ '%' если он есть
          const percentageStr = avg.percentage || '0%';
          const percentage = parseFloat(percentageStr.replace('%', ''));
          return sum + (isNaN(percentage) ? 0 : percentage);
        }, 0);
        const avgPercentage = totalPercentage / subjectAverages.length;
        return {
          average: avgPercentage.toFixed(2), // Сохраняем с 2 знаками для возможных расчетов
          percentage: avgPercentage.toFixed(1) + '%' // Отображаем с 1 знаком
        };
      } else {
        const totalAverage = subjectAverages.reduce((sum, avg) => {
          const average = parseFloat(avg.average);
          return sum + (isNaN(average) ? 0 : average);
        }, 0);
        const avgValue = totalAverage / subjectAverages.length;
        return {
          average: avgValue.toFixed(2), // Отображаем с 2 знаками
          percentage: ((avgValue / 5) * 100).toFixed(1) + '%'
        };
      }
    } else {
      // Если данных с сервера нет, рассчитываем средний балл локально
      // Получаем все оценки за выбранный период
      const allGrades = Object.values(gradesBySubject).flat();
      if (allGrades.length === 0) return null;
      
      // Группируем оценки по предметам для расчета среднего балла по каждому предмету
      const subjectAverages = {};
      
      // Для каждого предмета рассчитываем средний балл
      filteredSubjects.forEach(subject => {
        const grades = gradesBySubject[subject.id] || [];
        if (grades.length > 0) {
          const sum = grades.reduce((total, grade) => total + grade.grade, 0);
          subjectAverages[subject.id] = sum / grades.length;
        }
      });
      
      // Рассчитываем общий средний балл на основе средних баллов по предметам
      const averageValues = Object.values(subjectAverages);
      if (averageValues.length === 0) return null;
      
      const totalAverage = averageValues.reduce((sum, avg) => sum + avg, 0) / averageValues.length;
      
      if (studentClass?.gradingSystem === GradingSystemEnum.CUMULATIVE) {
        const percentage = ((totalAverage / 5) * 100);
        return {
          average: totalAverage.toFixed(2), // Сохраняем с 2 знаками для возможных расчетов
          percentage: percentage.toFixed(1) + '%' // Отображаем с 1 знаком
        };
      } else {
        return {
          average: totalAverage.toFixed(2), // Отображаем с 2 знаками
          percentage: ((totalAverage / 5) * 100).toFixed(1) + '%'
        };
      }
    }
  }, [periodAverages, studentClass?.gradingSystem, gradesBySubject, filteredSubjects]);

  const handleExportDocx = async () => {
    if (!studentId || !selectedPeriod || !currentYear) {
      toast({
        title: "Ошибка",
        description: "Необходимо выбрать ученика, период и учебный год для экспорта.",
        variant: "destructive",
      });
      return;
    }

    setIsExportingDocx(true);
    try {
      // Получаем стартовый год для academicYear (например, 2023 для 2023-2024)
      const academicYearStart = getAcademicYear(currentYear);

      const response = await apiRequest(
        `/api/export/student-grades/${studentId}/docx?periodKey=${selectedPeriod}&academicYear=${academicYearStart}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Не удалось получить детали ошибки" }));
        throw new Error(errorData.message || `Ошибка экспорта: ${response.status}`);
      }

      const blob = await response.blob();
      const studentUsername = studentData?.username || 'student';
      const fileName = `grades_${studentUsername}_${selectedPeriod}_${academicYearStart}.docx`;
      
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);

      toast({
        title: "Экспорт успешен",
        description: "Файл с оценками был успешно скачан.",
      });
    } catch (error) {
      console.error("Ошибка при экспорте DOCX:", error);
      toast({
        title: "Ошибка экспорта",
        description: error.message || "Произошла неизвестная ошибка при экспорте файла.",
        variant: "destructive",
      });
    } finally {
      setIsExportingDocx(false);
    }
  };

  if (studentLoading || classLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Загрузка информации об ученике...</span>
        </div>
      </MainLayout>
    );
  }

  if (studentError || !studentData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Ошибка загрузки</h1>
            <p className="text-gray-600 mb-4">Не удалось загрузить информацию об ученике.</p>
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
                <GraduationCap className="h-8 w-8 text-blue-600" />
                {studentData.firstName} {studentData.lastName}
              </h1>
              <p className="text-slate-600">
                {studentClass ? `Класс: ${studentClass.name}` : 'Класс не определен'} •
                Логин: {studentData.username} •
                Email: {studentData.email}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск предметов..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button
                onClick={handleExportDocx}
                disabled={isExportingDocx || !studentId || !selectedPeriod || !currentYear}
                variant="outline"
              >
                <FileDown className="h-4 w-4 mr-2" />
                {isExportingDocx ? "Экспорт..." : "Экспорт DOCX"}
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
                <span className="text-sm font-medium text-slate-700">Период:</span>
              </div>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.key} value={period.key}>
                      {period.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="year">Весь год</SelectItem>
                </SelectContent>
              </Select>
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

        {/* Loading state */}
        {(subjectsLoading || gradesLoading) && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Загрузка данных...</span>
          </div>
        )}

        {/* Overall Average Card */}
        {overallAverage && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Общая средняя оценка</h3>
                  <p className="text-sm text-slate-600">
                    За период: {selectedPeriod === 'year' ? yearPeriod.name : periods.find(p => p.key === selectedPeriod)?.name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={cn("text-2xl font-bold", getGradeColor(overallAverage))}>
                  {formatGrade(overallAverage, selectedPeriod === 'year')}
                </div>
                <div className="text-sm text-slate-500">
                  {studentClass?.gradingSystem === GradingSystemEnum.CUMULATIVE ? 'Процентов' : 'Баллов (из 5)'}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Subjects and Grades Table */}
        <div className="p-0 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Предметы и оценки
              </h2>
              <div className="text-sm text-slate-600">
                Всего предметов: {filteredSubjects.length} из {studentSubjects.length}
              </div>
            </div>
          </div>

          <Table>
            <TableHeader className="bg-slate-700/10">
              <TableRow>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Предмет
                </TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Все оценки
                </TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Средняя оценка
                </TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Пропуски
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-white/10">
              {subjectsLoading || averagesLoading || absencesLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-slate-600">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Загрузка данных...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredSubjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-slate-600">
                    {searchTerm ? "Предметы не найдены" : "У ученика нет предметов"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubjects.map((subject) => {
                  const subjectGrades = gradesBySubject[subject.id] || [];
                  
                  // Получаем средний балл с сервера или рассчитываем локально
                  let subjectAverage = periodAverages[subject.id];
                  
                  // Если средний балл не получен с сервера, рассчитываем его локально
                  if (!subjectAverage && subjectGrades.length > 0) {
                    const sum = subjectGrades.reduce((total, grade) => total + grade.grade, 0);
                    const avg = sum / subjectGrades.length;
                    
                    if (studentClass?.gradingSystem === GradingSystemEnum.CUMULATIVE) {
                      // Для накопительной системы - процент с 1 знаком после запятой
                      const percentage = ((avg / 5) * 100).toFixed(1);
                      subjectAverage = {
                        average: avg.toFixed(2), // Сохраняем с 2 знаками для возможных расчетов
                        percentage: `${percentage}%`
                      };
                    } else {
                      // Для 5-балльной системы - средний балл с 2 знаками после запятой
                      subjectAverage = {
                        average: avg.toFixed(2),
                        percentage: "-"
                      };
                    }
                  }

                  return (
                    <TableRow key={subject.id} className="hover:bg-white/5 transition-colors">
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                        <div>
                          <div className="font-semibold">{subject.name}</div>
                          {subject.description && (
                            <div className="text-xs text-slate-500 mt-1">{subject.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center">
                        <div className="flex flex-wrap gap-1 justify-center max-w-xs">
                          {subjectGrades.length > 0 ? (
                            // Отображаем все оценки, сортируя их по дате (от новых к старым)
                            subjectGrades
                              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                              .map((grade, index) => (
                                <span
                                  key={index}
                                  className={cn(
                                    "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                                    grade.grade >= 4 ? "bg-green-100 text-green-800" :
                                    grade.grade >= 3 ? "bg-blue-100 text-blue-800" :
                                    grade.grade >= 2 ? "bg-yellow-100 text-yellow-800" :
                                    "bg-red-100 text-red-800"
                                  )}
                                  title={`${grade.gradeType || 'Оценка'} - ${format(new Date(grade.createdAt), 'dd.MM.yyyy')}`}
                                >
                                  {grade.grade}
                                </span>
                              ))
                          ) : (
                            <span className="text-slate-400 text-sm">Нет оценок</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={cn(
                        "px-4 py-4 whitespace-nowrap text-sm text-center font-semibold",
                        getGradeColor(subjectAverage)
                      )}>
                        {formatGrade(subjectAverage, selectedPeriod === 'year')}
                      </TableCell>
                      <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-center">
                        <div className="flex flex-col items-center">
                          {absencesLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <span className={cn(
                                "font-medium",
                                studentAbsences[subject.id] > 0 ? "text-amber-600" : "text-slate-800"
                              )}>
                                {studentAbsences[subject.id] || 0}
                              </span>
                              <span className="text-xs text-slate-500 mt-1">
                                {studentAbsences[subject.id] === 1 ? "пропуск" : 
                                 studentAbsences[subject.id] > 1 && studentAbsences[subject.id] < 5 ? "пропуска" : "пропусков"}
                              </span>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
