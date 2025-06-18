import React, { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useRoleCheck } from "@/hooks/use-role-check";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, UserRoleEnum, ParentStudent } from "@shared/schema";
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
import { Users, UserIcon, UserPlusIcon, SearchIcon } from "lucide-react";

// Схема формы для связывания родителя и ученика
const parentStudentFormSchema = z.object({
  parentId: z.string({
    required_error: "Выберите родителя",
  }),
  studentId: z.string({
    required_error: "Выберите ученика",
  }),
});

export default function ParentStudentConnectionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSchoolAdmin, isSuperAdmin } = useRoleCheck();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParent, setSelectedParent] = useState<number | null>(null);

  // Получение списка пользователей
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!(user && (isSchoolAdmin() || isSuperAdmin()))
  });

  // Получение списка связей родитель-ученик для выбранного родителя
  const { data: parentStudents = [], isLoading: parentStudentsLoading, refetch: refetchParentStudents } = useQuery<ParentStudent[]>({
    queryKey: ["/api/parent-students", selectedParent],
    queryFn: async ({ queryKey }) => {
      const parentId = queryKey[1];
      if (!parentId) return [];
      const res = await fetch(`/api/parent-students?parentId=${parentId}`);
      if (!res.ok) throw new Error("Failed to fetch parent-student connections");
      return res.json();
    },
    enabled: !!selectedParent
  });

  // Фильтруем родителей и студентов
  const parents = users.filter(u => u.role === UserRoleEnum.PARENT);
  const students = users.filter(u => u.role === UserRoleEnum.STUDENT);
  
  // Фильтруем по поисковому запросу
  const filteredParents = searchTerm ? parents.filter(parent => 
    `${parent.firstName} ${parent.lastName} ${parent.username}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) : parents;

  // Форма для добавления связи родитель-ученик
  const form = useForm<z.infer<typeof parentStudentFormSchema>>({
    resolver: zodResolver(parentStudentFormSchema),
    defaultValues: {
      parentId: "",
      studentId: "",
    },
  });

  // Мутация для связывания родителя и ученика
  const addParentStudentMutation = useMutation({
    mutationFn: async (data: { parentId: number, studentId: number }) => {
      const res = await apiRequest("POST", "/api/parent-students", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Родитель связан с учеником",
        variant: "default",
      });
      // Сбрасываем форму
      form.reset();
      // Обновляем данные о связях родитель-ученик
      if (selectedParent) {
        refetchParentStudents();
      }
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось связать родителя с учеником",
        variant: "destructive",
      });
    },
  });

  // Обработчик отправки формы
  const onSubmit = (values: z.infer<typeof parentStudentFormSchema>) => {
    addParentStudentMutation.mutate({
      parentId: parseInt(values.parentId),
      studentId: parseInt(values.studentId)
    });
  };

  // Обработчик выбора родителя
  const handleParentSelect = (parentId: number) => {
    setSelectedParent(parentId);
    form.setValue("parentId", parentId.toString());
  };

  // Получаем имя пользователя по ID
  const getUserName = (id: number) => {
    const user = users.find(u => u.id === id);
    return user ? `${user.lastName} ${user.firstName}` : `Пользователь ${id}`;
  };

  // Проверяем, есть ли уже связь родитель-ученик
  const isStudentConnectedToParent = (parentId: number, studentId: number) => {
    if (!selectedParent || selectedParent !== parentId) return false;
    return parentStudents.some(ps => ps.studentId === studentId);
  };

  // Получаем связанных с родителем детей
  const getConnectedStudents = () => {
    if (!selectedParent) return [];
    
    return parentStudents.map(ps => {
      const student = users.find(u => u.id === ps.studentId);
      return {
        id: ps.id,
        studentId: ps.studentId,
        name: student ? `${student.lastName} ${student.firstName}` : `Ученик ${ps.studentId}`,
        email: student?.email
      };
    });
  };

  return (
    <MainLayout>
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">Управление связями родитель-ученик</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Список родителей */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Родители</CardTitle>
              <CardDescription>Выберите родителя для управления связями с учениками</CardDescription>
              <div className="relative mt-2">
                <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск родителя..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] overflow-y-auto">
                {usersLoading ? (
                  <div className="text-center p-4">Загрузка родителей...</div>
                ) : filteredParents.length === 0 ? (
                  <div className="text-center p-4 text-gray-500">Родители не найдены</div>
                ) : (
                  <ul className="space-y-2">
                    {filteredParents.map((parent) => (
                      <li key={parent.id}>
                        <Button
                          variant={selectedParent === parent.id ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => handleParentSelect(parent.id)}
                        >
                          <UserIcon className="h-4 w-4 mr-2" />
                          {parent.lastName} {parent.firstName}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Форма добавления и список детей */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>
                {selectedParent ? (
                  <>Дети родителя: {getUserName(selectedParent)}</>
                ) : (
                  <>Выберите родителя</>
                )}
              </CardTitle>
              <CardDescription>
                {selectedParent 
                  ? "Управление связями для выбранного родителя" 
                  : "Для управления связями сначала выберите родителя из списка слева"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedParent && (
                <>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="parentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Родитель</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={selectedParent?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите родителя" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {parents.map((parent) => (
                                    <SelectItem key={parent.id} value={parent.id.toString()}>
                                      {parent.lastName} {parent.firstName}
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
                          name="studentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ученик</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите ученика" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {students.map((student) => (
                                    <SelectItem 
                                      key={student.id} 
                                      value={student.id.toString()}
                                      disabled={isStudentConnectedToParent(selectedParent, student.id)}
                                    >
                                      {student.lastName} {student.firstName} 
                                      {isStudentConnectedToParent(selectedParent, student.id) && " (уже связан)"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button type="submit" disabled={addParentStudentMutation.isPending}>
                        {addParentStudentMutation.isPending ? "Добавление..." : "Добавить ребенка"}
                      </Button>
                    </form>
                  </Form>

                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Дети родителя</h3>
                    {parentStudentsLoading ? (
                      <div className="text-center p-4">Загрузка связей...</div>
                    ) : parentStudents.length === 0 ? (
                      <div className="text-center p-4 text-gray-500">У родителя нет связанных учеников</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ученик</TableHead>
                            <TableHead>Email</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getConnectedStudents().map((connection) => (
                            <TableRow key={connection.id}>
                              <TableCell className="font-medium">{connection.name}</TableCell>
                              <TableCell>{connection.email || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </>
              )}

              {!selectedParent && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p>Для управления связями выберите родителя из списка слева</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}