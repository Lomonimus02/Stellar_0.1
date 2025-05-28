import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Schedule, Attendance, Subgroup } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { FiCheck, FiX, FiSave, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface AttendanceFormProps {
  schedule: Schedule;
  onClose: () => void;
}

// Расширенный интерфейс статуса посещаемости, включающий "late" (опоздание)
type AttendanceStatus = "present" | "absent" | "late";

interface StudentWithAttendance {
  id: number;
  firstName: string;
  lastName: string;
  attendanceId?: number; // ID записи посещаемости, если она уже существует
  status: AttendanceStatus; // Статус посещаемости
  comment?: string; // Комментарий (например, причина отсутствия)
}

export const AttendanceForm: React.FC<AttendanceFormProps> = ({
  schedule,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Состояние для списка студентов с их статусом посещаемости
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Количество студентов на одной странице

  // Получаем список студентов из класса с оптимизированным ключом запроса
  const { data: classStudents = [], isLoading: isLoadingStudents } = useQuery<User[]>({
    queryKey: ['/api/students-by-class', schedule.classId],
    enabled: !!schedule.classId,
  });

  // Получаем данные по посещаемости для конкретного урока
  const { data: attendanceData = [], isLoading: isLoadingAttendance, refetch: refetchAttendance } = useQuery<any[]>({
    // Обновляем ключ запроса, чтобы он повторно запрашивался при изменении subgroupId
    queryKey: ['/api/attendance', schedule.id, schedule.subgroupId],
    queryFn: async () => {
      if (!schedule.id) return [];
      try {
        console.log(`Запрос данных о посещаемости для урока с ID=${schedule.id}${schedule.subgroupId ? ', подгруппа ' + schedule.subgroupId : ''}`);
        const url = `/api/attendance?scheduleId=${schedule.id}${schedule.subgroupId ? '&subgroupId=' + schedule.subgroupId : ''}`;
        console.log(`URL запроса: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Ошибка при получении данных о посещаемости: ${response.status}`);
        }
        const data = await response.json();
        console.log(`Получено ${data.length} записей о посещаемости для урока ${schedule.id}`, data);
        return data;
      } catch (error) {
        console.error("Ошибка при запросе данных о посещаемости:", error);
        toast({
          title: "Ошибка загрузки данных",
          description: "Не удалось загрузить данные о посещаемости. Попробуйте обновить страницу.",
          variant: "destructive",
        });
        return [];
      }
    },
    enabled: !!schedule.id,
    staleTime: 0, // Всегда получаем свежие данные
    gcTime: 10000, // 10 секунд на сборку мусора
  });

  // Получаем студентов подгруппы, если урок связан с подгруппой
  const { data: subgroupStudents = [], isLoading: isLoadingSubgroupStudents } = useQuery<User[]>({
    queryKey: ['/api/students-by-subgroup', schedule.subgroupId],
    queryFn: async () => {
      if (!schedule.subgroupId) return [];
      
      // Используем параметр запроса в соответствии с новым API на сервере
      const response = await fetch(`/api/students-by-subgroup?subgroupId=${schedule.subgroupId}`);
      if (!response.ok) {
        throw new Error(`Ошибка при получении студентов подгруппы: ${response.status}`);
      }
      const data = await response.json();
      console.log(`Получено ${data.length} студентов из подгруппы ${schedule.subgroupId}:`, data);
      return data;
    },
    enabled: !!schedule.subgroupId,
  });
  
  // Получаем информацию о подгруппе, если урок связан с подгруппой
  const { data: subgroupInfo, isLoading: isLoadingSubgroupInfo } = useQuery<Subgroup>({
    queryKey: ['/api/subgroups', schedule.subgroupId],
    enabled: !!schedule.subgroupId,
  });

  // Мутация для массового обновления посещаемости
  const updateAttendanceMutation = useMutation({
    mutationFn: async (attendanceData: any[]) => {
      return await apiRequest('/api/attendance', 'POST', attendanceData);
    },
    onSuccess: () => {
      // Обновляем данные о посещаемости после успешного сохранения
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      
      toast({
        title: "Посещаемость сохранена",
        description: "Данные о посещаемости успешно сохранены",
      });
      
      onClose();
    },
    onError: (error) => {
      console.error('Ошибка при сохранении посещаемости:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить данные о посещаемости",
        variant: "destructive",
      });
    }
  });

  // Эффект для обработки изменения выбранного урока
  useEffect(() => {
    // Сбрасываем данные при изменении расписания для загрузки новых
    if (schedule.id) {
      setStudents([]);
    }
  }, [schedule.id]);
  
  // Эффект для инициализации данных о посещаемости
  useEffect(() => {
    // Ждем загрузку всех необходимых данных
    if (isLoadingStudents || isLoadingAttendance || 
        (schedule.subgroupId && (isLoadingSubgroupStudents || isLoadingSubgroupInfo))) {
      return;
    }
    
    // Если у нас уже есть данные студентов и мы не в процессе загрузки, не перезагружаем
    if (students.length > 0 && !isLoadingAttendance) {
      return;
    }

    // Определяем список студентов для отображения
    let studentsToShow: User[] = [];
    
    // Если урок привязан к подгруппе, используем только студентов данной подгруппы
    if (schedule.subgroupId && subgroupStudents.length > 0) {
      console.log(`Используем ${subgroupStudents.length} студентов из подгруппы ${schedule.subgroupId}`);
      studentsToShow = [...subgroupStudents];
    } else {
      // Иначе показываем всех студентов класса
      console.log(`Используем ${classStudents.length} студентов из класса ${schedule.classId}`);
      studentsToShow = [...classStudents];
    }

    // Сортируем студентов по фамилии и имени
    studentsToShow.sort((a, b) => {
      const lastNameA = a.lastName || '';
      const lastNameB = b.lastName || '';
      if (lastNameA !== lastNameB) {
        return lastNameA.localeCompare(lastNameB);
      }
      const firstNameA = a.firstName || '';
      const firstNameB = b.firstName || '';
      return firstNameA.localeCompare(firstNameB);
    });

    // Создаем список студентов с их статусом посещаемости
    const studentsWithAttendance = studentsToShow.map(student => {
      // Ищем запись о посещаемости для данного студента
      const attendanceRecord = Array.isArray(attendanceData) 
        ? attendanceData.find(a => a.studentId === student.id)
        : null;
      
      let status: AttendanceStatus = "absent"; // По умолчанию считаем отсутствующим
      let id: number | undefined = undefined;
      let comment: string = "";
      
      // Если есть запись о посещаемости, извлекаем её данные
      if (attendanceRecord) {
        console.log("Найдена запись для студента:", student.id, attendanceRecord);
        
        // Проверяем формат ответа от сервера
        if (attendanceRecord.attendance && attendanceRecord.attendance !== null) {
          // Формат: { studentId, studentName, attendance: { id, status, ... } }
          id = attendanceRecord.attendance.id;
          status = attendanceRecord.attendance.status || "absent";
          comment = attendanceRecord.attendance.comment || "";
          console.log(`Найдена запись посещаемости для студента ${student.id} в поле attendance:`, status);
        } else if (attendanceRecord.status) {
          // Формат: { studentId, status, ... }
          id = attendanceRecord.id;
          status = attendanceRecord.status;
          comment = attendanceRecord.comment || "";
          console.log(`Найдена запись посещаемости для студента ${student.id} напрямую:`, status);
        } else {
          console.log(`Для студента ${student.id} найдена запись, но не удалось извлечь статус, используем absent по умолчанию`);
        }
      }
      
      return {
        id: student.id,
        firstName: student.firstName || "",
        lastName: student.lastName || "",
        attendanceId: id,
        status: status as AttendanceStatus,
        comment: comment
      };
    });

    setStudents(studentsWithAttendance);
  }, [
    classStudents, 
    subgroupStudents,
    attendanceData, 
    schedule.id, 
    schedule.classId,
    schedule.subgroupId, 
    isLoadingStudents, 
    isLoadingAttendance, 
    isLoadingSubgroupStudents, 
    isLoadingSubgroupInfo,
    students.length
  ]);

  // Обработчик изменения статуса посещаемости для студента
  const handleAttendanceChange = (studentId: number, status: AttendanceStatus) => {
    setStudents(prev => 
      prev.map(student => 
        student.id === studentId 
          ? { ...student, status } 
          : student
      )
    );
  };

  // Обработчик изменения комментария для студента
  const handleCommentChange = (studentId: number, comment: string) => {
    setStudents(prev => 
      prev.map(student => 
        student.id === studentId 
          ? { ...student, comment } 
          : student
      )
    );
  };

  // Сохранение данных о посещаемости с использованием массовой операции
  const handleSaveAttendance = () => {
    if (!schedule.id || !schedule.classId || !schedule.scheduleDate) {
      toast({
        title: "Ошибка сохранения",
        description: "Недостаточно данных о расписании для сохранения посещаемости",
        variant: "destructive",
      });
      return;
    }
    
    // Подготавливаем данные для массового обновления
    const attendanceData = students.map(student => ({
      studentId: student.id,
      scheduleId: schedule.id,
      classId: schedule.classId,
      status: student.status,
      date: schedule.scheduleDate,
      comment: student.comment
    }));
    
    // Запускаем мутацию для массового обновления посещаемости
    updateAttendanceMutation.mutate(attendanceData);
  };

  // Обработчик быстрого выбора статуса для всех студентов
  const handleMarkAll = (status: AttendanceStatus) => {
    setStudents(prev => prev.map(student => ({ ...student, status })));
  };

  // Получение текущей страницы студентов
  const getCurrentPageStudents = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return students.slice(startIndex, endIndex);
  };

  // Общее количество страниц
  const totalPages = Math.ceil(students.length / itemsPerPage);

  // Обработчики навигации по страницам
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Функция для отображения цвета статуса посещаемости
  const getStatusBadgeVariant = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return 'success';
      case 'absent': return 'destructive';
      case 'late': return 'warning';
      default: return 'outline';
    }
  };

  const isLoading = isLoadingStudents || isLoadingAttendance || 
    (schedule.subgroupId && (isLoadingSubgroupStudents || isLoadingSubgroupInfo));
  const isSubmitting = updateAttendanceMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium">Отметка посещаемости</h3>
          <p className="text-sm text-gray-500">
            {schedule.scheduleDate} • {schedule.startTime}-{schedule.endTime}
          </p>
          {schedule.subgroupId && (
            <Badge variant="outline" className="mt-1">
              Подгруппа: {subgroupInfo?.name || `ID ${schedule.subgroupId}`}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleMarkAll("present")}
            disabled={isSubmitting || isLoading}
          >
            <FiCheck className="mr-1" /> Все присутствуют
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleMarkAll("absent")}
            disabled={isSubmitting || isLoading}
          >
            <FiX className="mr-1" /> Все отсутствуют
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center">
          <Spinner className="mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Загрузка данных...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">Нет студентов для отображения</p>
        </div>
      ) : (
        <>
          <ScrollArea className="h-[50vh] max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-12">№</TableHead>
                  <TableHead>Студент</TableHead>
                  <TableHead className="w-32 text-center">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getCurrentPageStudents().map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {student.lastName} {student.firstName}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={student.status}
                        onValueChange={(value) => 
                          handleAttendanceChange(student.id, value as AttendanceStatus)
                        }
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className={`w-full ${
                          student.status === 'present' ? 'text-green-600' : 
                          student.status === 'absent' ? 'text-red-600' : 
                          'text-amber-600'
                        }`}>
                          <SelectValue placeholder="Выберите статус" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present" className="text-green-600">
                            Присутствует
                          </SelectItem>
                          <SelectItem value="absent" className="text-red-600">
                            Отсутствует
                          </SelectItem>
                          <SelectItem value="late" className="text-amber-600">
                            Опоздал
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {totalPages > 1 && (
            <Pagination className="justify-center">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => goToPage(currentPage - 1)} 
                    disabled={currentPage === 1 || isSubmitting}
                    className={currentPage === 1 || isSubmitting ? "opacity-50 cursor-not-allowed" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink 
                      isActive={currentPage === page}
                      onClick={() => goToPage(page)}
                      disabled={isSubmitting}
                      className={isSubmitting ? "opacity-50 cursor-not-allowed" : ""}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => goToPage(currentPage + 1)} 
                    disabled={currentPage === totalPages || isSubmitting}
                    className={currentPage === totalPages || isSubmitting ? "opacity-50 cursor-not-allowed" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      <div className="flex justify-between items-center pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchAttendance()}
          disabled={isSubmitting || isLoading}
        >
          Обновить данные
        </Button>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSaveAttendance}
            disabled={isSubmitting || isLoading || students.length === 0}
          >
            {isSubmitting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Сохранение...
              </>
            ) : (
              <>
                <FiSave className="mr-2" />
                Сохранить
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};