import { useState, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { UserCard } from "./user-card";
import { Users, UserPlus, UserMinus, Crown } from "lucide-react";

interface ChatUser {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  role: string;
  avatarUrl?: string;
  isAdmin?: boolean;
}

interface Chat {
  id: number;
  name: string;
  avatarUrl: string | null;
  participants?: ChatUser[];
}

const editChatSchema = z.object({
  name: z
    .string()
    .min(2, "Название должно содержать не менее 2 символов")
    .max(50, "Название не должно превышать 50 символов"),
  avatarUrl: z.string().nullable().optional(),
});

type EditChatFormValues = z.infer<typeof editChatSchema>;

type EditChatDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EditChatFormValues) => void;
  chat: Chat;
  availableUsers?: ChatUser[];
  currentUserId: number;
  isSubmitting: boolean;
  onAddParticipant?: (userId: number) => void;
  onRemoveParticipant?: (userId: number) => void;
  onToggleAdmin?: (userId: number) => void;
};

export function EditChatDialog({
  isOpen,
  onClose,
  onSubmit,
  chat,
  availableUsers = [],
  currentUserId,
  isSubmitting,
  onAddParticipant,
  onRemoveParticipant,
  onToggleAdmin,
}: EditChatDialogProps) {
  const [activeTab, setActiveTab] = useState("general");

  // Настраиваем форму с валидацией Zod
  const form = useForm<EditChatFormValues>({
    resolver: zodResolver(editChatSchema),
    defaultValues: {
      name: chat.name,
      avatarUrl: chat.avatarUrl,
    },
  });

  // Обновляем форму при изменении чата
  useEffect(() => {
    form.reset({
      name: chat.name,
      avatarUrl: chat.avatarUrl,
    });
  }, [chat, form]);

  const handleSubmit = (data: EditChatFormValues) => {
    onSubmit(data);
  };

  // Получаем список пользователей, которых можно добавить
  const usersToAdd = availableUsers.filter(user =>
    user.id !== currentUserId &&
    !chat.participants?.some(p => p.id === user.id)
  );

  // Получаем участников чата (исключая текущего пользователя)
  const chatParticipants = chat.participants?.filter(p => p.id !== currentUserId) || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Настройки группового чата</DialogTitle>
          <DialogDescription>
            Управляйте настройками и участниками группового чата.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Общие</TabsTrigger>
            <TabsTrigger value="participants">Участники</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Аватарка</span>
                    <FormField
                      control={form.control}
                      name="avatarUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <AvatarUpload
                              value={field.value}
                              onChange={field.onChange}
                              fallback="👥"
                              size="lg"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex-1">
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
                  </div>
                </div>

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
          </TabsContent>

          <TabsContent value="participants" className="space-y-4">
            <div className="space-y-4">
              {/* Текущие участники */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Участники чата ({chatParticipants.length + 1})
                </h4>
                <ScrollArea className="h-[200px] border rounded-md p-2">
                  <div className="space-y-2">
                    {/* Текущий пользователь */}
                    <div className="flex items-center p-2 bg-gray-50 rounded-md">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarFallback className="bg-primary text-white">
                          Вы
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">Вы</p>
                        <p className="text-xs text-gray-500">Создатель</p>
                      </div>
                      <Badge variant="secondary">
                        <Crown className="h-3 w-3 mr-1" />
                        Админ
                      </Badge>
                    </div>

                    {/* Остальные участники */}
                    {chatParticipants.map(participant => (
                      <div key={participant.id} className="flex items-center p-2 hover:bg-gray-50 rounded-md">
                        <Avatar className="h-10 w-10 mr-3">
                          {participant.avatarUrl ? (
                            <AvatarImage src={participant.avatarUrl} alt={`${participant.firstName} ${participant.lastName}`} />
                          ) : (
                            <AvatarFallback>
                              {participant.firstName.charAt(0)}{participant.lastName.charAt(0)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {participant.firstName} {participant.lastName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {participant.role}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {participant.isAdmin && (
                            <Badge variant="secondary" className="text-xs">
                              <Crown className="h-3 w-3 mr-1" />
                              Админ
                            </Badge>
                          )}
                          {onToggleAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onToggleAdmin(participant.id)}
                              className="h-8 px-2"
                            >
                              {participant.isAdmin ? "Убрать админа" : "Сделать админом"}
                            </Button>
                          )}
                          {onRemoveParticipant && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onRemoveParticipant(participant.id)}
                              className="h-8 px-2"
                            >
                              <UserMinus className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Добавление новых участников */}
              {usersToAdd.length > 0 && onAddParticipant && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Добавить участников
                  </h4>
                  <ScrollArea className="h-[150px] border rounded-md p-2">
                    <div className="space-y-2">
                      {usersToAdd.map(user => (
                        <div key={user.id} className="flex items-center p-2 hover:bg-gray-50 rounded-md">
                          <UserCard
                            user={user}
                            isSelected={false}
                            onClick={() => onAddParticipant(user.id)}
                            showCheckmark={false}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAddParticipant(user.id)}
                            className="ml-auto h-8 px-2"
                          >
                            <UserPlus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}