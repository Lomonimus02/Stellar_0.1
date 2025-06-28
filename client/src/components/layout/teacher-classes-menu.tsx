import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useRoleCheck } from "@/hooks/use-role-check";
import { Schedule, Class, Subject, Subgroup } from "@shared/schema";
import { ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// Формат для комбинации класса и предмета
interface ClassSubjectCombination {
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  // Добавляем поля для подгрупп
  subgroupId?: number;
  subgroupName?: string;
  isSubgroup?: boolean;
}

export function TeacherClassesMenu() {
  const { user } = useAuth();
  const { isTeacher } = useRoleCheck();
  const [location] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Определяем, активна ли страница с классами
  const isActive = location.startsWith('/teacher-classes') || 
                   location.startsWith('/class-grade-details');
  
  // Если страница активна, автоматически раскрываем меню
  useEffect(() => {
    if (isActive) {
      setIsExpanded(true);
    }
  }, [isActive]);

  // Получаем расписания, в которых преподаватель ведет занятия
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules", { teacherId: user?.id }],
    queryFn: async () => {
      const res = await apiRequest(`/api/schedules?teacherId=${user?.id}`, "GET");
      if (!res.ok) throw new Error("Не удалось загрузить расписание");
      
      // Добавляем console.log для отладки
      const data = await res.json();
      
      // Проверяем есть ли в расписаниях подгруппы
      const schedulesWithSubgroups = data.filter((schedule: any) => schedule.subgroupId !== null);
      console.log("Teacher schedules:", data);
      console.log("Schedules with subgroups:", schedulesWithSubgroups);
      
      if (schedulesWithSubgroups.length > 0) {
        console.log("Found schedules with subgroups:", 
          schedulesWithSubgroups.map((s: any) => ({
            scheduleId: s.id,
            subgroupId: s.subgroupId,
            classId: s.classId,
            subjectId: s.subjectId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime
          }))
        );
      } else {
        console.log("No schedules with subgroups found");
      }
      
      return data;
    },
    enabled: !!user && isTeacher(),
    // Добавляем более частое обновление, чтобы новые уроки быстрее отображались в меню
    refetchInterval: 30000, // Проверка каждые 30 секунд
    refetchOnWindowFocus: true, // Обновление при фокусе окна
    staleTime: 5000 // Данные считаются устаревшими через 5 секунд
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
    enabled: !!user && isTeacher()
  });
  
  // Получаем список всех подгрупп
  const { data: subgroups = [], isLoading: subgroupsLoading } = useQuery<Subgroup[]>({
    queryKey: ["/api/subgroups"],
    queryFn: async () => {
      const res = await apiRequest("/api/subgroups", "GET");
      if (!res.ok) throw new Error("Не удалось загрузить подгруппы");
      const data = await res.json();
      console.log("API response for subgroups:", data); 
      console.log("User:", user?.id, user?.username, user?.role);
      return data;
    },
    enabled: !!user && isTeacher()
  });

  // Создаем список уникальных комбинаций класс-предмет-подгруппа на основе расписания
  const classSubjectCombinations: ClassSubjectCombination[] = (() => {
    // Создаем промежуточную структуру для группировки расписаний
    type ScheduleGroup = {
      classId: number;
      subjectId: number;
      // Для каждого предмета сохраняем все его подгруппы
      subgroups: {
        id: number;
        name: string;
        hasLessons: boolean; // Флаг, указывающий, есть ли у подгруппы проведенные уроки
      }[];
      // Флаг, указывающий, есть ли у предмета уроки без привязки к подгруппам
      hasNonSubgroupLessons: boolean;
    };
    
    // Группировка по классам и предметам
    const groupedSchedules: { [key: string]: ScheduleGroup } = {};
    
    // Проходим по всем расписаниям и группируем их
    schedules.forEach(schedule => {
      // Проверяем, что у расписания есть и класс, и предмет
      if (!schedule.classId || !schedule.subjectId) return;
      
      // Найдем класс и предмет в соответствующих списках
      const classInfo = classes.find(c => c.id === schedule.classId);
      const subjectInfo = subjects.find(s => s.id === schedule.subjectId);
      
      // Если информация о классе или предмете не найдена, пропускаем
      if (!classInfo || !subjectInfo) return;
      
      // Ключ для группировки: classId-subjectId
      const key = `${schedule.classId}-${schedule.subjectId}`;
      
      // Если группа не существует, создаем ее
      if (!groupedSchedules[key]) {
        groupedSchedules[key] = {
          classId: schedule.classId,
          subjectId: schedule.subjectId,
          subgroups: [],
          hasNonSubgroupLessons: false
        };
      }
      
      // Если расписание связано с подгруппой
      if (schedule.subgroupId) {
        const subgroupInfo = subgroups.find(sg => sg.id === schedule.subgroupId);
        if (subgroupInfo) {
          // Проверяем, есть ли уже эта подгруппа в списке
          const existingSubgroup = groupedSchedules[key].subgroups.find(sg => sg.id === schedule.subgroupId);
          if (!existingSubgroup) {
            groupedSchedules[key].subgroups.push({
              id: schedule.subgroupId,
              name: subgroupInfo.name,
              hasLessons: true
            });
          }
        }
      } else {
        // Если это урок без привязки к подгруппе, отмечаем это в группе
        groupedSchedules[key].hasNonSubgroupLessons = true;
      }
    });
    
    // Преобразуем сгруппированные данные в результирующий массив
    const result: ClassSubjectCombination[] = [];
    
    // Проходим по всем группам
    Object.values(groupedSchedules).forEach(group => {
      const classInfo = classes.find(c => c.id === group.classId)!;
      const subjectInfo = subjects.find(s => s.id === group.subjectId)!;
      
      // Если у предмета есть уроки без подгрупп или нет подгрупп вообще
      if (group.hasNonSubgroupLessons || group.subgroups.length === 0) {
        // Добавляем комбинацию класс-предмет
        result.push({
          classId: group.classId,
          className: classInfo.name,
          subjectId: group.subjectId,
          subjectName: subjectInfo.name,
          isSubgroup: false
        });
      }
      
      // Если есть подгруппы, добавляем их
      group.subgroups.forEach(subgroup => {
        // Определяем, нужно ли отображать название предмета
        // Если у предмета есть уроки без подгрупп, то показываем предмет+подгруппа
        // Иначе показываем только подгруппу
        result.push({
          classId: group.classId,
          className: classInfo.name,
          subjectId: group.subjectId,
          subjectName: group.hasNonSubgroupLessons ? subjectInfo.name : "", // Пустое название предмета, если нет обычных уроков
          subgroupId: subgroup.id,
          subgroupName: subgroup.name,
          isSubgroup: true
        });
      });
    });
    
    console.log("Сформированные комбинации класс-предмет-подгруппа:", result);
    
    return result;
  })();
  
  // Сортируем комбинации: сначала по имени класса, затем по имени предмета
  classSubjectCombinations.sort((a, b) => {
    // Сначала сортируем по имени класса
    if (a.className !== b.className) {
      return a.className.localeCompare(b.className);
    }
    
    // Затем по предмету
    if (a.subjectName !== b.subjectName) {
      return a.subjectName.localeCompare(b.subjectName);
    }
    
    // Если оба элемента - подгруппы, сортируем по имени подгруппы
    if (a.isSubgroup && b.isSubgroup && a.subgroupName && b.subgroupName) {
      return a.subgroupName.localeCompare(b.subgroupName);
    }
    
    // Если один из элементов - подгруппа, а другой нет, ставим обычный предмет вперед
    if (a.isSubgroup !== b.isSubgroup) {
      return a.isSubgroup ? 1 : -1; // Обычные предметы идут первыми
    }
    
    return 0;
  });

  const isLoading = schedulesLoading || subjectsLoading || classesLoading || subgroupsLoading;
  
  // Проверяем, активна ли текущая комбинация класс/предмет/подгруппа
  const isItemActive = (classId: number, subjectId: number, subgroupId?: number) => {
    if (subgroupId) {
      return location === `/class-grade-details/${classId}/${subjectId}/${subgroupId}`;
    }
    return location === `/class-grade-details/${classId}/${subjectId}`;
  };

  return (
    <div className="relative mb-2">
      {/* Основной пункт меню "Мои классы" */}
      <div
        className={cn(
          "group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer w-full",
          isActive 
            ? "bg-primary text-white" 
            : "text-gray-700 hover:bg-primary-50 hover:text-gray-900"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className={cn(
          isActive 
            ? "text-white" 
            : "text-gray-500 group-hover:text-gray-700"
        )}>
          <BookOpen className="h-4 w-4 mr-3" />
        </span>
        <span className="truncate flex-1">Мои классы</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </div>

      {/* Выпадающее меню с классами и предметами */}
      {isExpanded && (
        <div className="ml-4 mt-1 space-y-1 bg-slate-200/40 backdrop-blur-md rounded-md p-2 shadow-inner">
          {isLoading ? (
            <div className="text-sm text-slate-500 py-1 px-3">Загрузка...</div> 
          ) : classSubjectCombinations.length === 0 ? (
            <div className="text-sm text-slate-500 py-1 px-3">Нет назначенных классов</div>
          ) : (
            classSubjectCombinations.map((item) => (
              <div
                key={`${item.classId}-${item.subjectId}${item.subgroupId ? `-${item.subgroupId}` : ''}`}
              >
                <Link 
                  href={item.isSubgroup && item.subgroupId 
                    ? `/class-grade-details/${item.classId}/${item.subjectId}/${item.subgroupId}`
                    : `/class-grade-details/${item.classId}/${item.subjectId}`
                  }
                >
                  <div 
                    className={cn(
                      "flex items-center text-sm py-1.5 px-3 rounded-md w-full cursor-pointer",
                      isItemActive(item.classId, item.subjectId, item.subgroupId) 
                        ? "bg-white/40 text-[rgb(2,191,122)] shadow-sm" 
                        : "text-slate-700 hover:bg-slate-300/60 hover:text-slate-900"
                    )}
                  >
                    <span className="truncate">
                      {item.isSubgroup && item.subgroupName 
                        ? (item.subjectName 
                           ? `${item.subjectName} (${item.subgroupName}) - ${item.className}` // Если есть и предмет, и подгруппа
                           : `${item.subgroupName} - ${item.className}`) // Если только подгруппа без предмета
                        : `${item.subjectName} - ${item.className}` // Обычный предмет без подгруппы
                      }
                    </span>
                  </div>
                </Link>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}