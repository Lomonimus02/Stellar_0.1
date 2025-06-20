import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const editChatSchema = z.object({
  name: z
    .string()
    .min(2, "Название должно содержать не менее 2 символов")
    .max(50, "Название не должно превышать 50 символов"),
});

type EditChatFormValues = z.infer<typeof editChatSchema>;

type EditChatDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EditChatFormValues) => void;
  defaultName: string;
  isSubmitting: boolean;
};

export function EditChatDialog({
  isOpen,
  onClose,
  onSubmit,
  defaultName,
  isSubmitting,
}: EditChatDialogProps) {
  // Настраиваем форму с валидацией Zod
  const form = useForm<EditChatFormValues>({
    resolver: zodResolver(editChatSchema),
    defaultValues: {
      name: defaultName,
    },
  });

  const handleSubmit = (data: EditChatFormValues) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактировать название чата</DialogTitle>
          <DialogDescription>
            Измените название группового чата.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название чата</FormLabel>
                  <FormControl>
                    <Input placeholder="Введите название чата" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Сохранение..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}