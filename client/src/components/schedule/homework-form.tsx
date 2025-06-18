import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Schedule, Homework, insertHomeworkSchema } from "@shared/schema";
import { FiTrash } from "react-icons/fi";

interface HomeworkFormProps {
  schedule: Schedule;
  existingHomework?: Homework;
  onClose: () => void;
}

// Компонент формы для создания/редактирования домашнего задания
export const HomeworkForm: React.FC<HomeworkFormProps> = ({ schedule, existingHomework, onClose }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Расширяем схему валидации с дополнительной проверкой
  const formSchema = insertHomeworkSchema.extend({
    title: insertHomeworkSchema.shape.title.min(3, {
      message: "Название должно содержать минимум 3 символа",
    }),
    description: insertHomeworkSchema.shape.description.min(10, {
      message: "Описание должно содержать минимум 10 символов",
    }),
  });
  
  // Получаем существующее домашнее задание для указанного расписания
  const { data: homework } = useQuery<Homework[]>({
    queryKey: ['/api/homework'],
    enabled: !existingHomework, // не запрашиваем, если уже передано
  });
  
  // Используем переданное домашнее задание или ищем в списке для конкретного расписания (урока)
  const currentHomework = existingHomework || (homework && homework.find(hw => 
    hw.scheduleId === schedule.id
  ));
  
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"), // Срок через неделю
      classId: schedule.classId,
      subjectId: schedule.subjectId,
      teacherId: schedule.teacherId,
      scheduleId: schedule.id
    },
  });
  
  // Заполняем форму данными существующего задания при его наличии
  useEffect(() => {
    if (currentHomework) {
      form.reset({
        title: currentHomework.title,
        description: currentHomework.description,
        dueDate: currentHomework.dueDate,
        classId: currentHomework.classId,
        subjectId: currentHomework.subjectId,
        teacherId: currentHomework.teacherId,
        scheduleId: currentHomework.scheduleId
      });
    }
  }, [currentHomework, form]);
  
  // Удаление домашнего задания
  const deleteHomework = async () => {
    if (!currentHomework) return;
    
    try {
      await apiRequest('/api/homework/' + currentHomework.id, 'DELETE');
      
      // Обновляем данные на клиенте
      queryClient.invalidateQueries({ queryKey: ['/api/homework'] });
      
      // Закрываем диалог
      onClose();
      
      toast({
        title: "Домашнее задание удалено",
        description: "Задание успешно удалено из расписания",
      });
    } catch (error) {
      console.error('Ошибка при удалении домашнего задания:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить домашнее задание",
        variant: "destructive",
      });
    }
  };
  
  // Обработка формы (создание или обновление)
  const submitHomework = async (data: any) => {
    try {
      if (currentHomework) {
        // Обновляем существующее задание
        await apiRequest('/api/homework/' + currentHomework.id, 'PATCH', data);
        toast({
          title: "Домашнее задание обновлено",
          description: "Задание успешно обновлено"
        });
      } else {
        // Создаем новое задание
        await apiRequest('/api/homework', 'POST', data);
        toast({
          title: "Домашнее задание создано",
          description: "Задание успешно добавлено к расписанию"
        });
      }
      
      // Обновляем данные на клиенте
      queryClient.invalidateQueries({ queryKey: ['/api/homework'] });
      
      // Закрываем диалог
      onClose();
    } catch (error) {
      console.error('Ошибка при работе с домашним заданием:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить домашнее задание",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submitHomework)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название</FormLabel>
              <FormControl>
                <Input placeholder="Введите название задания" {...field} />
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
                  placeholder="Введите подробное описание задания" 
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Срок выполнения</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <DialogFooter className="flex flex-wrap justify-between gap-2 sm:justify-between">
          {currentHomework && (
            <Button 
              type="button" 
              variant="destructive" 
              onClick={deleteHomework}
              size="sm"
            >
              <FiTrash className="mr-2" />
              Удалить задание
            </Button>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit">
              {currentHomework ? 'Сохранить изменения' : 'Создать задание'}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Form>
  );
};