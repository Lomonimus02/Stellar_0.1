import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, PencilIcon, BookOpen, Trash2Icon, AlertCircleIcon } from "lucide-react";
import { Subject, insertSubjectSchema } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Расширяем схему для предмета
const subjectFormSchema = insertSubjectSchema.extend({
  name: z.string().min(1, "Введите название предмета"),
  description: z.string().nullable().optional(),
  schoolId: z.number({
    required_error: "ID школы обязателен",
  }),
});

export function AdminSubjectList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  
  // Get subjects for the school admin's school
  const { data: subjects = [], isLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: !!user && !!user.schoolId
  });
  
  // Form для добавления предмета
  const form = useForm<z.infer<typeof subjectFormSchema>>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      schoolId: user?.schoolId || 2, // Устанавливаем ID школы напрямую (2 - ID Царскосельской Гимназии)
    },
  });
  
  // Get school ID from user roles if not available directly
  // Query for user roles to get schoolId if it's not in the user object
  const { data: userRoles = [] } = useQuery({
    queryKey: ["/api/my-roles"],
    enabled: !!user && user.role === "school_admin" && !user.schoolId
  });
  
  // Extract schoolId from school_admin role if present
  const getSchoolId = () => {
    // Если у пользователя есть schoolId в профиле, используем его
    if (user?.schoolId) return user.schoolId;
    
    // Находим роль администратора школы с указанным schoolId 
    const schoolAdminRole = userRoles.find(role => 
      role.role === "school_admin" && role.schoolId
    );
    
    if (schoolAdminRole?.schoolId) {
      return schoolAdminRole.schoolId;
    }
    
    // Если в ролях нет schoolId, но есть роль администратора школы,
    // пробуем найти первую доступную школу
    const isSchoolAdmin = userRoles.some(role => role.role === "school_admin");
    if (isSchoolAdmin) {
      // Получаем первый schoolId из списка ролей
      // Это сработает, если сервер присвоил ID школы по умолчанию
      const anyRoleWithSchool = userRoles.find(role => role.schoolId);
      if (anyRoleWithSchool?.schoolId) {
        return anyRoleWithSchool.schoolId;
      }
      
      // Если нет ролей с schoolId, используем первую школу из школ пользователя
      // (это отдельный запрос, который должен выполниться ранее)
      const defaultSchoolId = 2; // ID первой школы из предыдущего запроса
      return defaultSchoolId;
    }
    
    return null;
  };

  // Удаление предмета
  const deleteSubjectMutation = useMutation({
    mutationFn: async (subjectId: number) => {
      const res = await apiRequest(`/api/subjects/${subjectId}`, "DELETE");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      setIsDeleteDialogOpen(false);
      setSelectedSubject(null);
      toast({
        title: "Предмет удален",
        description: "Предмет был успешно удален из системы",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить предмет",
        variant: "destructive",
      });
    },
  });

  // Функция для обработки удаления предмета
  const handleDeleteSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsDeleteDialogOpen(true);
  };

  // Добавление предмета
  const addSubjectMutation = useMutation({
    mutationFn: async (data: z.infer<typeof subjectFormSchema>) => {
      // Ensure schoolId is set
      if (!data.schoolId) {
        data.schoolId = getSchoolId();
      }
      
      const res = await apiRequest("/api/subjects", "POST", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      setIsAddDialogOpen(false);
      form.reset({
        name: "",
        description: "",
        schoolId: getSchoolId(),
      });
      toast({
        title: "Предмет добавлен",
        description: "Новый предмет успешно создан",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать предмет",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: z.infer<typeof subjectFormSchema>) => {
    console.log("Форма предмета отправлена:", values);
    // Убедимся, что у нас есть schoolId
    if (!values.schoolId) {
      values.schoolId = getSchoolId();
    }
    console.log("Данные для отправки:", values);
    addSubjectMutation.mutate(values);
  };
  
  return (
    <div className="p-4 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-slate-700 mb-4">Предметы</h3>
        <Button 
          className="inline-flex items-center justify-center gap-1 rounded-full px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-b from-[rgb(2,191,122)]/95 via-[rgb(2,191,122)]/90 to-[rgb(2,191,122)]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_0_0_1.5px_rgba(255,255,255,0.2),0_5px_15px_-3px_rgba(0,0,0,0.08),_0_8px_25px_-8px_rgba(0,0,0,0.07)] hover:from-[rgb(2,191,122)]/95 hover:via-[rgb(2,191,122)]/90 hover:to-[rgb(2,191,122)]/95 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_0_0_1.5px_rgba(255,255,255,0.3),0_6px_18px_-3px_rgba(0,0,0,0.1),0_10px_30px_-8px_rgba(0,0,0,0.09)] hover:-translate-y-px active:scale-[0.97] active:from-[rgb(2,191,122)]/95 active:via-[rgb(2,191,122)]/90 active:to-[rgb(2,191,122)]/95 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <PlusIcon className="h-4 w-4" />
          Добавить
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/15">
          <thead className="bg-slate-500/10">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Название
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Описание
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/15">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-slate-500">
                  Загрузка...
                </td>
              </tr>
            ) : subjects.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-slate-500">
                  Нет данных
                </td>
              </tr>
            ) : (
              subjects.map((subject) => (
                <tr key={subject.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-700">{subject.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-500">{subject.description || "-"}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button className="text-[rgb(2,191,122)] hover:text-[rgb(2,191,122)]/80">
                        <PencilIcon className="h-4 w-4 text-[rgb(2,191,122)]" />
                      </button>
                      <button 
                        className="text-red-500 hover:text-red-700/80"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteSubject(subject);
                        }}
                      >
                        <Trash2Icon className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Диалог для подтверждения удаления предмета */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="p-6 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20">
          <DialogHeader>
            <DialogTitle>Удаление предмета</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить предмет "{selectedSubject?.name}"?
              Это действие нельзя будет отменить.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-between mt-4">
            <Button
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedSubject) {
                  deleteSubjectMutation.mutate(selectedSubject.id);
                }
              }}
              disabled={deleteSubjectMutation.isPending}
            >
              {deleteSubjectMutation.isPending ? "Удаление..." : "Удалить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Диалог для добавления предмета */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="p-6 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20">
          <DialogHeader>
            <DialogTitle>Добавить новый предмет</DialogTitle>
            <DialogDescription>
              Введите информацию о новом предмете
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={(e) => {
              e.preventDefault();
              console.log("Форма предмета отправлена");
              const isValid = form.formState.isValid;
              console.log("Форма валидна:", isValid);
              console.log("Ошибки формы:", form.formState.errors);
              
              if (isValid) {
                const values = form.getValues();
                console.log("Значения формы:", values);
                
                // Убедимся, что у нас есть schoolId, используя нашу вспомогательную функцию
                if (!values.schoolId) {
                  values.schoolId = getSchoolId();
                  
                  // Если все еще нет schoolId, не отправляем форму
                  if (!values.schoolId) {
                    toast({
                      title: "Ошибка",
                      description: "Не удалось определить ID школы. Пожалуйста, обратитесь к администратору.",
                      variant: "destructive",
                    });
                    return;
                  }
                }
                
                console.log("Отправка данных с schoolId:", values.schoolId);
                addSubjectMutation.mutate(values);
              } else {
                form.handleSubmit(onSubmit)(e);
              }
            }} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название предмета</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Например: Математика, Физика, История" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Краткое описание предмета" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={addSubjectMutation.isPending}
                >
                  {addSubjectMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}