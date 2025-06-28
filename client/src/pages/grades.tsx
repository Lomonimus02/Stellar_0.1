import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { UserRoleEnum, Grade, insertGradeSchema, Class, Subject, User } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Filter, Plus, Search, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const gradeFormSchema = insertGradeSchema.extend({
  studentId: z.number({
    required_error: "Выберите ученика",
  }),
  subjectId: z.number({
    required_error: "Выберите предмет",
  }),
  classId: z.number({
    required_error: "Выберите класс",
  }),
  grade: z.number({
    required_error: "Введите оценку",
  }).min(1, "Минимальная оценка - 1").max(5, "Максимальная оценка - 5"),
  gradeType: z.string({
    required_error: "Выберите тип оценки",
  }),
  comment: z.string().optional(),
});

type GradeFormValues = z.infer<typeof gradeFormSchema>;

// Импортируем компонент для отображения оценок студента
import StudentGrades from "./student-grades";

export default function Grades() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedStudentId, setSelectedStudentId] = useState<number | "all">("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Для студентов используем отдельный компонент с табличным интерфейсом оценок
  if (user?.role === UserRoleEnum.STUDENT) {
    return <StudentGrades />;
  }
  
  // Determine if the user can add grades (only teachers can)
  const canAddGrades = user?.role === UserRoleEnum.TEACHER;
  
  // For parents, we only show their children's grades
  let apiParams = "";
  
  // Fetch grades
  const { data: grades = [], isLoading } = useQuery<Grade[]>({
    queryKey: [`/api/grades${apiParams}`],
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
  
  // Fetch students (for teacher to add grades)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!user && canAddGrades
  });
  const students = users.filter(u => u.role === UserRoleEnum.STUDENT);
  
  // Form for adding grades
  const form = useForm<GradeFormValues>({
    resolver: zodResolver(gradeFormSchema),
    defaultValues: {
      studentId: undefined,
      subjectId: undefined,
      classId: undefined,
      grade: undefined,
      gradeType: "",
      comment: "",
    },
  });
  
  // Add grade mutation
  const addGradeMutation = useMutation({
    mutationFn: async (data: GradeFormValues) => {
      const res = await apiRequest("POST", "/api/grades", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grades"] });
      setIsAddDialogOpen(false);
      form.reset();
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
  
  const onSubmit = (values: GradeFormValues) => {
    addGradeMutation.mutate(values);
  };
  
  // Filter grades based on selected filters and search query
  const filteredGrades = grades.filter(g => {
    const studentMatches = selectedStudentId === "all" || g.studentId === selectedStudentId;
    const subjectMatches = selectedSubjectId === "all" || g.subjectId === selectedSubjectId;
    
    // Search by comment
    const commentMatches = !searchQuery || 
      (g.comment && g.comment.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return studentMatches && subjectMatches && (searchQuery === "" || commentMatches);
  });
  
  // Helper functions to get names
  const getStudentName = (id: number) => {
    const student = users.find(u => u.id === id);
    return student ? `${student.lastName} ${student.firstName}` : `Ученик ${id}`;
  };
  
  const getSubjectName = (id: number) => {
    const subject = subjects.find(s => s.id === id);
    return subject ? subject.name : `Предмет ${id}`;
  };
  
  const getClassName = (id: number) => {
    const cls = classes.find(c => c.id === id);
    return cls ? cls.name : `Класс ${id}`;
  };
  
  const getGradeTypeName = (type: string) => {
    const types = {
      "homework": "Домашнее задание",
      "classwork": "Классная работа",
      "test": "Тест",
      "exam": "Экзамен",
      "project": "Проект",
    };
    return types[type as keyof typeof types] || type;
  };
  
  // Calculate average grade for the selected filters
  const calculateAverage = () => {
    if (filteredGrades.length === 0) return 0;
    
    const sum = filteredGrades.reduce((acc, g) => acc + g.grade, 0);
    return (sum / filteredGrades.length).toFixed(1);
  };
  
  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-gray-800">Оценки</h2>
        {canAddGrades && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Добавить оценку
          </Button>
        )}
      </div>
      
      {/* Filters and search */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Поиск по комментарию..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select
          value={selectedStudentId.toString()}
          onValueChange={(value) => setSelectedStudentId(value === "all" ? "all" : parseInt(value))}
        >
          <SelectTrigger>
            <div className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Все ученики" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все ученики</SelectItem>
            {students.map((student) => (
              <SelectItem key={student.id} value={student.id.toString()}>
                {student.lastName} {student.firstName}
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
        
        <div className="bg-white p-3 rounded-md shadow-sm flex items-center justify-between">
          <div className="flex items-center">
            <Calculator className="h-5 w-5 mr-2 text-primary" />
            <span className="text-sm font-medium">Средний балл:</span>
          </div>
          <span className="text-lg font-semibold">{calculateAverage()}</span>
        </div>
      </div>
      
      {/* Grades Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Ученик</TableHead>
              <TableHead>Предмет</TableHead>
              <TableHead>Класс</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Оценка</TableHead>
              <TableHead>Комментарий</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : filteredGrades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  Нет оценок для отображения
                </TableCell>
              </TableRow>
            ) : (
              filteredGrades.map((grade) => (
                <TableRow key={grade.id}>
                  <TableCell>
                    {new Date(grade.createdAt).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell>{getStudentName(grade.studentId)}</TableCell>
                  <TableCell>{getSubjectName(grade.subjectId)}</TableCell>
                  <TableCell>{getClassName(grade.classId)}</TableCell>
                  <TableCell>{getGradeTypeName(grade.gradeType)}</TableCell>
                  <TableCell className="font-bold">
                    <span className={`px-2 py-1 rounded-full ${
                      grade.grade >= 4 ? 'bg-green-100 text-green-800' : 
                      grade.grade >= 3 ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {grade.grade}
                    </span>
                  </TableCell>
                  <TableCell>{grade.comment || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Add Grade Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить оценку</DialogTitle>
            <DialogDescription>
              Заполните информацию для выставления оценки
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
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
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Предмет</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
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
                
                <FormField
                  control={form.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Класс</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
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
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
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
                            <SelectValue placeholder="Оценка" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="5">5 (Отлично)</SelectItem>
                          <SelectItem value="4">4 (Хорошо)</SelectItem>
                          <SelectItem value="3">3 (Удовлетворительно)</SelectItem>
                          <SelectItem value="2">2 (Неудовлетворительно)</SelectItem>
                          <SelectItem value="1">1 (Плохо)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
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
                            <SelectValue placeholder="Тип оценки" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="homework">Домашнее задание</SelectItem>
                          <SelectItem value="classwork">Классная работа</SelectItem>
                          <SelectItem value="test">Тест</SelectItem>
                          <SelectItem value="exam">Экзамен</SelectItem>
                          <SelectItem value="project">Проект</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Комментарий</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Комментарий к оценке (не обязательно)" 
                        className="resize-none" 
                        {...field} 
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
    </MainLayout>
  );
}
