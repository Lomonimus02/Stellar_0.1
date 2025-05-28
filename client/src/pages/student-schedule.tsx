import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { ScheduleCarousel } from "@/components/schedule/schedule-carousel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { useRoleCheck } from "@/hooks/use-role-check";
import { Loader2, ArrowLeft } from "lucide-react";
import { Schedule, Class, Subject, User, Grade, Homework } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function StudentSchedulePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { isClassTeacher, isSchoolAdmin, isPrincipal } = useRoleCheck();
  
  // Проверка доступа (только классный руководитель, администратор или директор имеют доступ)
  const hasAccess = isClassTeacher() || isSchoolAdmin() || isPrincipal();
  
  if (!hasAccess) {
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
  
  // Загрузка расписания для ученика
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/student-schedules", studentId],
    queryFn: async () => {
      const res = await fetch(`/api/student-schedules/${studentId}`);
      if (!res.ok) throw new Error("Failed to fetch student schedules");
      return res.json();
    },
    enabled: !!studentId
  });
  
  // Загрузка данных ученика
  const { data: studentData, isLoading: studentLoading } = useQuery<User>({
    queryKey: ["/api/users", studentId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${studentId}`);
      if (!res.ok) throw new Error("Failed to fetch student data");
      return res.json();
    },
    enabled: !!studentId
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
  
  // Загрузка оценок
  const { data: grades = [], isLoading: gradesLoading } = useQuery<Grade[]>({
    queryKey: ["/api/grades"],
    enabled: !!user
  });
  
  // Загрузка подгрупп
  const { data: subgroups = [], isLoading: subgroupsLoading } = useQuery<any[]>({
    queryKey: ["/api/subgroups"],
    enabled: !!user
  });
  
  const isLoading = schedulesLoading || studentLoading || subjectsLoading || 
                    teachersLoading || classesLoading || homeworkLoading || 
                    gradesLoading || subgroupsLoading;
  
  return (
    <MainLayout className="overflow-hidden">
      <div className="container mx-auto py-8 h-full flex flex-col">
        <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4 flex-shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-fit"
            onClick={() => window.history.back()}
          >
            <ArrowLeft size={16} className="mr-2" />
            Назад
          </Button>
          
          <h1 className="text-2xl sm:text-3xl font-bold">
            Расписание ученика: {studentData ? `${studentData.lastName} ${studentData.firstName}` : `#${studentId}`}
          </h1>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-lg">Загрузка расписания...</span>
          </div>
        ) : (
          <>
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
                  showClassNames={true}
                  canView={true} // Режим просмотра
                />
              </div>
            ) : (
              <Alert>
                <AlertTitle>Расписание отсутствует</AlertTitle>
                <AlertDescription>
                  Для данного ученика еще не создано расписание
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}