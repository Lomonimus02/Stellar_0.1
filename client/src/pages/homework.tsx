import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { UserRoleEnum, Homework, insertHomeworkSchema, Class, Subject, HomeworkSubmission, Schedule } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Filter, Search, Upload, Clock, CalendarIcon, FileUpIcon, CheckCircle, Edit, Trash2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

// Schema for homework creation (обновленная схема без dueDate, только с scheduleId)
const homeworkFormSchema = insertHomeworkSchema
  .omit({ dueDate: true })
  .extend({
    title: z.string().min(1, "Название обязательно"),
    description: z.string().min(1, "Описание обязательно"),
    subjectId: z.number({
      required_error: "Выберите предмет",
    }),
    classId: z.number({
      required_error: "Выберите класс",
    }),
    scheduleId: z.number({
      required_error: "Выберите урок",
    }),
  });

// Schema for homework submission
const submissionFormSchema = z.object({
  homeworkId: z.number(),
  submissionText: z.string().min(1, "Введите текст ответа"),
  fileUrl: z.string().optional(),
});

export default function HomeworkPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedClassId, setSelectedClassId] = useState<number | "all">("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [currentTab, setCurrentTab] = useState("active");

  // Determine if the user can create homework (only teachers)
  const canCreateHomework = user?.role === UserRoleEnum.TEACHER;
  // Determine if the user can submit homework (only students)
  const canSubmitHomework = user?.role === UserRoleEnum.STUDENT;

  // Fetch homework
  const { data: homework = [], isLoading: homeworkLoading } = useQuery<Homework[]>({
    queryKey: ["/api/homework"],
    enabled: !!user
  });

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

  // Fetch homework submissions (for students)
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<HomeworkSubmission[]>({
    queryKey: ["/api/homework-submissions"],
    enabled: !!user && canSubmitHomework
  });

  // Добавляем состояния для редактирования и удаления
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [homeworkToEdit, setHomeworkToEdit] = useState<Homework | null>(null);
  const [homeworkToDelete, setHomeworkToDelete] = useState<Homework | null>(null);
  const [selectedSchedules, setSelectedSchedules] = useState<Schedule[]>([]);

  // Запрос на получение расписаний
  const { data: schedules = [] } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules"],
    enabled: !!user && canCreateHomework
  });

  // Form for creating homework
  const homeworkForm = useForm<z.infer<typeof homeworkFormSchema>>({
    resolver: zodResolver(homeworkFormSchema),
    defaultValues: {
      title: "",
      description: "",
      subjectId: undefined,
      classId: undefined,
      scheduleId: undefined,
    },
  });
  
  // Получить уроки для выбранного класса и предмета
  const classId = homeworkForm.watch("classId");
  const subjectId = homeworkForm.watch("subjectId");
  
  useEffect(() => {
    if (classId && subjectId) {
      const filteredSchedules = schedules.filter(
        (schedule) => 
          schedule.classId === classId && 
          schedule.subjectId === subjectId
      );
      setSelectedSchedules(filteredSchedules);
    } else {
      setSelectedSchedules([]);
    }
  }, [classId, subjectId, schedules]);

  // Form for submitting homework
  const submissionForm = useForm<z.infer<typeof submissionFormSchema>>({
    resolver: zodResolver(submissionFormSchema),
    defaultValues: {
      homeworkId: 0,
      submissionText: "",
      fileUrl: "",
    },
  });

  // Create homework mutation
  const createHomeworkMutation = useMutation({
    mutationFn: async (data: z.infer<typeof homeworkFormSchema>) => {
      const res = await apiRequest("/api/homework", "POST", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homework"] });
      setIsAddDialogOpen(false);
      homeworkForm.reset();
      toast({
        title: "Домашнее задание создано",
        description: "Новое домашнее задание успешно добавлено",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать домашнее задание",
        variant: "destructive",
      });
    },
  });
  
  // Update homework mutation
  const updateHomeworkMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: z.infer<typeof homeworkFormSchema> }) => {
      const res = await apiRequest(`/api/homework/${id}`, "PATCH", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homework"] });
      setIsEditDialogOpen(false);
      setHomeworkToEdit(null);
      homeworkForm.reset();
      toast({
        title: "Домашнее задание обновлено",
        description: "Изменения успешно сохранены",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить домашнее задание",
        variant: "destructive",
      });
    },
  });
  
  // Delete homework mutation
  const deleteHomeworkMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/homework/${id}`, "DELETE");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homework"] });
      setIsDeleteDialogOpen(false);
      setHomeworkToDelete(null);
      toast({
        title: "Домашнее задание удалено",
        description: "Задание успешно удалено из системы",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить домашнее задание",
        variant: "destructive",
      });
    },
  });

  // Submit homework mutation
  const submitHomeworkMutation = useMutation({
    mutationFn: async (data: z.infer<typeof submissionFormSchema>) => {
      const res = await apiRequest("/api/homework-submissions", "POST", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homework-submissions"] });
      setIsSubmitDialogOpen(false);
      submissionForm.reset();
      setSelectedHomework(null);
      toast({
        title: "Ответ отправлен",
        description: "Ваш ответ на домашнее задание успешно отправлен",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить ответ",
        variant: "destructive",
      });
    },
  });

  const onSubmitHomework = (values: z.infer<typeof homeworkFormSchema>) => {
    createHomeworkMutation.mutate(values);
  };

  const onSubmitSubmission = (values: z.infer<typeof submissionFormSchema>) => {
    submitHomeworkMutation.mutate(values);
  };

  // Handler for opening the submission dialog
  const handleSubmitHomework = (homework: Homework) => {
    setSelectedHomework(homework);
    submissionForm.setValue("homeworkId", homework.id);
    setIsSubmitDialogOpen(true);
  };

  // Filter homework based on selected filters and search query
  const filteredHomework = homework.filter(hw => {
    const classMatches = selectedClassId === "all" || hw.classId === selectedClassId;
    const subjectMatches = selectedSubjectId === "all" || hw.subjectId === selectedSubjectId;
    const searchMatches = !searchQuery || 
      hw.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hw.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by status (active/completed)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(hw.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    const isPastDue = dueDate < today;
    const isActive = currentTab === "active" && !isPastDue;
    const isCompleted = currentTab === "completed" && isPastDue;
    
    return classMatches && subjectMatches && searchMatches && (isActive || isCompleted);
  });

  // Helper functions to get names
  const getClassName = (id: number) => {
    const cls = classes.find(c => c.id === id);
    return cls ? cls.name : `Класс ${id}`;
  };

  const getSubjectName = (id: number) => {
    const subject = subjects.find(s => s.id === id);
    return subject ? subject.name : `Предмет ${id}`;
  };

  // Check if homework is submitted by student
  const isHomeworkSubmitted = (homeworkId: number) => {
    return submissions.some(s => s.homeworkId === homeworkId);
  };

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-gray-800">Домашние задания</h2>
        {/* Hide "Create assignment" button for teachers as per user requirements */}
        {false && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Создать задание
          </Button>
        )}
      </div>

      {/* Filters and search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Поиск по названию или описанию..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select
          value={selectedClassId.toString()}
          onValueChange={(value) => setSelectedClassId(value === "all" ? "all" : parseInt(value))}
        >
          <SelectTrigger>
            <div className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Все классы" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все классы</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id.toString()}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedSubjectId.toString()}
          onValueChange={(value) => setSelectedSubjectId(value === "all" ? "all" : parseInt(value))}
        >
          <SelectTrigger>
            <div className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Все предметы" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все предметы</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id.toString()}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs for Active/Completed */}
      <Tabs defaultValue="active" value={currentTab} onValueChange={setCurrentTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Активные</TabsTrigger>
          <TabsTrigger value="completed">Завершенные</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Homework Cards */}
      {homeworkLoading ? (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-primary mx-auto animate-spin" />
          <p className="mt-4 text-gray-500">Загрузка домашних заданий...</p>
        </div>
      ) : filteredHomework.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto" />
          <p className="mt-4 text-gray-500">
            {currentTab === "active" ? "Нет активных домашних заданий" : "Нет завершенных домашних заданий"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHomework.map((hw) => {
            const dueDate = new Date(hw.dueDate);
            const today = new Date();
            const isPastDue = dueDate < today;
            const isSubmitted = canSubmitHomework && isHomeworkSubmitted(hw.id);
            
            return (
              <Card key={hw.id} className={isPastDue ? "opacity-70" : ""}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{hw.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      {canCreateHomework && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4"
                              >
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="12" cy="5" r="1" />
                                <circle cx="12" cy="19" r="1" />
                              </svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setHomeworkToEdit(hw);
                                homeworkForm.reset({
                                  title: hw.title,
                                  description: hw.description,
                                  classId: hw.classId,
                                  subjectId: hw.subjectId,
                                  scheduleId: hw.scheduleId || undefined,
                                });
                                setIsEditDialogOpen(true);
                              }}
                              className="flex items-center"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setHomeworkToDelete(hw);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="flex items-center text-red-500"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  <CardDescription className="flex justify-between">
                    <span>{getClassName(hw.classId)} • {getSubjectName(hw.subjectId)}</span>
                    {isSubmitted && (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                        <CheckCircle className="mr-1 h-3 w-3" /> Выполнено
                      </Badge>
                    )}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{hw.description}</p>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="mr-1 h-4 w-4" />
                    <span>Срок до: {format(new Date(hw.dueDate), "d MMMM yyyy", { locale: ru })}</span>
                  </div>
                </CardContent>
                
                <CardFooter>
                  {canSubmitHomework && !isSubmitted && !isPastDue && (
                    <Button 
                      onClick={() => handleSubmitHomework(hw)}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" /> Отправить ответ
                    </Button>
                  )}
                  
                  {isSubmitted && (
                    <Button variant="outline" className="w-full" disabled>
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Ответ отправлен
                    </Button>
                  )}
                  
                  {isPastDue && !isSubmitted && canSubmitHomework && (
                    <Button variant="outline" className="w-full text-red-500" disabled>
                      <svg
                        className="mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Срок сдачи истек
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Homework Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Создать домашнее задание</DialogTitle>
            <DialogDescription>
              Заполните форму для создания нового задания для класса
            </DialogDescription>
          </DialogHeader>
          
          <Form {...homeworkForm}>
            <form onSubmit={homeworkForm.handleSubmit(onSubmitHomework)} className="space-y-4">
              <FormField
                control={homeworkForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название задания</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите название задания" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={homeworkForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание задания</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Введите подробное описание задания" 
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={homeworkForm.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Класс</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите класс" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id.toString()}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={homeworkForm.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Предмет</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите предмет" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id.toString()}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={homeworkForm.control}
                name="scheduleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Урок</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите урок" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedSchedules.map((schedule) => (
                          <SelectItem key={schedule.id} value={schedule.id.toString()}>
{schedule.scheduleDate ? format(new Date(schedule.scheduleDate), "d MMMM yyyy", { locale: ru }) : ""}                             {schedule.startTime}
                          </SelectItem>
                        ))}
                        {selectedSchedules.length === 0 && (
                          <SelectItem value="placeholder" disabled>Сначала выберите класс и предмет</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={createHomeworkMutation.isPending}>
                  {createHomeworkMutation.isPending ? 'Создание...' : 'Создать задание'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Homework Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Редактировать домашнее задание</DialogTitle>
            <DialogDescription>
              Измените информацию о домашнем задании
            </DialogDescription>
          </DialogHeader>
          
          <Form {...homeworkForm}>
            <form onSubmit={homeworkForm.handleSubmit((values) => {
                if (homeworkToEdit) {
                  updateHomeworkMutation.mutate({ id: homeworkToEdit.id, data: values });
                }
              })} className="space-y-4"
            >
              <FormField
                control={homeworkForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название задания</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите название задания" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={homeworkForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание задания</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Введите подробное описание задания" 
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={homeworkForm.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Класс</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите класс" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id.toString()}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={homeworkForm.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Предмет</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите предмет" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id.toString()}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={homeworkForm.control}
                name="scheduleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Урок</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите урок" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedSchedules.map((schedule) => (
                          <SelectItem key={schedule.id} value={schedule.id.toString()}>
                            {schedule.scheduleDate ? format(new Date(schedule.scheduleDate), "d MMMM yyyy", { locale: ru }) : ""} {schedule.startTime}
                          </SelectItem>
                        ))}
                        {selectedSchedules.length === 0 && (
                          <SelectItem value="placeholder" disabled>Сначала выберите класс и предмет</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={updateHomeworkMutation.isPending}>
                  {updateHomeworkMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Homework Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить это домашнее задание? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <Button
              onClick={() => {
                if (homeworkToDelete) {
                  deleteHomeworkMutation.mutate(homeworkToDelete.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteHomeworkMutation.isPending ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Удаление...
                </span>
              ) : (
                'Удалить задание'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Submit Homework Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Отправить ответ на задание</DialogTitle>
            <DialogDescription>
              {selectedHomework && (
                <span className="text-primary font-medium">
                  {selectedHomework.title}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...submissionForm}>
            <form onSubmit={submissionForm.handleSubmit(onSubmitSubmission)} className="space-y-4">
              <FormField
                control={submissionForm.control}
                name="submissionText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Текст ответа</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Введите ваш ответ на задание" 
                        className="min-h-[150px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={submissionForm.control}
                name="fileUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Прикрепить файл (необязательно)</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Input 
                          type="text"
                          placeholder="Ссылка на файл или документ" 
                          {...field} 
                        />
                        <Button type="button" variant="outline" size="icon">
                          <FileUpIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={submitHomeworkMutation.isPending}>
                  {submitHomeworkMutation.isPending ? 'Отправка...' : 'Отправить ответ'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}