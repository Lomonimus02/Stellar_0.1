import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
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
  FormMessage,
} from "@/components/ui/form";
import { ChatAvatarUpload } from "@/components/ChatAvatarUpload";
import { UserCard } from "./user-card";
import { AddParticipantsDialog } from "./add-participants-dialog";
import {
  Users,
  UserPlus,
  UserMinus,
  Crown,
  X,
  Camera,
  Edit3,
  LogOut,
  Check,
  Loader2
} from "lucide-react";

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
  hasAvatar?: boolean;
  updatedAt?: string;
  creatorId?: number;
  participants?: ChatUser[];
}

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
  chat: Chat;
  availableUsers?: ChatUser[];
  currentUserId: number;
  isSubmitting: boolean;
  onAddParticipant?: (userId: number) => void;
  onRemoveParticipant?: (userId: number) => void;
  onToggleAdmin?: (userId: number) => void;
  onLeaveChat?: () => void;
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
  onLeaveChat,
}: EditChatDialogProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isAddParticipantsOpen, setIsAddParticipantsOpen] = useState(false);
  const [tempName, setTempName] = useState(chat.name);

  // Настраиваем форму с валидацией Zod
  const form = useForm<EditChatFormValues>({
    resolver: zodResolver(editChatSchema),
    defaultValues: {
      name: chat.name,
    },
  });

  // Обновляем форму при изменении чата
  useEffect(() => {
    form.reset({
      name: chat.name,
    });
    setTempName(chat.name);
  }, [chat, form]);

  // Автосохранение названия
  const handleNameSave = () => {
    if (tempName.trim() && tempName !== chat.name) {
      onSubmit({ name: tempName.trim() });
    }
    setIsEditingName(false);
  };

  const handleNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setTempName(chat.name);
      setIsEditingName(false);
    }
  };

  // Состояние аватарки (локальное для обновления UI)
  const [localHasAvatar, setLocalHasAvatar] = useState(chat.hasAvatar || false);

  // Обработка изменения аватара
  const handleAvatarUpdate = (hasAvatar: boolean) => {
    setLocalHasAvatar(hasAvatar);
    // Обновляем чат в родительском компоненте
    // Это вызовет перезагрузку данных чата
  };

  // Проверяем, является ли текущий пользователь создателем
  const isCreator = chat.creatorId === currentUserId;

  // Получаем участников чата
  // Для создателя - исключаем его из списка (он отображается отдельно как "Вы")
  // Для обычных участников - показываем всех, включая создателя
  const chatParticipants = chat.participants?.filter(p =>
    isCreator ? p.id !== currentUserId : true
  ) || [];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] bg-white/95 backdrop-blur-xl border-0 shadow-2xl rounded-3xl overflow-hidden">
          <DialogHeader className="pb-0">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Настройки группы
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Аватар и название чата */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-2xl">
              {/* Новый компонент аватарки */}
              {isCreator ? (
                <ChatAvatarUpload
                  chatId={chat.id}
                  chatName={chat.name}
                  hasAvatar={localHasAvatar}
                  isGroupChat={true}
                  onAvatarUpdate={handleAvatarUpdate}
                  className="h-16 w-16 ring-4 ring-white/50 shadow-lg transition-all duration-300 hover:ring-primary/30"
                />
              ) : (
                <Avatar className="h-16 w-16 ring-4 ring-white/50 shadow-lg">
                  <AvatarImage
                    src={localHasAvatar ? `/api/chats/${chat.id}/avatar?t=${Date.now()}` : undefined}
                    alt={chat.name}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xl font-semibold">
                    <Users className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
              )}

              <div className="flex-1">
                {isCreator ? (
                  isEditingName ? (
                    <Input
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onBlur={handleNameSave}
                      onKeyDown={handleNameKeyPress}
                      className="text-lg font-semibold bg-white/80 border-gray-300/50 focus:border-primary/50 rounded-xl"
                      autoFocus
                    />
                  ) : (
                    <h2
                      onClick={() => setIsEditingName(true)}
                      className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-primary transition-colors duration-200"
                    >
                      {chat.name}
                    </h2>
                  )
                ) : (
                  <h2 className="text-lg font-semibold text-gray-900">
                    {chat.name}
                  </h2>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  {(chatParticipants.length + 1)} участников
                </p>
              </div>
            </div>

            {/* Секция участников */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Участники
                </h3>
                {isCreator && (
                  <Button
                    onClick={() => setIsAddParticipantsOpen(true)}
                    className="bg-primary hover:bg-primary/90 rounded-xl text-sm px-4 py-2"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Добавить участников
                  </Button>
                )}
              </div>

              {/* Список участников */}
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {/* Текущий пользователь (только для создателя) */}
                  {isCreator && (
                    <div className="flex items-center p-3 bg-gradient-to-r from-primary/5 to-transparent rounded-xl border border-primary/10">
                      <Avatar className="h-12 w-12 mr-3 ring-2 ring-primary/20">
                        <AvatarFallback className="bg-primary text-white font-semibold">
                          Вы
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 flex items-center gap-2">
                          Вы
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </p>
                        <p className="text-sm text-gray-600">
                          Администратор
                        </p>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        <Crown className="h-3 w-3 mr-1" />
                        Админ
                      </Badge>
                    </div>
                  )}

                  {/* Остальные участники */}
                  {chatParticipants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center p-3 hover:bg-gray-50/80 rounded-xl transition-all duration-200 group"
                    >
                      <Avatar className="h-12 w-12 mr-3">
                        <AvatarImage src={participant.avatarUrl} alt={`${participant.firstName} ${participant.lastName}`} />
                        <AvatarFallback className="bg-gray-200 text-gray-700 font-semibold">
                          {participant.firstName.charAt(0)}{participant.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {participant.firstName} {participant.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {participant.userId === chat?.creatorId ? 'Администратор' : 'Пользователь'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {participant.userId === chat?.creatorId && (
                          <Badge variant="secondary" className="text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            Админ
                          </Badge>
                        )}

                        {/* Действия для администратора */}
                        {isCreator && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onToggleAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onToggleAdmin(participant.id)}
                                className="h-8 px-2 text-xs hover:bg-primary/10 text-primary rounded-lg"
                                title={participant.isAdmin ? "Убрать админа" : "Сделать админом"}
                              >
                                <Crown className="h-3 w-3" />
                              </Button>
                            )}
                            {onRemoveParticipant && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onRemoveParticipant(participant.id)}
                                className="h-8 px-2 text-xs hover:bg-red-50 text-red-600 rounded-lg"
                                title="Удалить из группы"
                              >
                                <UserMinus className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Кнопка покинуть чат (только для участников, не создателя) */}
            {!isCreator && (
              <div className="pt-4 border-t border-gray-200/50">
                <Button
                  variant="outline"
                  onClick={onLeaveChat}
                  className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 rounded-xl"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Покинуть группу
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог добавления участников */}
      <AddParticipantsDialog
        isOpen={isAddParticipantsOpen}
        onClose={() => setIsAddParticipantsOpen(false)}
        onAddParticipants={(userIds) => {
          userIds.forEach(userId => {
            if (onAddParticipant) {
              onAddParticipant(userId);
            }
          });
          setIsAddParticipantsOpen(false);
        }}
        availableUsers={availableUsers}
        currentParticipants={chat.participants || []}
        currentUserId={currentUserId}
        isSubmitting={isSubmitting}
      />
    </>
  );
}