import { useState, useCallback } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useRoleCheck } from "@/hooks/use-role-check";
import { 
  UserRoleEnum, 
  Schedule as ScheduleType, 
  Class, 
  Subject, 
  User,
  insertGradeSchema,
  Grade,
  Homework,
} from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, GraduationCapIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Импортируем наши новые компоненты
import { ScheduleCarousel } from "@/components/schedule/schedule-carousel";
import { ScheduleForm } from "@/components/schedule/schedule-form";

// Схема для создания оценок
const gradeFormSchema = insertGradeSchema.extend({
  studentId: z.number({
    required_error: "Выберите ученика",
  }),
  grade: z.number({
    required_error: "Укажите оценку",
  }).min(1, "Минимальная оценка - 1").max(5, "Максимальная оценка - 5"),
  comment: z.string().nullable().optional(),
  gradeType: z.string({
    required_error: "Укажите тип оценки",
  }),
  scheduleId: z.number().nullable().optional(), // Добавляем scheduleId для привязки оценки к конкретному уроку
});

export default function SchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSuperAdmin, isSchoolAdmin, isTeacher, isPrincipal } = useRoleCheck();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);
  const [isClassStudentsDialogOpen, setIsClassStudentsDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleType | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedAddDate, setSelectedAddDate] = useState<Date | null>(null);
  const [scheduleToEdit, setScheduleToEdit] = useState<ScheduleType | null>(null);
  
  // Check access permissions
  const canEditSchedule = isSuperAdmin() || isSchoolAdmin();
  const canViewSchedule = canEditSchedule || isPrincipal();
  
  // Fetch schedules
  const { data: schedules = [], isLoading } = useQuery<ScheduleType[]>({
    queryKey: ["/api/schedules"],
    enabled: !!user
  });
  
  // Filter schedules for teacher
  const teacherSchedules = isTeacher() 
    ? schedules.filter(s => s.teacherId === user?.id)
    : schedules;
  
  // Fetch classes
  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    enabled: !!user
  });
  
  // Fetch subjects
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: !!user
  });
  
  // Fetch teachers
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!user
  });
  
  // Fetch grades
  const { data: grades = [] } = useQuery<Grade[]>({
    queryKey: ["/api/grades"],
    // Теперь запрашиваем оценки для всех пользователей, а не только для учителя
    enabled: !!user
  });
  
  // Получаем список домашних заданий
  const { data: homework = [] } = useQuery<Homework[]>({
    queryKey: ["/api/homework"],
    enabled: !!user
  });
  
  const teachers = users.filter(u => u.role === UserRoleEnum.TEACHER);
  const students = users.filter(u => u.role === UserRoleEnum.STUDENT);
  
  // Получаем учеников подгруппы
  const { data: studentSubgroups = [] } = useQuery<Array<{studentId: number, subgroupId: number}>>({
    queryKey: ["/api/student-subgroups", user?.id ? { studentId: user.id } : null],
    enabled: !!user && user.role === UserRoleEnum.STUDENT,
    queryFn: async ({ queryKey }) => {
      const [_url, params] = queryKey;
      // Если пользователь - студент, запрашиваем его подгруппы
      if (params && 'studentId' in params) {
        const response = await apiRequest(`/api/student-subgroups?studentId=${params.studentId}`, 'GET');
        return response.json();
      }
      // В остальных случаях запрашиваем все связи
      const response = await apiRequest('/api/student-subgroups', 'GET');
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Получены данные о подгруппах студента:", data);
    },
    onError: (error) => {
      console.error("Ошибка получения данных о подгруппах студента:", error);
    }
  });
  
  // Получаем список подгрупп
  const { data: subgroups = [] } = useQuery<Array<{id: number, name: string, classId: number}>>({
    queryKey: ["/api/subgroups"],
    enabled: !!user
  });
  
  // Get students for a specific class
  const getClassStudents = (classId: number, subgroupId?: number) => {
    // Если указана подгруппа, возвращаем только студентов из этой подгруппы
    if (subgroupId) {
      // Находим ID студентов, которые относятся к этой подгруппе
      const subgroupStudentIds = studentSubgroups
        .filter(sg => sg.subgroupId === subgroupId)
        .map(sg => sg.studentId);
      
      // Возвращаем только студентов из этой подгруппы
      return students.filter(student => 
        student.schoolId === user?.schoolId && 
        subgroupStudentIds.includes(student.id)
      );
    }
    
    // Иначе возвращаем всех студентов класса
    return students.filter(student => {
      return student.schoolId === user?.schoolId;
    });
  };
  
  // Add schedule mutation
  // Define the schedule form schema
  const scheduleFormSchema = z.object({
    classId: z.number(),
    subjectId: z.number(),
    teacherId: z.number(),
    dayOfWeek: z.number(),
    scheduleDate: z.date(),
    startTime: z.string(),
    endTime: z.string(),
    room: z.string().optional(),
    subgroupId: z.number().optional(), // Добавляем поле подгруппы как опциональное
  });

  // Type for the schedule form data
  type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

  const addScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      console.log("Добавление урока в расписание:", data);
      
      // Нормализуем дату без часового пояса, устанавливая полночь UTC
      const formattedData = {
        ...data,
        scheduleDate: new Date(
          Date.UTC(
            data.scheduleDate.getFullYear(),
            data.scheduleDate.getMonth(),
            data.scheduleDate.getDate()
          )
        )
      };
      
      console.log("Отправка данных с нормализованной датой:", formattedData);
      const res = await apiRequest("/api/schedules", "POST", formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setIsAddDialogOpen(false);
      setSelectedAddDate(null);
      setScheduleToEdit(null);
      toast({
        title: "Расписание добавлено",
        description: "Новый урок успешно добавлен в расписание",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить урок в расписание",
        variant: "destructive",
      });
    },
  });
  
  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData & { id: number }) => {
      console.log("Обновление урока в расписании:", data);
      
      // Нормализуем дату без часового пояса, устанавливая полночь UTC
      const { id, ...scheduleData } = data;
      const formattedData = {
        ...scheduleData,
        scheduleDate: new Date(
          Date.UTC(
            data.scheduleDate.getFullYear(),
            data.scheduleDate.getMonth(),
            data.scheduleDate.getDate()
          )
        )
      };
      
      console.log("Отправка данных для обновления с нормализованной датой:", formattedData);
      const res = await apiRequest(`/api/schedules/${id}`, "PATCH", formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setIsAddDialogOpen(false);
      setSelectedAddDate(null);
      setScheduleToEdit(null);
      toast({
        title: "Расписание обновлено",
        description: "Урок был успешно обновлен в расписании",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить урок в расписании",
        variant: "destructive",
      });
    },
  });
  
  // Mutation для удаления расписания
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      const res = await apiRequest(`/api/schedules/${scheduleId}`, "DELETE");
      if (!res.ok) throw new Error("Не удалось удалить урок");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Урок удален",
        description: "Урок был успешно удален из расписания",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка при удалении",
        description: error.message || "Не удалось удалить урок",
        variant: "destructive",
      });
    },
  });
  
  // Формa для добавления оценки
  const gradeForm = useForm<z.infer<typeof gradeFormSchema>>({
    resolver: zodResolver(gradeFormSchema),
    defaultValues: {
      studentId: undefined,
      grade: undefined,
      comment: "",
      gradeType: "Текущая",
      subjectId: selectedSchedule?.subjectId,
      classId: selectedSchedule?.classId,
      teacherId: user?.id,
      scheduleId: selectedSchedule?.id, // Добавляем scheduleId для привязки оценки к конкретному уроку
    },
  });
  
  // Добавить оценку
  const addGradeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof gradeFormSchema>) => {
      const res = await apiRequest("/api/grades", "POST", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grades"] });
      setIsGradeDialogOpen(false);
      gradeForm.reset();
      toast({
        title: "Оценка добавлена",
        description: "Оценка успешно добавлена",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить оценку",
        variant: "destructive",
      });
    },
  });
  
  const onGradeSubmit = (values: z.infer<typeof gradeFormSchema>) => {
    addGradeMutation.mutate(values);
  };
  
  // Helper functions to get data
  const getClassName = (id: number) => {
    const cls = classes.find(c => c.id === id);
    return cls ? cls.name : `Класс ${id}`;
  };
  
  const getSubjectName = (id: number) => {
    const subject = subjects.find(s => s.id === id);
    return subject ? subject.name : `Предмет ${id}`;
  };
  
  const getTeacherName = (id: number) => {
    const teacher = users.find(u => u.id === id);
    return teacher ? `${teacher.lastName} ${teacher.firstName}` : `Учитель ${id}`;
  };

  // Обработка открытия формы добавления/редактирования урока
  const handleAddSchedule = useCallback((date: Date, scheduleToEdit?: ScheduleType) => {
    setSelectedAddDate(date);
    setScheduleToEdit(scheduleToEdit || null);
    setIsAddDialogOpen(true);
  }, []);

  // Обработка отправки формы добавления/редактирования урока
  const handleSubmitSchedule = useCallback((data: any) => {
    if (scheduleToEdit) {
      // Если редактируем существующий урок
      updateScheduleMutation.mutate({
        ...data,
        id: scheduleToEdit.id
      });
    } else {
      // Если добавляем новый урок
      addScheduleMutation.mutate(data);
    }
  }, [addScheduleMutation, updateScheduleMutation, scheduleToEdit]);

  return (
    <MainLayout className="overflow-hidden">
      <div className="container mx-auto px-2 xs:px-3 py-2 h-full flex flex-col overflow-hidden schedule-container">
        <div className="flex flex-wrap justify-center xs:justify-between items-center mb-2 xs:mb-3 flex-shrink-0">
          <h2 className="text-xl xs:text-2xl font-heading font-bold text-gray-800 w-full xs:w-auto text-center xs:text-left mb-2 xs:mb-0">Расписание</h2>
          
          {canEditSchedule && (
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
              Добавить урок
            </Button>
          )}
        </div>
        
        {!canViewSchedule && !isTeacher() && user?.role !== UserRoleEnum.STUDENT ? (
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Доступ запрещен</h2>
            <p className="text-gray-600">У вас нет прав для просмотра расписания</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <CalendarIcon className="h-10 w-10 text-primary mx-auto mb-2" />
            <p>Загрузка расписания...</p>
          </div>
        ) : (
          <div className="flex-grow overflow-hidden">
            <ScheduleCarousel
              schedules={
                (() => {
                  // Базовое расписание (для учителей - только их уроки, для всех остальных - все уроки)
                  let filteredSchedules = isTeacher() ? teacherSchedules : schedules;
                  
                  // Фильтрация расписания для учеников по подгруппам
                  if (user?.role === UserRoleEnum.STUDENT) {
                    // Получаем ID подгрупп, в которых состоит ученик
                    const studentSubgroupIds = studentSubgroups
                      .filter(sg => sg.studentId === user.id)
                      .map(sg => sg.subgroupId);
                    
                    console.log(`Ученик ID=${user.id} состоит в подгруппах:`, studentSubgroupIds);
                    
                    // Выводим информацию о уроках с подгруппами для отладки
                    const schedulesWithSubgroups = filteredSchedules.filter(s => s.subgroupId !== null);
                    console.log("Уроки с подгруппами до фильтрации:", schedulesWithSubgroups);
                    
                    // Фильтруем расписание: 
                    // 1. Уроки без подгрупп (для всего класса)
                    // 2. Уроки с подгруппами, в которых состоит ученик
                    filteredSchedules = filteredSchedules.filter(schedule => {
                      // Если у урока нет подгруппы, он виден всем ученикам класса
                      if (schedule.subgroupId === null) return true;
                      
                      // Если у урока есть подгруппа, проверяем, состоит ли ученик в этой подгруппе
                      const isInSubgroup = studentSubgroupIds.includes(schedule.subgroupId);
                      console.log(`Урок ID=${schedule.id}, подгруппа=${schedule.subgroupId}, ученик в подгруппе: ${isInSubgroup}`);
                      return isInSubgroup;
                    });
                    
                    console.log("Уроки после фильтрации:", filteredSchedules);
                  }
                  
                  // Добавляем названия подгрупп к расписанию
                  return filteredSchedules.map(schedule => {
                    if (schedule.subgroupId) {
                      const subgroup = subgroups.find(sg => sg.id === schedule.subgroupId);
                      return {
                        ...schedule,
                        subgroupName: subgroup?.name || 'Подгруппа'
                      };
                    }
                    return schedule;
                  });
                })()
              }
              subjects={subjects}
              teachers={teachers}
              classes={classes}
              grades={grades}
              homework={homework}
              currentUser={user}
              isAdmin={canEditSchedule}
              canView={canViewSchedule}
              onAddSchedule={handleAddSchedule}
              onDeleteSchedule={(scheduleId) => deleteScheduleMutation.mutate(scheduleId)}
            />
          </div>
        )}
        
        {/* Form for adding/editing schedule */}
        <ScheduleForm
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onSubmit={handleSubmitSchedule}
          defaultDate={selectedAddDate || undefined}
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          isSubmitting={addScheduleMutation.isPending}
          scheduleToEdit={scheduleToEdit}
        />
        
        {/* Class Students Dialog */}
        <Dialog open={isClassStudentsDialogOpen} onOpenChange={setIsClassStudentsDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Ученики класса {getClassName(selectedClassId || 0)}</DialogTitle>
              <DialogDescription>
                Список учеников класса и их оценки по предмету
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[60vh] overflow-y-auto mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Имя</TableHead>
                    <TableHead>Текущие оценки</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getClassStudents(selectedClassId || 0, selectedSchedule?.subgroupId || undefined).map((student) => {
                    // Получаем оценки этого ученика по выбранному предмету
                    const studentGrades = grades.filter(
                      g => g.studentId === student.id && 
                      g.subjectId === selectedSchedule?.subjectId
                    );
                    
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.lastName} {student.firstName}
                        </TableCell>
                        <TableCell>
                          {studentGrades.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {studentGrades.map((grade) => (
                                <div 
                                  key={grade.id} 
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground"
                                  title={grade.comment || ""}
                                >
                                  {grade.grade}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500">Нет оценок</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedStudentId(student.id);
                              setIsClassStudentsDialogOpen(false);
                              
                              // Предзаполняем форму добавления оценки
                              gradeForm.setValue("studentId", student.id);
                              gradeForm.setValue("subjectId", selectedSchedule?.subjectId || 0);
                              gradeForm.setValue("classId", selectedSchedule?.classId || 0);
                              gradeForm.setValue("teacherId", user?.id || 0);
                              // Добавляем scheduleId, чтобы привязать оценку к конкретному уроку
                              gradeForm.setValue("scheduleId", selectedSchedule?.id || 0);
                              
                              setIsGradeDialogOpen(true);
                            }}
                          >
                            Добавить оценку
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Add Grade Dialog */}
        <Dialog open={isGradeDialogOpen} onOpenChange={setIsGradeDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Добавить оценку</DialogTitle>
              <DialogDescription>
                {selectedStudentId ? 
                  `Добавление оценки для ученика: ${
                    students.find(s => s.id === selectedStudentId)?.lastName || ""
                  } ${
                    students.find(s => s.id === selectedStudentId)?.firstName || ""
                  }` : 
                  "Добавление оценки"
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
                            {getClassStudents(selectedSchedule?.classId || 0, selectedSchedule?.subgroupId || undefined).map((student) => (
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
                
                <FormField
                  control={gradeForm.control}
                  name="gradeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип оценки</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип оценки" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Текущая">Текущая</SelectItem>
                          <SelectItem value="Контрольная">Контрольная</SelectItem>
                          <SelectItem value="Экзамен">Экзамен</SelectItem>
                          <SelectItem value="Практическая">Практическая</SelectItem>
                          <SelectItem value="Домашняя">Домашняя</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
                
                <DialogFooter>
                  <Button type="submit" disabled={addGradeMutation.isPending}>
                    {addGradeMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
