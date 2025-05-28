import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Assignment, AssignmentTypeEnum, Schedule } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { queryClient } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";

const assignmentSchema = z.object({
  maxScore: z.string().min(1, "Введите максимальное количество баллов"),
  assignmentType: z.string().min(1, "Выберите тип задания"),
  description: z.string().optional(),
  plannedFor: z.boolean().default(false),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

interface AssignmentFormProps {
  schedule: Schedule;
  existingAssignment?: Assignment;
  onClose: () => void;
}

export const AssignmentForm: React.FC<AssignmentFormProps> = ({
  schedule,
  existingAssignment,
  onClose,
}) => {
  const { toast } = useToast();

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      maxScore: existingAssignment?.maxScore || "",
      assignmentType: existingAssignment?.assignmentType || "",
      description: existingAssignment?.description || "",
      plannedFor: existingAssignment?.plannedFor || false,
    },
  });

  const onSubmit = async (data: AssignmentFormValues) => {
    try {
      const requestData = {
        ...data,
        scheduleId: schedule.id,
        teacherId: schedule.teacherId,
        classId: schedule.classId,
        subjectId: schedule.subjectId,
        subgroupId: schedule.subgroupId,
      };

      if (existingAssignment) {
        // Редактирование существующего задания
        await fetch(`/api/assignments/${existingAssignment.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestData)
        });

        toast({
          title: "Задание обновлено",
          description: "Задание успешно обновлено",
        });
      } else {
        // Создание нового задания
        await fetch("/api/assignments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestData)
        });

        toast({
          title: "Задание создано",
          description: "Задание успешно создано",
        });
      }

      // Инвалидируем кеш, чтобы обновить данные
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      
      onClose();
    } catch (error) {
      console.error("Ошибка при сохранении задания:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось сохранить задание. Попробуйте еще раз.",
      });
    }
  };

  const handleDelete = async () => {
    if (!existingAssignment) return;

    try {
      await fetch(`/api/assignments/${existingAssignment.id}`, {
        method: "DELETE"
      });

      toast({
        title: "Задание удалено",
        description: "Задание успешно удалено",
      });

      // Инвалидируем кеш, чтобы обновить данные
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      
      onClose();
    } catch (error) {
      console.error("Ошибка при удалении задания:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось удалить задание. Попробуйте еще раз.",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="assignmentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Тип задания</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип задания" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={AssignmentTypeEnum.CONTROL_WORK}>Контрольная работа</SelectItem>
                  <SelectItem value={AssignmentTypeEnum.TEST_WORK}>Проверочная работа</SelectItem>
                  <SelectItem value={AssignmentTypeEnum.CURRENT_WORK}>Текущая работа</SelectItem>
                  <SelectItem value={AssignmentTypeEnum.HOMEWORK}>Домашняя работа</SelectItem>
                  <SelectItem value={AssignmentTypeEnum.CLASSWORK}>Работа на уроке</SelectItem>
                  <SelectItem value={AssignmentTypeEnum.PROJECT_WORK}>Проектная работа</SelectItem>
                  <SelectItem value={AssignmentTypeEnum.CLASS_ASSIGNMENT}>Классная работа</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maxScore"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Максимальный балл</FormLabel>
              <FormControl>
                <Input type="number" min="1" {...field} />
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
              <FormLabel>Описание (необязательно)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Добавьте описание задания" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {schedule.status === 'not_conducted' && (
          <FormField
            control={form.control}
            name="plannedFor"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Запланированное задание
                  </FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Оценки за это задание будут учитываться в среднем проценте только после проведения урока
                  </p>
                </div>
              </FormItem>
            )}
          />
        )}

        <DialogFooter className="flex justify-between items-center">
          {existingAssignment && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
            >
              Удалить
            </Button>
          )}
          
          <div className="space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit">
              {existingAssignment ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Form>
  );
};