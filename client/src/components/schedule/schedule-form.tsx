import React from "react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Схема валидации формы
const scheduleFormSchema = z.object({
  subjectId: z.string().min(1, "Выберите предмет"),
  teacherId: z.string().min(1, "Выберите учителя"),
  date: z.string().min(1, "Выберите дату"),
  slotNumber: z.string().min(1, "Выберите номер урока"),
  room: z.string().min(1, "Введите номер кабинета"),
  subgroupId: z.string().optional(),
  theme: z.string().optional(),
  description: z.string().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

interface ScheduleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  classId: number;
  initialValues?: any;
  selectedDate?: Date;
  loading?: boolean;
}

export const ScheduleForm: React.FC<ScheduleFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  classId,
  initialValues,
  selectedDate,
  loading = false,
}) => {
  // Загрузка предметов
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery<any[]>({
    queryKey: ["/api/subjects"],
    enabled: isOpen,
  });

  // Загрузка учителей
  const { data: teachers = [], isLoading: teachersLoading } = useQuery<any[]>({
    queryKey: ["/api/users", { role: "teacher" }],
    enabled: isOpen,
  });

  // Загрузка временных слотов
  const { data: timeSlots = [], isLoading: timeSlotsLoading } = useQuery<any[]>({
    queryKey: ["/api/time-slots/defaults"],
    enabled: isOpen,
  });

  // Загрузка подгрупп класса
  const { data: subgroups = [], isLoading: subgroupsLoading } = useQuery<any[]>({
    queryKey: ["/api/subgroups", { classId }],
    enabled: isOpen && !!classId,
  });

  const isDataLoading = subjectsLoading || teachersLoading || timeSlotsLoading || subgroupsLoading;

  // Инициализация формы
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      subjectId: initialValues?.subjectId?.toString() || "",
      teacherId: initialValues?.teacherId?.toString() || "",
      date: initialValues?.date || (selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""),
      slotNumber: initialValues?.slotNumber?.toString() || "",
      room: initialValues?.room || "",
      subgroupId: initialValues?.subgroupId?.toString() || "",
      theme: initialValues?.theme || "",
      description: initialValues?.description || "",
    },
  });

  // Обновление значений формы при изменении initialValues
  useEffect(() => {
    if (initialValues) {
      form.reset({
        subjectId: initialValues.subjectId?.toString() || "",
        teacherId: initialValues.teacherId?.toString() || "",
        date: initialValues.date || "",
        slotNumber: initialValues.slotNumber?.toString() || "",
        room: initialValues.room || "",
        subgroupId: initialValues.subgroupId?.toString() || "",
        theme: initialValues.theme || "",
        description: initialValues.description || "",
      });
    } else if (selectedDate) {
      form.reset({
        ...form.getValues(),
        date: format(selectedDate, "yyyy-MM-dd"),
      });
    }
  }, [initialValues, selectedDate, form]);

  // Обработчик отправки формы
  const handleSubmit = (values: ScheduleFormValues) => {
    // Вычисляем день недели из выбранной даты 
    const selectedDate = new Date(values.date);
    // JS: 0 - воскресенье, 1 - понедельник, ..., 6 - суббота
    // API: 1 - понедельник, 2 - вторник, ..., 7 - воскресенье
    const dayOfWeek = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay();
    
    // Получаем время начала и конца из выбранного слота
    const selectedSlot = timeSlots.find(slot => slot.slotNumber.toString() === values.slotNumber);
    const startTime = selectedSlot ? selectedSlot.startTime : "00:00";
    const endTime = selectedSlot ? selectedSlot.endTime : "00:00";
    
    onSubmit({
      subjectId: parseInt(values.subjectId),
      teacherId: parseInt(values.teacherId),
      scheduleDate: values.date,
      dayOfWeek: dayOfWeek,
      startTime: startTime,
      endTime: endTime,
      room: values.room,
      subgroupId: values.subgroupId ? parseInt(values.subgroupId) : null,
      theme: values.theme || null,
      description: values.description || null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {initialValues ? "Редактировать урок" : "Добавить урок в расписание"}
          </DialogTitle>
          <DialogDescription>
            {initialValues
              ? "Измените информацию об уроке в расписании"
              : "Заполните форму для добавления урока в расписание"}
          </DialogDescription>
        </DialogHeader>

        {isDataLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-lg">Загрузка данных...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Дата урока */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Номер урока (слот) */}
              <FormField
                control={form.control}
                name="slotNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Урок</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={loading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите номер урока" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot.slotNumber} value={slot.slotNumber.toString()}>
                            {slot.slotNumber} урок ({slot.startTime} - {slot.endTime})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Предмет */}
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Предмет</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={loading}
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

              {/* Учитель */}
              <FormField
                control={form.control}
                name="teacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Учитель</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={loading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите учителя" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id.toString()}>
                            {teacher.lastName} {teacher.firstName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Кабинет */}
              <FormField
                control={form.control}
                name="room"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Кабинет</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="Номер кабинета" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Подгруппа */}
              {subgroups.length > 0 && (
                <FormField
                  control={form.control}
                  name="subgroupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Подгруппа (если урок для подгруппы)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={loading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите подгруппу" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">Весь класс</SelectItem>
                          {subgroups.map((subgroup) => (
                            <SelectItem key={subgroup.id} value={subgroup.id.toString()}>
                              {subgroup.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Тема урока */}
              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тема урока (необязательно)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="Тема урока" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Описание */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание (необязательно)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Описание урока"
                        {...field}
                        className="h-24"
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Отмена
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {initialValues ? "Сохранить" : "Добавить"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};