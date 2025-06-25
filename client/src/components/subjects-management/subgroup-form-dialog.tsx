import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { InsertSubgroup, Class, Subject } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Схема валидации формы подгруппы
const subgroupFormSchema = z.object({
  name: z.string().min(1, "Название подгруппы обязательно"),
  description: z.string().optional().nullable(),
  classId: z.string().min(1, { message: "Выберите класс" }),
  studentIds: z.array(z.string()).optional().default([]),
  // Добавляем поле для связи с предметом (опционально, но рекомендуется)
  // Мы не будем сохранять это в БД напрямую, но используем для логики
  // subjectId: z.string().optional().nullable(),
});

type SubgroupFormData = z.infer<typeof subgroupFormSchema>;

interface SubgroupFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<InsertSubgroup, 'schoolId'>) => void;
  isLoading: boolean;
  classes: Class[];
  subjects: Subject[]; // Keep subjects prop if needed elsewhere, though not used directly here
  defaultValues?: Partial<SubgroupFormData> & { id?: number }; // Add subgroup ID to defaultValues type
}

export function SubgroupFormDialog({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  classes,
  subjects, // This prop is kept for potential future use but isn't directly used in the form logic now
  defaultValues
}: SubgroupFormDialogProps) {
  const isEditMode = !!defaultValues?.id; // More reliable check for edit mode
  const { toast } = useToast();

  // selectedClassId state is largely managed by the form's classId field now.
  // const [selectedClassId, setSelectedClassId] = useState<string>(defaultValues?.classId || "");
  const [students, setStudents] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingSubgroupStudents, setIsLoadingSubgroupStudents] = useState(false);

  const form = useForm<SubgroupFormData>({
    resolver: zodResolver(subgroupFormSchema),
    // Initialize with defaultValues if provided, else empty strings/arrays
    defaultValues: defaultValues || {
      name: "",
      description: "",
      classId: "",
      studentIds: [],
    },
  });

  // Effect to reset form when dialog opens or defaultValues change
  useEffect(() => {
    if (isOpen) {
      const initialValues = defaultValues || {
        name: "",
        description: "",
        classId: "",
        studentIds: [],
      };
      form.reset(initialValues);
      // setSelectedClassId(initialValues.classId || ""); // No longer need separate selectedClassId state
      setStudents([]);
      form.setValue('studentIds', initialValues.studentIds || []);
    }
  }, [isOpen, defaultValues, form]);

  // Effect to load CLASS students when classId changes (from form) or is initially set
  useEffect(() => {
    const classIdFromForm = form.getValues("classId");
    if (classIdFromForm) {
      setIsLoadingStudents(true);
      setStudents([]); // Clear previous students
      // Fetch students of the selected CLASS
      apiRequest(`/api/students-by-class/${classIdFromForm}`)
        .then(async res => {
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || 'Failed to load class students');
          }
          return res.json();
        })
        .then(data => setStudents(Array.isArray(data) ? data : []))
        .catch((error) => {
            console.error("Error fetching class students:", error);
            toast({ title: "Ошибка загрузки", description: `Не удалось загрузить учеников для класса ID ${classIdFromForm}. ${error.message}`, variant: "destructive" });
        })
        .finally(() => setIsLoadingStudents(false));
    } else {
      setStudents([]); // Clear students if no class is selected
    }
  // Watch form's classId field
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch("classId"), isOpen]); // Also depend on isOpen to re-fetch if dialog re-opens with same classId

  // Effect to load SUBGROUP's assigned students when in EDIT mode and dialog opens
  useEffect(() => {
    if (isEditMode && isOpen && defaultValues?.id) {
      const subgroupId = defaultValues.id;
      setIsLoadingSubgroupStudents(true);
      apiRequest(`/api/student-subgroups?subgroupId=${subgroupId}`)
        .then(async (res) => {
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || 'Failed to fetch subgroup students');
          }
          return res.json();
        })
        .then((studentLinks) => {
          const fetchedStudentIds = Array.isArray(studentLinks)
            ? studentLinks.map((link: { studentId: number }) => link.studentId.toString())
            : [];
          form.setValue('studentIds', fetchedStudentIds, { shouldValidate: true, shouldDirty: true });
        })
        .catch((error) => {
          console.error(`Error fetching students for subgroup ${subgroupId}:`, error);
          toast({ title: "Ошибка загрузки", description: `Не удалось загрузить назначенных учеников для подгруппы. ${error.message}`, variant: "destructive" });
        })
        .finally(() => setIsLoadingSubgroupStudents(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isEditMode, defaultValues?.id]); // form and toast are stable, not needed in deps


  const handleClose = () => {
    form.reset({ name: "", description: "", classId: "", studentIds: [] });
    // setSelectedClassId(""); // No longer needed
    setStudents([]);
    onClose();
  };

  const handleFormSubmit = (values: SubgroupFormData) => {
    onSubmit({
      name: values.name,
      description: values.description || null,
      classId: parseInt(values.classId),
      // Ensure studentIds is always an array of numbers
      studentIds: (values.studentIds || []).map(id => parseInt(id)).filter(id => !isNaN(id)),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[480px] p-6 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20
                   data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-90 data-[state=open]:slide-in-from-bottom-10 
                   sm:data-[state=open]:zoom-in-95 sm:data-[state=open]:slide-in-from-bottom-0 
                   data-[state=open]:duration-400 data-[state=open]:ease-out 
                   data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-10 
                   data-[state=closed]:duration-300 data-[state=closed]:ease-in"
      >
        <DialogHeader className="text-center"> {/* p-6 on content handles padding */}
          <DialogTitle className="text-slate-800 text-xl font-semibold">
            {isEditMode ? "Редактировать подгруппу" : "Новая подгруппа"}
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            {isEditMode
              ? "Измените данные подгруппы ниже."
              : "Заполните информацию о новой подгруппе."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">Название подгруппы*</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Например: Группа А (Информатика)"
                      {...field}
                      className="w-full rounded-xl px-4 py-3 text-base font-medium bg-slate-100/20 backdrop-filter backdrop-blur-md border border-white/20 text-slate-900 placeholder:text-slate-500/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="classId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">Класс*</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={value => {
                      field.onChange(value);
                      form.setValue("studentIds", []);
                    }}
                    disabled={classes.length === 0 && !isLoading}
                  >
                    <FormControl>
                      <SelectTrigger 
                        className="w-full rounded-xl px-4 py-3 text-base font-medium bg-slate-100/20 backdrop-filter backdrop-blur-md border border-white/20 text-slate-900 placeholder:text-slate-500/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out [&>svg]:text-slate-700"
                      >
                        <SelectValue placeholder="Выберите класс" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white/60 backdrop-filter backdrop-blur-lg rounded-xl shadow-xl border border-white/20">
                      {isLoading && classes.length === 0 ? (
                        <SelectItem value="loading_classes" disabled className="text-slate-800 relative flex w-full cursor-default select-none items-center rounded-md py-2.5 pl-8 pr-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[rgb(2,191,122)]/10 data-[highlighted]:text-accent-foreground focus:bg-[rgb(2,191,122)]/10 focus:text-accent-foreground">Загрузка классов...</SelectItem>
                      ) : classes.length === 0 ? (
                        <SelectItem value="no_classes" disabled className="text-slate-800 relative flex w-full cursor-default select-none items-center rounded-md py-2.5 pl-8 pr-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[rgb(2,191,122)]/10 data-[highlighted]:text-accent-foreground focus:bg-[rgb(2,191,122)]/10 focus:text-accent-foreground">Нет доступных классов</SelectItem>
                      ) : (
                        classes.map((cls) => (
                          <SelectItem
                            key={cls.id}
                            value={cls.id.toString()}
                            className="text-slate-800 relative flex w-full cursor-default select-none items-center rounded-md py-2.5 pl-8 pr-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[rgb(2,191,122)]/10 data-[highlighted]:text-accent-foreground focus:bg-[rgb(2,191,122)]/10 focus:text-accent-foreground"
                          >
                            {cls.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="studentIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">Ученики</FormLabel>
                  { isLoadingStudents || isLoadingSubgroupStudents ? (
                    <div className="flex items-center text-sm text-slate-600 py-2">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isLoadingSubgroupStudents ? "Загрузка назначенных учеников..." : "Загрузка учеников класса..."}
                    </div>
                  ) : !form.getValues("classId") ? (
                    <div className="text-sm text-slate-600 py-2">Сначала выберите класс.</div>
                  ) : students.length === 0 ? (
                    <div className="text-sm text-slate-600 py-2">В выбранном классе нет учеников.</div>
                  ) : (
                    <div className="flex flex-col gap-1 max-h-52 overflow-y-auto rounded-xl bg-slate-100/20 backdrop-filter backdrop-blur-md border border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] p-3">
                      {students.map((student) => (
                        <label key={student.id} className="flex items-center space-x-3 p-2.5 rounded-lg hover:bg-slate-200/40 transition-colors cursor-pointer text-slate-800">
                          <input
                            type="checkbox"
                            className="form-checkbox h-5 w-5 rounded-md border-slate-400/70 bg-white/30 text-[rgb(2,191,122)] shadow-sm focus:ring-2 focus:ring-[rgb(2,191,122)]/70 focus:ring-offset-0 focus:ring-offset-slate-100"
                            value={student.id.toString()}
                            checked={field.value?.includes(student.id.toString())}
                            onChange={e => {
                              const studentIdStr = student.id.toString();
                              const currentIds = field.value || [];
                              if (e.target.checked) {
                                field.onChange([...currentIds, studentIdStr]);
                              } else {
                                field.onChange(currentIds.filter((id: string) => id !== studentIdStr));
                              }
                            }}
                            disabled={isLoadingSubgroupStudents}
                          />
                          <span>{student.lastName} {student.firstName} {student.middleName || ''}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <FormDescription className="text-slate-600 text-xs"> {/* Adjusted description text */}
                    {isLoadingSubgroupStudents
                      ? "Обновление списка назначенных учеников..."
                      : "Выберите учеников для этой подгруппы."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">Описание</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Дополнительная информация о подгруппе (например, уровень сложности, преподаватель)"
                      {...field}
                      value={field.value || ""}
                      className="w-full rounded-xl px-4 py-3 text-base font-medium bg-slate-100/20 backdrop-filter backdrop-blur-md border border-white/20 text-slate-900 placeholder:text-slate-500/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out min-h-[100px]"
                    />
                  </FormControl>
                  <FormDescription className="text-slate-600 text-xs">
                    Это поле не обязательно.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-6 gap-3"> {/* Removed bg-transparent, added gap */}
              <Button
                type="button"
                onClick={handleClose}
                disabled={isLoading || isLoadingSubgroupStudents || isLoadingStudents}
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium bg-white/15 backdrop-filter backdrop-blur-lg text-slate-800 shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.45),inset_0_1px_2px_rgba(0,0,0,0.05),0_15px_30px_-8px_rgba(0,0,0,0.08),_0_8px_20px_-12px_rgba(0,0,0,0.05)] hover:bg-white/25 hover:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.55),inset_0_1px_2px_rgba(0,0,0,0.08),0_18px_35px_-8px_rgba(0,0,0,0.1),0_10px_25px_-12px_rgba(0,0,0,0.07)] hover:-translate-y-px active:scale-[0.98] active:bg-white/20 active:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3),inset_0_1px_3px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isLoading || isLoadingSubgroupStudents || isLoadingStudents}
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium text-white bg-gradient-to-b from-[rgb(2,191,122)]/95 via-[rgb(2,191,122)]/90 to-[rgb(2,191,122)]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_0_0_1.5px_rgba(255,255,255,0.2),0_5px_15px_-3px_rgba(0,0,0,0.08),_0_8px_25px_-8px_rgba(0,0,0,0.07)] hover:from-[rgb(2,191,122)]/95 hover:via-[rgb(2,191,122)]/90 hover:to-[rgb(2,191,122)]/95 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_0_0_1.5px_rgba(255,255,255,0.3),0_6px_18px_-3px_rgba(0,0,0,0.1),0_10px_30px_-8px_rgba(0,0,0,0.09)] hover:-translate-y-px active:scale-[0.97] active:from-[rgb(2,191,122)]/95 active:via-[rgb(2,191,122)]/90 active:to-[rgb(2,191,122)]/95 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
              >
                {(isLoading || isLoadingSubgroupStudents) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Сохранить" : "Создать подгруппу"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}