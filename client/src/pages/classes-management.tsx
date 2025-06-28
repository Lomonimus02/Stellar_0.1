// client/src/pages/classes-management.tsx
import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useRoleCheck } from "@/hooks/use-role-check";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ClassWithStudentCount, insertClassSchema } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { School, Users, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { ClassCard } from "@/components/subjects-management/class-card";

// Схема формы для класса
const classFormSchema = insertClassSchema.extend({
  name: z.string().min(1, "Введите название класса"),
  gradeLevel: z.number({
    required_error: "Введите номер класса",
    invalid_type_error: "Номер класса должен быть числом",
  }).min(1, "Минимальное значение - 1").max(11, "Максимальное значение - 11"),
  academicYear: z.string().min(1, "Введите учебный год"),
  schoolId: z.number({
    required_error: "ID школы обязателен",
  }),
});

export default function ClassesManagementPage() {
  const { user } = useAuth();
  const { isPrincipal, isVicePrincipal, isSchoolAdmin } = useRoleCheck();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // State for filters
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  // State for dialogs
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassWithStudentCount | null>(null);

  const currentYear = new Date().getFullYear();

  // Form для редактирования класса
  const editForm = useForm<z.infer<typeof classFormSchema>>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: "",
      gradeLevel: undefined,
      academicYear: `${currentYear}-${currentYear + 1}`,
      schoolId: user?.schoolId || 0,
    },
  });

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

  // School ID
  const schoolId = user?.schoolId || null;

  // Data fetching queries
  const { data: classes = [], isLoading: classesLoading } = useQuery<ClassWithStudentCount[]>({
    queryKey: ["/api/classes", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const res = await apiRequest(`/api/classes`);
      const data = await res.json();
      return data;
    },
    enabled: !!schoolId && hasAccess,
  });

  // Мутация для редактирования класса
  const editClassMutation = useMutation({
    mutationFn: async (data: z.infer<typeof classFormSchema> & { id: number }) => {
      const { id, ...classData } = data;
      const res = await apiRequest(`/api/classes/${id}`, "PATCH", classData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes", schoolId] });
      setIsEditDialogOpen(false);
      setSelectedClass(null);
      toast({
        title: "Класс обновлен",
        description: "Класс успешно обновлен",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить класс",
        variant: "destructive",
      });
    },
  });

  // Мутация для удаления класса
  const deleteClassMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/classes/${id}`, "DELETE");
      return res.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes", schoolId] });
      setIsDeleteDialogOpen(false);
      setSelectedClass(null);
      toast({
        title: "Класс удален",
        description: "Класс успешно удален из системы",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить класс",
        variant: "destructive",
      });
    },
  });

  // Filtered classes based on search and grade filter
  const filteredClasses = useMemo(() => {
    return classes.filter(classItem => {
      const matchesSearch = classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           classItem.gradeLevel.toString().includes(searchTerm);
      const matchesGrade = gradeFilter === "all" || classItem.gradeLevel.toString() === gradeFilter;
      return matchesSearch && matchesGrade;
    });
  }, [classes, searchTerm, gradeFilter]);

  // Get unique grade levels for filter
  const gradeOptions = useMemo(() => {
    const grades = [...new Set(classes.map(c => c.gradeLevel))].sort((a, b) => a - b);
    return grades.map(grade => ({ value: grade.toString(), label: `${grade} класс` }));
  }, [classes]);

  // Event handlers
  const handleClassClick = useCallback((classItem: ClassWithStudentCount) => {
    navigate(`/classes-management/${classItem.id}`);
  }, [navigate]);

  const handleEditClass = useCallback((classItem: ClassWithStudentCount) => {
    setSelectedClass(classItem);
    editForm.reset({
      name: classItem.name,
      gradeLevel: classItem.gradeLevel,
      academicYear: classItem.academicYear,
      schoolId: classItem.schoolId,
    });
    setIsEditDialogOpen(true);
  }, [editForm]);

  const handleDeleteClass = useCallback((classItem: ClassWithStudentCount) => {
    setSelectedClass(classItem);
    setIsDeleteDialogOpen(true);
  }, []);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Управление классами</h1>
              <p className="text-gray-600">
                Просмотр и управление классами школы
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск классов..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Фильтр по классу" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все классы</SelectItem>
              {gradeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {classesLoading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))
          ) : filteredClasses.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <School className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Классы не найдены</h3>
              <p className="text-gray-600">
                {searchTerm || gradeFilter !== "all" 
                  ? "Попробуйте изменить параметры поиска" 
                  : "В вашей школе пока нет классов"}
              </p>
            </div>
          ) : (
            filteredClasses.map((classItem) => (
              <ClassCard
                key={classItem.id}
                classData={classItem}
                onClick={handleClassClick}
                onEdit={handleEditClass}
                onDelete={handleDeleteClass}
              />
            ))
          )}
        </div>
      </div>

      {/* Диалог для редактирования класса */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="p-6 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20">
          <DialogHeader>
            <DialogTitle>Редактировать класс</DialogTitle>
            <DialogDescription>
              Изменение информации о классе
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (selectedClass && editForm.formState.isValid) {
                const values = editForm.getValues();

                if (!values.schoolId) {
                  values.schoolId = user?.schoolId || 0;
                  if (!values.schoolId) {
                    toast({
                      title: "Ошибка",
                      description: "Не удалось определить ID школы",
                      variant: "destructive",
                    });
                    return;
                  }
                }

                editClassMutation.mutate({
                  ...values,
                  id: selectedClass.id,
                });
              }
            }} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название класса</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Например: 5А, 9Б и т.д."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="gradeLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер класса</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={11}
                        placeholder="От 1 до 11"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="academicYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Учебный год</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Например: 2023-2024"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={editClassMutation.isPending}
                >
                  {editClassMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления класса */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="p-6 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь удалить класс "{selectedClass?.name}". Это действие невозможно отменить.
              Все связанные данные (расписания, домашние задания, оценки) также будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedClass) {
                  deleteClassMutation.mutate(selectedClass.id);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteClassMutation.isPending ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
