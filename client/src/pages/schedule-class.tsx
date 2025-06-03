import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ScheduleCarousel } from "@/components/schedule/schedule-carousel";
import { TimeSlotsManager } from "@/components/schedule/time-slots-manager";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { useRoleCheck } from "@/hooks/use-role-check";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Schedule, Class, Subject, User, Grade, Homework } from "@shared/schema";
import { ScheduleForm } from "@/components/schedule/schedule-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClassSchedulePage() {
  const params = useParams<{ classId: string }>();
  const classId = parseInt(params.classId);
  const [location] = useLocation();
  const { user } = useAuth();
  const { isSchoolAdmin } = useRoleCheck();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Состояния для управления формой расписания
  const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [scheduleToEdit, setScheduleToEdit] = useState<Schedule | null>(null);
  
  // Проверка доступа (администраторы школы имеют полный доступ, директора - только просмотр)
  const isPrincipal = user?.role === 'principal';
  const canView = isPrincipal;
  
  if (!isSchoolAdmin() && !canView) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8">
          <Alert variant="destructive">
            <AlertTitle>Доступ запрещен</AlertTitle>
            <AlertDescription>
              У вас нет прав для просмотра этой страницы
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }
  
  // Проверка валидности ID класса
  if (isNaN(classId)) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8">
          <Alert variant="destructive">
            <AlertTitle>Ошибка</AlertTitle>
            <AlertDescription>
              Некорректный идентификатор класса
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }
  
  // Загрузка данных класса
  const { data: classData, isLoading: classLoading } = useQuery<Class>({
    queryKey: ["/api/classes", classId],
    queryFn: async () => {
      const response = await fetch(`/api/classes/${classId}`);
      if (!response.ok) throw new Error("Не удалось загрузить данные класса");
      return response.json();
    },
    enabled: !isNaN(classId)
  });
  
  // Загрузка расписания для указанного класса
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules", { classId }],
    queryFn: async () => {
      const response = await fetch(`/api/schedules?classId=${classId}`);
      if (!response.ok) throw new Error("Не удалось загрузить расписание");
      return response.json();
    },
    enabled: !isNaN(classId)
  });
  
  // Загрузка предметов
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: !!user
  });
  
  // Загрузка учителей
  const { data: teachers = [], isLoading: teachersLoading } = useQuery<User[]>({
    queryKey: ["/api/users", { role: "teacher" }],
    enabled: !!user
  });
  
  // Загрузка классов
  const { data: classes = [], isLoading: classesLoading } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    enabled: !!user
  });
  
  // Загрузка домашних заданий
  const { data: homework = [], isLoading: homeworkLoading } = useQuery<Homework[]>({
    queryKey: ["/api/homework", { classId }],
    enabled: !!user && !isNaN(classId)
  });
  
  // Загрузка оценок (если необходимо)
  const { data: grades = [], isLoading: gradesLoading } = useQuery<Grade[]>({
    queryKey: ["/api/grades", { classId }],
    enabled: !!user && !isNaN(classId)
  });
  
  // Загрузка подгрупп для класса
  const { data: subgroups = [], isLoading: subgroupsLoading } = useQuery<any[]>({
    queryKey: ["/api/subgroups", { classId }],
    enabled: !!user && !isNaN(classId)
  });
  
  // Мутация для создания расписания
  const createScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/schedules', 'POST', data);
    },
    onSuccess: () => {
      // Инвалидируем кэш расписаний для перезагрузки данных
      queryClient.invalidateQueries({ queryKey: ['/api/schedules', { classId }] });
      setIsScheduleFormOpen(false);
      toast({
        title: 'Урок добавлен',
        description: 'Урок успешно добавлен в расписание',
        variant: 'default'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось добавить урок в расписание',
        variant: 'destructive'
      });
    }
  });
  
  // Мутация для обновления расписания
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return await apiRequest(`/api/schedules/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      // Инвалидируем кэш расписаний для перезагрузки данных
      queryClient.invalidateQueries({ queryKey: ['/api/schedules', { classId }] });
      setIsScheduleFormOpen(false);
      setScheduleToEdit(null);
      toast({
        title: 'Урок обновлен',
        description: 'Урок успешно обновлен в расписании',
        variant: 'default'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось обновить урок в расписании',
        variant: 'destructive'
      });
    }
  });
  
  // Мутация для удаления расписания
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/schedules/${id}`, 'DELETE');
    },
    onSuccess: () => {
      // Инвалидируем кэш расписаний для перезагрузки данных
      queryClient.invalidateQueries({ queryKey: ['/api/schedules', { classId }] });
      toast({
        title: 'Урок удален',
        description: 'Урок успешно удален из расписания',
        variant: 'default'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить урок из расписания',
        variant: 'destructive'
      });
    }
  });
  
  // Обработчик отправки формы расписания
  const handleScheduleFormSubmit = (data: any) => {
    if (scheduleToEdit) {
      // Редактирование существующего расписания
      updateScheduleMutation.mutate({ id: scheduleToEdit.id, data: { ...data, classId } });
    } else {
      // Создание нового расписания
      createScheduleMutation.mutate({ ...data, classId });
    }
  };
  
  // Обработчик открытия формы создания расписания
  const handleAddSchedule = (date: Date) => {
    setSelectedDate(date);
    setScheduleToEdit(null);
    setIsScheduleFormOpen(true);
  };
  
  // Обработчик открытия формы редактирования расписания
  const handleEditSchedule = (schedule: Schedule) => {
    setScheduleToEdit(schedule);
    setIsScheduleFormOpen(true);
  };
  
  // Обработчик удаления расписания
  const handleDeleteSchedule = (scheduleId: number) => {
    if (confirm('Вы уверены, что хотите удалить этот урок из расписания?')) {
      deleteScheduleMutation.mutate(scheduleId);
    }
  };
  
  const isLoading = classLoading || schedulesLoading || subjectsLoading || 
                    teachersLoading || classesLoading || homeworkLoading || 
                    gradesLoading || subgroupsLoading;
  
  return (
    <MainLayout className="overflow-hidden">
      <div className="container mx-auto py-8 h-full flex flex-col">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-lg">Загрузка расписания...</span>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-shrink-0">
              <h1 className="text-2xl sm:text-3xl font-bold">
                Расписание класса: {classData?.name || `#${classId}`}
              </h1>
              {!canView && (
                <Button 
                  onClick={() => {
                    setSelectedDate(new Date());
                    setScheduleToEdit(null);
                    setIsScheduleFormOpen(true);
                  }}
                  className="flex items-center gap-2 shrink-0"
                >
                  <Plus size={16} />
                  Добавить урок
                </Button>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 mb-4 flex-shrink-0">
              <Link href={`/schedule-class/${classId}`} className={`px-4 py-2 rounded-md font-medium ${!location.includes('time-slots') ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
                Расписание
              </Link>
              {!canView && (
                <Link href={`/schedule-class/${classId}/time-slots`} className={`px-4 py-2 rounded-md font-medium ${location.includes('time-slots') ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
                  Настройка временных слотов
                </Link>
              )}
            </div>
            
            {schedules.length > 0 ? (
              <div className="flex-grow overflow-hidden">
                <ScheduleCarousel
                  schedules={schedules}
                  subjects={subjects}
                  teachers={teachers}
                  classes={classes}
                  grades={grades}
                  homework={homework}
                  currentUser={user}
                  isAdmin={isSchoolAdmin()}
                  subgroups={subgroups}
                  showClassNames={false} // В расписании класса не показываем название класса для каждого урока
                  onAddSchedule={handleAddSchedule} // Обработчик добавления урока
                  onEditSchedule={handleEditSchedule} // Обработчик редактирования урока
                  onDeleteSchedule={handleDeleteSchedule} // Обработчик удаления урока
                  canView={canView} // Передаем флаг режима просмотра для директора
                />
              </div>
            ) : (
              <Alert>
                <AlertTitle>Расписание отсутствует</AlertTitle>
                <AlertDescription>
                  Для данного класса еще не создано расписание
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>
      
      {/* Модальное окно формы расписания */}
      <ScheduleForm
        isOpen={isScheduleFormOpen}
        onClose={() => {
          setIsScheduleFormOpen(false);
          setScheduleToEdit(null);
        }}
        onSubmit={handleScheduleFormSubmit}
        classId={classId}
        initialValues={scheduleToEdit}
        selectedDate={selectedDate}
        loading={createScheduleMutation.isPending || updateScheduleMutation.isPending}
      />
    </MainLayout>
  );
}