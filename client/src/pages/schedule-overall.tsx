import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ScheduleCarousel } from "@/components/schedule/schedule-carousel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { useRoleCheck } from "@/hooks/use-role-check";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Schedule, Class, Subject, User, Grade, Homework } from "@shared/schema";

export default function OverallSchedulePage() {
  const { user } = useAuth();
  const { isSchoolAdmin } = useRoleCheck();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  
  // Проверка доступа (администраторы школы и директора должны иметь доступ)
  const { isPrincipal } = useRoleCheck();
  if (!isSchoolAdmin() && !isPrincipal()) {
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
  
  // Определение ID школы для запросов
  const getSchoolId = () => {
    // Если у пользователя есть schoolId в профиле, используем его
    if (user?.schoolId) return user.schoolId;
    
    // В противном случае используем ID по умолчанию
    return 2;
  };
  
  // Загрузка расписания для школы
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules"],
    enabled: !!user
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
    queryKey: ["/api/homework"],
    enabled: !!user
  });
  
  // Загрузка оценок (если необходимо)
  const { data: grades = [], isLoading: gradesLoading } = useQuery<Grade[]>({
    queryKey: ["/api/grades"],
    enabled: !!user
  });
  
  // Загрузка подгрупп
  const { data: subgroups = [], isLoading: subgroupsLoading } = useQuery<any[]>({
    queryKey: ["/api/subgroups"],
    enabled: !!user
  });
  
  const isLoading = schedulesLoading || subjectsLoading || 
                    teachersLoading || classesLoading || homeworkLoading || 
                    gradesLoading || subgroupsLoading;
  
  // Фильтрация расписания по школе администратора
  const schoolClasses = classes.filter(cls => cls.schoolId === getSchoolId());
  const schoolClassIds = schoolClasses.map(cls => cls.id);
  
  // Фильтрация расписания в соответствии с выбранным фильтром
  const filteredSchedules = schedules.filter(schedule => {
    // Проверяем, принадлежит ли расписание к классу из школы администратора
    const belongsToSchool = schoolClassIds.includes(schedule.classId);
    
    if (!belongsToSchool) return false;
    
    if (selectedFilter === "all") {
      return true;
    } else if (selectedFilter.startsWith("class-")) {
      const classId = parseInt(selectedFilter.replace("class-", ""));
      return schedule.classId === classId;
    } else if (selectedFilter.startsWith("subject-")) {
      const subjectId = parseInt(selectedFilter.replace("subject-", ""));
      return schedule.subjectId === subjectId;
    } else if (selectedFilter.startsWith("teacher-")) {
      const teacherId = parseInt(selectedFilter.replace("teacher-", ""));
      return schedule.teacherId === teacherId;
    }
    
    return true;
  });
  
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
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-shrink-0">
              <h1 className="text-2xl sm:text-3xl font-bold">Общее расписание школы</h1>
              
              <div className="w-full md:w-72 shrink-0">
                <Select 
                  value={selectedFilter} 
                  onValueChange={setSelectedFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите фильтр" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все уроки</SelectItem>
                    <SelectItem value="divider-classes" disabled>── Классы ──</SelectItem>
                    {schoolClasses.map(cls => (
                      <SelectItem key={`class-${cls.id}`} value={`class-${cls.id}`}>
                        Класс: {cls.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="divider-subjects" disabled>── Предметы ──</SelectItem>
                    {subjects
                      .filter(subject => subject.schoolId === getSchoolId())
                      .map(subject => (
                        <SelectItem key={`subject-${subject.id}`} value={`subject-${subject.id}`}>
                          Предмет: {subject.name}
                        </SelectItem>
                      ))
                    }
                    <SelectItem value="divider-teachers" disabled>── Учителя ──</SelectItem>
                    {teachers.map(teacher => (
                      <SelectItem key={`teacher-${teacher.id}`} value={`teacher-${teacher.id}`}>
                        Учитель: {teacher.lastName} {teacher.firstName?.[0]}.
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {filteredSchedules.length > 0 ? (
              <div className="flex-grow overflow-hidden">
                <ScheduleCarousel
                  schedules={filteredSchedules}
                  subjects={subjects}
                  teachers={teachers}
                  classes={classes}
                  grades={grades}
                  homework={homework}
                  currentUser={user}
                  isAdmin={isSchoolAdmin()}
                  subgroups={subgroups}
                  showClassNames={true} // Включаем отображение имени класса для каждого урока в общем расписании
                  onAddSchedule={() => {}} // Пустая функция, т.к. не используем добавление расписания на этой странице
                />
              </div>
            ) : (
              <Alert>
                <AlertTitle>Расписание отсутствует</AlertTitle>
                <AlertDescription>
                  {selectedFilter === "all" 
                    ? "В школе еще не создано расписание" 
                    : "Не найдено расписание с указанными параметрами фильтра"}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}