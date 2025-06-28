// client/src/components/subjects-management/subject-form-dialog.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"; // Added FormDescription
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { InsertSubject } from "@shared/schema";
import { Loader2 } from "lucide-react";
import React from "react";

// Схема валидации формы предмета
const subjectFormSchema = z.object({
  name: z.string().min(1, "Название предмета обязательно"),
  description: z.string().optional().nullable(),
});

type SubjectFormData = z.infer<typeof subjectFormSchema>;

interface SubjectFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubjectFormData) => void;
  isLoading: boolean;
  defaultValues?: Partial<SubjectFormData>;
}

export function SubjectFormDialog({ isOpen, onClose, onSubmit, isLoading, defaultValues }: SubjectFormDialogProps) {
  const form = useForm<SubjectFormData>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: defaultValues || {
      name: "",
      description: "",
    },
  });

  // Сброс формы при закрытии диалога
  const handleClose = () => {
    form.reset(defaultValues || { name: "", description: "" });
    onClose();
  };

  // Сброс и установка значений при открытии диалога (для редактирования)
  React.useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues || { name: "", description: "" });
    }
  }, [isOpen, defaultValues, form]);

  const isEdit = Boolean(defaultValues && (defaultValues.name || defaultValues.description));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[450px] p-6 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20
                   data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-90 data-[state=open]:slide-in-from-bottom-10 
                   sm:data-[state=open]:zoom-in-95 sm:data-[state=open]:slide-in-from-bottom-0 
                   data-[state=open]:duration-400 data-[state=open]:ease-out 
                   data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-10 
                   data-[state=closed]:duration-300 data-[state=closed]:ease-in"
      >
        <DialogHeader className="text-center"> {/* Removed bg-transparent pt-2 as p-6 on content handles padding */}
          <DialogTitle className="text-slate-800 text-xl font-semibold">
            {isEdit ? "Редактировать предмет" : "Новый предмет"}
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            {isEdit ? "Измените данные предмета ниже." : "Заполните информацию о новом предмете."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">Название предмета*</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Например: Алгебра, Литература"
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">Описание</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Дополнительная информация о предмете (например, углубленный, профильный)"
                      {...field}
                      value={field.value || ""}
                      className="w-full rounded-xl px-4 py-3 text-base font-medium bg-slate-100/20 backdrop-filter backdrop-blur-md border border-white/20 text-slate-900 placeholder:text-slate-500/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out min-h-[120px]"
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
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium bg-white/15 backdrop-filter backdrop-blur-lg text-slate-800 shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.45),inset_0_1px_2px_rgba(0,0,0,0.05),0_15px_30px_-8px_rgba(0,0,0,0.08),_0_8px_20px_-12px_rgba(0,0,0,0.05)] hover:bg-white/25 hover:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.55),inset_0_1px_2px_rgba(0,0,0,0.08),0_18px_35px_-8px_rgba(0,0,0,0.1),0_10px_25px_-12px_rgba(0,0,0,0.07)] hover:-translate-y-px active:scale-[0.98] active:bg-white/20 active:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3),inset_0_1px_3px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium text-white bg-gradient-to-b from-[rgb(2,191,122)]/95 via-[rgb(2,191,122)]/90 to-[rgb(2,191,122)]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_0_0_1.5px_rgba(255,255,255,0.2),0_5px_15px_-3px_rgba(0,0,0,0.08),_0_8px_25px_-8px_rgba(0,0,0,0.07)] hover:from-[rgb(2,191,122)]/95 hover:via-[rgb(2,191,122)]/90 hover:to-[rgb(2,191,122)]/95 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_0_0_1.5px_rgba(255,255,255,0.3),0_6px_18px_-3px_rgba(0,0,0,0.1),0_10px_30px_-8px_rgba(0,0,0,0.09)] hover:-translate-y-px active:scale-[0.97] active:from-[rgb(2,191,122)]/95 active:via-[rgb(2,191,122)]/90 active:to-[rgb(2,191,122)]/95 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Сохранить" : "Создать предмет"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}