import React, { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useRoleCheck } from "@/hooks/use-role-check";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Class, UserRoleEnum } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlusIcon, BookIcon, CheckIcon, XIcon, SearchIcon } from "lucide-react";

// Схема формы для добавления ученика в класс
const studentClassFormSchema = z.object({
  studentId: z.string({
    required_error: "Выберите ученика",
  }),
  classId: z.string({
    required_error: "Выберите класс",
  }),
});

export default function StudentClassAssignmentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSchoolAdmin, isSuperAdmin } = useRoleCheck();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);

  // Получение списка пользователей
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!(user && (isSchoolAdmin() || isSuperAdmin()))
  });

  // Получение списка классов
  const { data: classes = [], isLoading: classesLoading } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    enabled: !!user
  });

  // Получение классов для выбранного студента
  const { data: studentClasses = [], isLoading: studentClassesLoading, refetch: refetchStudentClasses } = useQuery<Class[]>({
    queryKey: ["/api/student-classes", selectedStudent],
    queryFn: async ({ queryKey }) => {
      const studentId = queryKey[1];
      if (!studentId) return [];
      const res = await fetch(`/api/student-classes?studentId=${studentId}`);
      if (!res.ok) throw new Error("Failed to fetch student classes");
      return res.json();
    },
    enabled: !!selectedStudent
  });

  // Фильтруем студентов
  const students = users.filter(u => u.role === UserRoleEnum.STUDENT);
  
  // Фильтруем по поисковому запросу
  const filteredStudents = searchTerm ? students.filter(student => 
    `${student.firstName} ${student.lastName} ${student.username}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) : students;

  // Форма для добавления ученика в класс
  const form = useForm<z.infer<typeof studentClassFormSchema>>({
    resolver: zodResolver(studentClassFormSchema),
    defaultValues: {
      studentId: "",
      classId: "",
    },
  });

  // Мутация для добавления ученика в класс
  const addStudentToClassMutation = useMutation({
    mutationFn: async (data: { studentId: number, classId: number }) => {
      const res = await apiRequest("POST", "/api/student-classes", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Ученик добавлен в класс",
        variant: "default",
      });
      // Сбрасываем форму
      form.reset();
      // Обновляем данные
      if (selectedStudent) {
        refetchStudentClasses();
      }
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить ученика в класс",
        variant: "destructive",
      });
    },
  });

  // Обработчик отправки формы
  const onSubmit = (values: z.infer<typeof studentClassFormSchema>) => {
    // Устанавливаем выбранного студента в форму, если не выбран
    if (!values.studentId && selectedStudent) {
      values.studentId = selectedStudent.toString();
    }
    
    if (!values.studentId || !values.classId) {
      toast({
        title: "Ошибка",
        description: "Необходимо выбрать ученика и класс",
        variant: "destructive",
      });
      return;
    }
    
    addStudentToClassMutation.mutate({
      studentId: parseInt(values.studentId),
      classId: parseInt(values.classId)
    });
  };

  // Назначить выбранного студента и получить его классы
  const handleStudentSelect = (studentId: number) => {
    setSelectedStudent(studentId);
    
    // Устанавливаем выбранного студента в форму
    form.setValue("studentId", studentId.toString());
  };

  // Получаем имя студента
  const getStudentName = (id: number) => {
    const student = students.find(s => s.id === id);
    return student ? `${student.lastName} ${student.firstName}` : `Ученик ${id}`;
  };

  // Получаем имя класса
  const getClassName = (id: number) => {
    const cls = classes.find(c => c.id === id);
    return cls ? cls.name : `Класс ${id}`;
  };

  // Проверяем, находится ли студент уже в классе
  const isStudentInClass = (studentId: number, classId: number) => {
    if (!selectedStudent || selectedStudent !== studentId) return false;
    return studentClasses.some(cls => cls.id === classId);
  };

  return (
    <MainLayout>
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">Управление учениками в классах</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Список студентов */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Ученики</CardTitle>
              <CardDescription>Выберите ученика для просмотра его классов</CardDescription>
              <div className="relative mt-2">
                <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск ученика..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] overflow-y-auto">
                {usersLoading ? (
                  <div className="text-center p-4">Загрузка учеников...</div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center p-4 text-gray-500">Ученики не найдены</div>
                ) : (
                  <ul className="space-y-2">
                    {filteredStudents.map((student) => (
                      <li key={student.id}>
                        <Button
                          variant={selectedStudent === student.id ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => handleStudentSelect(student.id)}
                        >
                          <UserPlusIcon className="h-4 w-4 mr-2" />
                          {student.lastName} {student.firstName}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Форма добавления в класс и список классов ученика */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>
                {selectedStudent ? (
                  <>Классы ученика: {getStudentName(selectedStudent)}</>
                ) : (
                  <>Выберите ученика</>
                )}
              </CardTitle>
              <CardDescription>
                {selectedStudent ? "Управление классами для выбранного ученика" : "Для управления классами сначала выберите ученика из списка слева"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedStudent && (
                <>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="studentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ученик</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={selectedStudent?.toString() || field.value}
                                defaultValue={selectedStudent?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите ученика" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {students.map((student) => (
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
                        <FormField
                          control={form.control}
                          name="classId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Класс</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите класс" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {classes.map((cls) => (
                                    <SelectItem 
                                      key={cls.id} 
                                      value={cls.id.toString()}
                                      disabled={isStudentInClass(selectedStudent, cls.id)}
                                    >
                                      {cls.name} {isStudentInClass(selectedStudent, cls.id) && "(уже добавлен)"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button type="submit" disabled={addStudentToClassMutation.isPending}>
                        {addStudentToClassMutation.isPending ? "Добавление..." : "Добавить в класс"}
                      </Button>
                    </form>
                  </Form>

                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Текущие классы ученика</h3>
                    {studentClassesLoading ? (
                      <div className="text-center p-4">Загрузка классов...</div>
                    ) : studentClasses.length === 0 ? (
                      <div className="text-center p-4 text-gray-500">Ученик не добавлен ни в один класс</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Класс</TableHead>
                            <TableHead>Учебный год</TableHead>
                            <TableHead>Уровень</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentClasses.map((cls) => (
                            <TableRow key={cls.id}>
                              <TableCell className="font-medium">{cls.name}</TableCell>
                              <TableCell>{cls.academicYear}</TableCell>
                              <TableCell>{cls.gradeLevel}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </>
              )}

              {!selectedStudent && (
                <div className="text-center py-8 text-gray-500">
                  <BookIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p>Для управления классами выберите ученика из списка слева</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}