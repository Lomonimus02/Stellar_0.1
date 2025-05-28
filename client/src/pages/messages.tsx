import { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { UserRoleEnum, ChatTypeEnum } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Send, 
  User as UserIcon, 
  Users, 
  CheckCircle, 
  Clock, 
  MessagesSquare, 
  PlusCircle, 
  PaperclipIcon,
  Image,
  FileIcon,
  X,
  Play,
  Download,
  ExternalLink,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { SwipeableChatItem } from "@/components/chat/swipeable-chat-item";
import { EditChatDialog } from "@/components/chat/edit-chat-dialog";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Типы для интерфейса сообщений и чатов
interface ChatUser {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  role: string;
  isAdmin?: boolean;
  lastReadMessageId?: number | null;
}

interface Chat {
  id: number;
  name: string;
  type: ChatTypeEnum;
  creatorId: number;
  schoolId: number;
  avatarUrl: string | null;
  createdAt: string;
  lastMessageAt: string | null;
  participants?: ChatUser[];
  unreadCount?: number; // Количество непрочитанных сообщений
}

interface ChatMessage {
  id: number;
  chatId: number;
  senderId: number;
  content: string | null;
  hasAttachment: boolean;
  attachmentType: string | null;
  attachmentUrl: string | null;
  isRead: boolean;
  sentAt: string;
  sender?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

// Схема для создания нового сообщения
const messageFormSchema = z.object({
  content: z.string().optional(),
  attachmentFile: z.instanceof(File).optional(),
});

type MessageFormValues = z.infer<typeof messageFormSchema>;

// Схема для создания нового чата
const newChatFormSchema = z.object({
  name: z.string().min(1, "Введите название чата"),
  type: z.enum(["private", "group"], {
    required_error: "Выберите тип чата",
  }),
  participantIds: z.array(z.number()).min(1, "Добавьте хотя бы одного участника"),
});

type NewChatFormValues = z.infer<typeof newChatFormSchema>;

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Состояния для UI
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
  const [isParticipantsDialogOpen, setIsParticipantsDialogOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  
  // Получение списка чатов пользователя
  const { data: chats = [], isLoading: chatsLoading } = useQuery<Chat[]>({
    queryKey: ["/api/chats"],
    enabled: !!user,
    refetchInterval: 10000, // Обновляем каждые 10 секунд
  });
  
  // Получение выбранного чата (перемещено выше для использования в других запросах)
  const selectedChat = selectedChatId ? chats.find(c => c.id === selectedChatId) : null;
  
  // Получение списка сообщений для выбранного чата
  const { data: chatMessages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: [`/api/chats/${selectedChatId}/messages`],
    enabled: !!selectedChatId,
    refetchInterval: 5000, // Обновляем каждые 5 секунд
  });
  
  // Получение списка участников выбранного чата
  const { data: chatParticipants = [], isLoading: participantsLoading } = useQuery<ChatUser[]>({
    queryKey: [`/api/chats/${selectedChatId}/participants`],
    enabled: !!selectedChatId && selectedChat?.type === 'group',
  });
  
  // Получение списка пользователей для создания чата
  const { data: chatUsers = [], isLoading: usersLoading } = useQuery<ChatUser[]>({
    queryKey: ["/api/chat-users"],
    enabled: !!user,
  });
  
  // Форма для отправки сообщений
  const messageForm = useForm<MessageFormValues>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      content: "",
    },
  });
  
  // Форма для создания нового чата
  const newChatForm = useForm<NewChatFormValues>({
    resolver: zodResolver(newChatFormSchema),
    defaultValues: {
      name: "",
      type: "private",
      participantIds: [],
    },
  });
  
  // Мутация для отправки сообщения
  const sendMessageMutation = useMutation({
    mutationFn: async (data: MessageFormValues & { chatId: number }) => {
      // Если есть вложение, сначала загружаем его
      let attachmentType = null;
      let attachmentUrl = null;
      let hasAttachment = false;
      
      if (data.attachmentFile) {
        hasAttachment = true;
        
        // Определяем тип вложения
        if (data.attachmentFile.type.startsWith('image/')) {
          attachmentType = 'image';
        } else if (data.attachmentFile.type.startsWith('video/')) {
          attachmentType = 'video';
        } else {
          attachmentType = 'document';
        }
        
        // Загружаем файл на сервер
        const formData = new FormData();
        formData.append('file', data.attachmentFile);
        
        try {
          const uploadResponse = await fetch(`/api/chats/${data.chatId}/upload`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
          });
          
          if (!uploadResponse.ok) {
            throw new Error('Не удалось загрузить файл');
          }
          
          const uploadResult = await uploadResponse.json();
          attachmentUrl = uploadResult.file.url;
          attachmentType = uploadResult.file.type;
          
          console.log('Файл успешно загружен:', uploadResult);
        } catch (error) {
          console.error('Ошибка при загрузке файла:', error);
          throw new Error('Не удалось загрузить файл: ' + (error.message || 'неизвестная ошибка'));
        }
      }
      
      // Отправляем сообщение
      console.log(`Отправка сообщения в чат ${data.chatId}:`, {
        content: data.content,
        hasAttachment,
        attachmentType,
        attachmentUrl
      });
      
      const res = await apiRequest(`/api/chats/${data.chatId}/messages`, "POST", {
        content: data.content,
        hasAttachment,
        attachmentType,
        attachmentUrl
      });
      
      return res.json();
    },
    onSuccess: () => {
      // Обновляем правильный ключ запроса для сообщений
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${selectedChatId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      messageForm.reset();
      setSelectedAttachment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить сообщение",
        variant: "destructive",
      });
    },
  });
  
  // Мутация для создания нового чата
  const createChatMutation = useMutation({
    mutationFn: async (data: NewChatFormValues) => {
      const res = await apiRequest("/api/chats", "POST", data);
      return res.json();
    },
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setSelectedChatId(newChat.id);
      setIsNewChatDialogOpen(false);
      newChatForm.reset();
      toast({
        title: "Чат создан",
        description: "Новый чат успешно создан",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать чат",
        variant: "destructive",
      });
    },
  });
  
  // Мутация для обновления статуса прочтения
  const updateReadStatusMutation = useMutation({
    mutationFn: async ({ chatId, messageId }: { chatId: number, messageId: number }) => {
      const res = await apiRequest(`/api/chats/${chatId}/read-status`, "PUT", { messageId });
      return res.json();
    },
    onSuccess: (data) => {
      // Проверяем, что данные содержат информацию о непрочитанных сообщениях
      if (data && typeof data.unreadCount !== 'undefined') {
        // Обновляем кеш с точным количеством непрочитанных сообщений для конкретного чата
        queryClient.setQueryData(["/api/chats"], (oldData: any) => {
          if (!oldData) return oldData;
          
          return oldData.map((chat: Chat) => {
            if (chat.id === selectedChatId) {
              return {
                ...chat,
                unreadCount: data.unreadCount
              };
            }
            return chat;
          });
        });
        
        // Обновляем общее количество непрочитанных сообщений для уведомлений в навигации
        if (typeof data.totalUnreadCount !== 'undefined') {
          // Здесь можно обновить глобальное состояние или кеш для уведомлений навигации
          // Например, через контекст или глобальное состояние
          queryClient.setQueryData(["/api/notifications/count"], () => data.totalUnreadCount);
        }
      } else {
        // Запасной вариант: полное обновление
        queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
      }
    },
  });
  
  // Мутация для удаления сообщения
  const deleteMessageMutation = useMutation({
    mutationFn: async ({ chatId, messageId }: { chatId: number, messageId: number }) => {
      const res = await apiRequest(`/api/chats/${chatId}/messages/${messageId}`, "DELETE");
      return res.json();
    },
    onSuccess: () => {
      // Обновляем сообщения в текущем чате и список всех чатов
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${selectedChatId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      toast({
        title: "Сообщение удалено",
        description: "Сообщение было успешно удалено"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить сообщение",
        variant: "destructive",
      });
    },
  });
  
  // При загрузке страницы или изменении списка чатов
  useEffect(() => {
    // Если есть чаты, но не выбран ни один, выбираем первый
    if (chats.length > 0 && !selectedChatId) {
      setSelectedChatId(chats[0].id);
    }
  }, [chats, selectedChatId]);
  
  // Прокрутка вниз при получении новых сообщений
  useEffect(() => {
    if (scrollRef.current) {
      // Находим реальный элемент прокрутки внутри ScrollArea
      const scrollViewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        // Плавная прокрутка вниз
        setTimeout(() => {
          scrollViewport.scrollTo({
            top: scrollViewport.scrollHeight,
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  }, [chatMessages]);
  
  // Обработка прочтения сообщений при выборе чата
  useEffect(() => {
    if (selectedChatId && chatMessages.length > 0) {
      // Найдем последнее сообщение в чате
      const messages = [...chatMessages].sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
      );
      
      const lastMessage = messages[0];
      
      // Проверим, есть ли непрочитанные сообщения от других пользователей
      const hasUnreadMessages = messages.some(
        msg => msg.senderId !== user?.id && !msg.isRead
      );
      
      // Если есть непрочитанные сообщения, отмечаем их как прочитанные
      if (lastMessage && hasUnreadMessages) {
        updateReadStatusMutation.mutate({
          chatId: selectedChatId,
          messageId: lastMessage.id,
        });
      }
    }
  }, [selectedChatId, chatMessages, user?.id]);
  
  // Обработка отправки сообщения
  const onSubmitMessage = (values: MessageFormValues) => {
    if (!selectedChatId) return;
    
    // Проверяем, что есть текст или вложение
    if (!values.content && !selectedAttachment) {
      toast({
        title: "Ошибка",
        description: "Сообщение должно содержать текст или вложение",
        variant: "destructive",
      });
      return;
    }
    
    sendMessageMutation.mutate({
      chatId: selectedChatId,
      content: values.content,
      attachmentFile: selectedAttachment || undefined,
    });
  };
  
  // Обработка создания нового чата
  const onSubmitNewChat = (values: NewChatFormValues) => {
    createChatMutation.mutate(values);
  };
  
  // Обработка загрузки файла
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedAttachment(e.target.files[0]);
    }
  };
  
  // Открытие диалога выбора файла
  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Отмена выбора файла
  const cancelAttachment = () => {
    setSelectedAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // Фильтрация чатов по поисковому запросу
  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    
    // Поиск по имени чата
    if (chat.name.toLowerCase().includes(lowerQuery)) return true;
    
    // Поиск по именам участников
    if (chat.participants && chat.participants.some(p => 
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(lowerQuery) ||
      p.username.toLowerCase().includes(lowerQuery)
    )) return true;
    
    return false;
  });
  
  // Определение выбранного чата перемещено выше
  
  // Получаем сообщения для выбранного чата, отсортированные по времени
  const sortedMessages = [...chatMessages].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
  );
  
  // Получение количества непрочитанных сообщений для чата
  const getUnreadCount = (chat: Chat) => {
    // Используем информацию, которая приходит вместе с чатом
    return chat.unreadCount || 0;
  };
  
  // Проверка, является ли пользователь создателем чата
  const isCreatorOfChat = (chat: Chat) => {
    return chat.creatorId === user?.id;
  };
  
  // Состояние для управления диалогом редактирования чата
  const [editChatDialogOpen, setEditChatDialogOpen] = useState(false);
  const [chatToEdit, setChatToEdit] = useState<Chat | null>(null);
  
  // Состояние для управления диалогом подтверждения удаления
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);
  
  // Состояние для управления диалогом подтверждения выхода из чата
  const [leaveAlertOpen, setLeaveAlertOpen] = useState(false);
  const [chatToLeave, setChatToLeave] = useState<Chat | null>(null);
  
  // Мутация для обновления названия чата
  const updateChatMutation = useMutation({
    mutationFn: async (data: { chatId: number, name: string }) => {
      const res = await apiRequest(`/api/chats/${data.chatId}`, "PATCH", { name: data.name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setEditChatDialogOpen(false);
      setChatToEdit(null);
      toast({
        title: "Чат обновлен",
        description: "Название чата успешно изменено",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить чат",
        variant: "destructive",
      });
    },
  });
  
  // Мутация для удаления чата
  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: number) => {
      const res = await apiRequest(`/api/chats/${chatId}`, "DELETE");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setDeleteAlertOpen(false);
      setChatToDelete(null);
      if (selectedChatId === chatToDelete?.id) {
        setSelectedChatId(null);
      }
      toast({
        title: "Чат удален",
        description: "Чат был успешно удален",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить чат",
        variant: "destructive",
      });
    },
  });
  
  // Мутация для выхода из чата
  const leaveChatMutation = useMutation({
    mutationFn: async (chatId: number) => {
      const res = await apiRequest(`/api/chats/${chatId}/leave`, "POST");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setLeaveAlertOpen(false);
      setChatToLeave(null);
      if (selectedChatId === chatToLeave?.id) {
        setSelectedChatId(null);
      }
      toast({
        title: "Выход из чата",
        description: "Вы успешно покинули чат",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось выйти из чата",
        variant: "destructive",
      });
    },
  });
  
  // Форматирование времени сообщения
  const formatMessageTime = (dateStr: string | Date) => {
    try {
      const now = new Date();
      const messageDate = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
      
      // Проверка на валидность даты
      if (isNaN(messageDate.getTime())) {
        console.warn('Некорректная дата:', dateStr);
        return 'Сейчас';
      }
      
      // Если сообщение отправлено сегодня, показываем только время
      if (messageDate.toDateString() === now.toDateString()) {
        return messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      }
      
      // Если сообщение отправлено в этом году, показываем дату без года
      if (messageDate.getFullYear() === now.getFullYear()) {
        return messageDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) + 
               ' ' + 
               messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      }
      
      // Иначе показываем полную дату
      return messageDate.toLocaleDateString('ru-RU') + 
             ' ' + 
             messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Ошибка при форматировании даты:', error);
      return 'Сейчас';
    }
  };
  
  // Получение имени пользователя по ID
  const getUserName = (userId: number) => {
    const found = chatUsers.find(u => u.id === userId);
    return found ? `${found.firstName} ${found.lastName}` : `Пользователь ${userId}`;
  };
  
  // Получение инициалов пользователя
  const getUserInitials = (userId: number) => {
    const found = chatUsers.find(u => u.id === userId);
    return found ? found.firstName.charAt(0) + found.lastName.charAt(0) : "??";
  };
  
  // Получение названия для чата
  const getChatName = (chat: Chat) => {
    // Для личных чатов показываем имя собеседника
    if (chat.type === 'private' && chat.participants) {
      const otherParticipant = chat.participants.find(p => p.id !== user?.id);
      if (otherParticipant) {
        return `${otherParticipant.firstName} ${otherParticipant.lastName}`;
      }
    }
    
    // Для групповых чатов показываем название чата
    return chat.name;
  };
  
  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-gray-800">Сообщения</h2>
        <Button onClick={() => setIsNewChatDialogOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Новый чат
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Список чатов */}
        <div className="md:col-span-1">
          <Card className="h-[calc(100vh-220px)]">
            <CardHeader className="p-4 pb-2">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input 
                  placeholder="Поиск чатов..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-300px)]">
                {chatsLoading ? (
                  <div className="flex justify-center items-center h-20">
                    <Clock className="h-5 w-5 text-primary animate-spin" />
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                    <MessagesSquare className="h-8 w-8 mb-2" />
                    {searchQuery ? "Чаты не найдены" : "У вас пока нет чатов"}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setIsNewChatDialogOpen(true)}
                      className="mt-2"
                    >
                      Создать чат
                    </Button>
                  </div>
                ) : (
                  filteredChats.map(chat => {
                    const unreadCount = getUnreadCount(chat);
                    const isSelected = chat.id === selectedChatId;
                    const chatName = getChatName(chat);
                    const isCreator = isCreatorOfChat(chat);
                    
                    return (
                      <SwipeableChatItem
                        key={chat.id}
                        chatType={chat.type}
                        isCreator={isCreator}
                        onDelete={
                          // Удаление для приватных чатов (всегда доступно)
                          // или для групповых чатов (только создатель)
                          (chat.type === ChatTypeEnum.PRIVATE || 
                           (chat.type === ChatTypeEnum.GROUP && isCreator)) ? () => {
                            setChatToDelete(chat);
                            setDeleteAlertOpen(true);
                          } : undefined
                        }
                        onEdit={
                          // Редактирование только для групповых чатов (для всех участников)
                          chat.type === ChatTypeEnum.GROUP ? () => {
                            setChatToEdit(chat);
                            setEditChatDialogOpen(true);
                          } : undefined
                        }
                        onLeave={
                          // Выход только из групповых чатов (для всех, кроме создателя)
                          (chat.type === ChatTypeEnum.GROUP && !isCreator) ? () => {
                            setChatToLeave(chat);
                            setLeaveAlertOpen(true);
                          } : undefined
                        }
                      >
                        <div 
                          className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 w-full ${
                            isSelected ? 'bg-primary/10' : ''
                          }`}
                          onClick={() => setSelectedChatId(chat.id)}
                        >
                          <Avatar className="h-10 w-10 mr-3">
                            {chat.avatarUrl ? (
                              <AvatarImage src={chat.avatarUrl} alt={chatName} />
                            ) : (
                              <AvatarFallback className={isSelected ? 'bg-primary text-white' : 'bg-gray-200'}>
                                {chat.type === ChatTypeEnum.GROUP ? (
                                  <Users className="h-4 w-4" />
                                ) : chat.participants ? (
                                  chat.participants
                                    .find(p => p.id !== user?.id)?.firstName.charAt(0) +
                                  chat.participants
                                    .find(p => p.id !== user?.id)?.lastName.charAt(0)
                                ) : "??"}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-grow">
                            <div className="flex justify-between">
                              <p className="font-medium text-gray-800">
                                {chatName}
                              </p>
                              {chat.lastMessageAt && (
                                <p className="text-xs text-gray-500">
                                  {formatMessageTime(chat.lastMessageAt)}
                                </p>
                              )}
                            </div>
                            {chat.type === ChatTypeEnum.GROUP && (
                              <p className="text-xs text-gray-500">
                                {chat.participants ? `${chat.participants.length} участников` : ''}
                              </p>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <span className="bg-primary text-white text-xs px-2 py-1 rounded-full ml-2">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </SwipeableChatItem>
                    );
                  })
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        
        {/* Окно переписки */}
        <div className="md:col-span-2">
          <Card className="h-[calc(100vh-220px)] flex flex-col">
            {selectedChat ? (
              <>
                <CardHeader className="p-4 pb-2 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        {selectedChat.avatarUrl ? (
                          <AvatarImage src={selectedChat.avatarUrl} alt={getChatName(selectedChat)} />
                        ) : (
                          <AvatarFallback className="bg-primary text-white">
                            {selectedChat.type === ChatTypeEnum.GROUP ? (
                              <Users className="h-4 w-4" />
                            ) : selectedChat.participants ? (
                              selectedChat.participants
                                .find(p => p.id !== user?.id)?.firstName.charAt(0) +
                              selectedChat.participants
                                .find(p => p.id !== user?.id)?.lastName.charAt(0)
                            ) : "??"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <CardTitle 
                          className="text-lg cursor-pointer hover:text-primary"
                          onClick={() => {
                            if (selectedChat.type === ChatTypeEnum.GROUP) {
                              setIsParticipantsDialogOpen(true);
                            }
                          }}
                        >
                          {getChatName(selectedChat)}
                          {selectedChat.type === ChatTypeEnum.GROUP && (
                            <span className="ml-1 text-xs">
                              <ExternalLink className="inline h-3 w-3" />
                            </span>
                          )}
                        </CardTitle>
                        {selectedChat.type === ChatTypeEnum.GROUP && selectedChat.participants && (
                          <p className="text-xs text-gray-500">
                            {selectedChat.participants.length} участников
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-grow p-0 overflow-hidden">
                  <ScrollArea className="h-[calc(100vh-350px)] px-4" ref={scrollRef}>
                    {messagesLoading ? (
                      <div className="flex justify-center items-center h-20">
                        <Clock className="h-5 w-5 text-primary animate-spin" />
                      </div>
                    ) : sortedMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500 py-10">
                        <MessagesSquare className="h-12 w-12 mb-4" />
                        <p>Нет сообщений. Начните общение!</p>
                      </div>
                    ) : (
                      <div className="space-y-4 py-4">
                        {sortedMessages.map(message => {
                          const isSentByUser = message.senderId === user?.id;
                          const senderName = message.sender ? 
                            `${message.sender.firstName} ${message.sender.lastName}` : 
                            getUserName(message.senderId);
                          
                          return (
                            <div 
                              key={message.id} 
                              className={`flex ${isSentByUser ? 'justify-end' : 'justify-start'}`}
                            >
                              <div 
                                className={`max-w-[80%] p-3 rounded-lg relative group ${
                                  isSentByUser 
                                    ? 'bg-primary text-white rounded-tr-none' 
                                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
                                }`}
                              >
                                {(isSentByUser || user?.role === 'principal' || user?.role === 'school_admin' || user?.role === 'super_admin') && (
                                  <button
                                    className={`absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                                      isSentByUser ? 'hover:bg-primary-dark text-white' : 'hover:bg-gray-200 text-gray-500'
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm('Вы уверены, что хотите удалить это сообщение?')) {
                                        deleteMessageMutation.mutate({
                                          chatId: selectedChatId!,
                                          messageId: message.id
                                        });
                                      }
                                    }}
                                    title="Удалить сообщение"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {selectedChat.type === ChatTypeEnum.GROUP && !isSentByUser && (
                                  <p className={`text-xs font-medium mb-1 ${
                                    isSentByUser ? 'text-primary-50' : 'text-gray-500'
                                  }`}>
                                    {senderName}
                                  </p>
                                )}
                                
                                {message.content && (
                                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                )}
                                
                                {message.hasAttachment && message.attachmentUrl && (
                                  <div className="mt-2">
                                    {message.attachmentType === 'image' ? (
                                      <div 
                                        onClick={() => window.open(message.attachmentUrl, '_blank')}
                                        className="cursor-pointer"
                                      >
                                        <img 
                                          src={`${message.attachmentUrl}?nocache=${Date.now()}`}
                                          alt="Изображение" 
                                          className="max-w-full h-auto max-h-[300px] rounded-md hover:opacity-90 transition-opacity border border-gray-200 shadow-sm"
                                          onError={(e) => {
                                            console.error('Ошибка загрузки изображения:', message.attachmentUrl);
                                            // Пробуем повторить запрос с параметром nocache, если это ошибка кеширования
                                            if (!e.currentTarget.src.includes('retry')) {
                                              e.currentTarget.src = `${message.attachmentUrl}?retry=true&nocache=${Date.now()}`;
                                            } else {
                                              // Если повторная попытка не удалась, показываем заглушку
                                              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTMgMTRIMTFWNEgxM1YxNFoiIGZpbGw9ImN1cnJlbnRDb2xvciI+PC9wYXRoPjxwYXRoIGQ9Ik0xMyAyMEgxMVYxOEgxM1YyMFoiIGZpbGw9ImN1cnJlbnRDb2xvciI+PC9wYXRoPjwvc3ZnPg==';
                                              e.currentTarget.alt = 'Не удалось загрузить изображение';
                                              e.currentTarget.classList.add('p-4', 'bg-red-50');
                                            }
                                          }}
                                        />
                                      </div>
                                    ) : message.attachmentType === 'video' ? (
                                      <div className="rounded-md overflow-hidden border border-gray-200 shadow-sm">
                                        <div className="relative">
                                          <video 
                                            src={`${message.attachmentUrl}?nocache=${Date.now()}`}
                                            controls
                                            className="max-w-full w-full rounded-t-md bg-black"
                                            controlsList="nodownload"
                                            preload="metadata"
                                          />
                                          <div className="absolute inset-0 bg-black/30 pointer-events-none flex items-center justify-center">
                                            <Play className="h-12 w-12 text-white opacity-80" />
                                          </div>
                                        </div>
                                        <div className="flex p-2 gap-2 bg-gray-50">
                                          <button 
                                            onClick={() => window.open(message.attachmentUrl, '_blank')}
                                            className="flex items-center p-1.5 bg-gray-100 justify-center text-xs rounded flex-1 hover:bg-gray-200 transition-colors"
                                          >
                                            <Download className="h-3 w-3 mr-1" />
                                            <span>Скачать</span>
                                          </button>
                                          <button 
                                            onClick={() => window.open(message.attachmentUrl, '_blank')}
                                            className="flex items-center p-1.5 bg-gray-100 justify-center text-xs rounded flex-1 hover:bg-gray-200 transition-colors"
                                          >
                                            <ExternalLink className="h-3 w-3 mr-1" />
                                            <span>Открыть</span>
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div 
                                        onClick={() => window.open(message.attachmentUrl, '_blank')}
                                        className="flex items-center p-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors border border-gray-200 shadow-sm cursor-pointer"
                                      >
                                        <FileIcon className="h-5 w-5 mr-2 text-gray-600" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">
                                            {message.attachmentUrl.split('/').pop() || 'Документ'}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            Документ
                                          </p>
                                        </div>
                                        <Download className="h-4 w-4 flex-shrink-0 text-gray-400 ml-3" />
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                <div 
                                  className={`flex items-center text-xs mt-1 ${
                                    isSentByUser ? 'text-primary-50' : 'text-gray-500'
                                  }`}
                                >
                                  <span>{formatMessageTime(message.sentAt)}</span>
                                  {isSentByUser && (
                                    <CheckCircle 
                                      className={`h-3 w-3 ml-1 ${
                                        message.isRead ? 'text-white' : 'text-primary-50'
                                      }`} 
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
                
                <CardFooter className="p-4 border-t">
                  {selectedAttachment && (
                    <div className="mb-3 border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-start">
                        {selectedAttachment.type.startsWith('image/') ? (
                          <div className="w-14 h-14 relative overflow-hidden rounded bg-white border flex-shrink-0 mr-3">
                            <img 
                              src={URL.createObjectURL(selectedAttachment)} 
                              alt="Предпросмотр" 
                              className="object-cover w-full h-full"
                            />
                          </div>
                        ) : selectedAttachment.type.startsWith('video/') ? (
                          <div className="w-14 h-14 flex items-center justify-center bg-gray-200 rounded flex-shrink-0 mr-3 relative">
                            <video className="h-6 w-6 text-gray-600" />
                            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] px-1 rounded">
                              MP4
                            </div>
                          </div>
                        ) : (
                          <div className="w-14 h-14 flex items-center justify-center bg-gray-100 rounded flex-shrink-0 mr-3 relative border">
                            <FileIcon className="h-6 w-6 text-gray-500" />
                            <div className="absolute bottom-1 right-1 bg-gray-200 text-gray-700 text-[8px] px-1 rounded">
                              {selectedAttachment.name.split('.').pop()?.toUpperCase() || 'FILE'}
                            </div>
                          </div>
                        )}
                        <div className="flex flex-col flex-grow min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                              {selectedAttachment.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelAttachment}
                              className="h-6 w-6 p-0 ml-1"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center mt-1">
                            <span className="text-xs text-gray-500">
                              {(selectedAttachment.size / 1024 < 1024) 
                                ? `${(selectedAttachment.size / 1024).toFixed(1)} КБ` 
                                : `${(selectedAttachment.size / 1024 / 1024).toFixed(2)} МБ`}
                            </span>
                            <span className="mx-1.5 w-1 h-1 bg-gray-400 rounded-full inline-block"></span>
                            <span className="text-xs text-gray-500">
                              {selectedAttachment.type.split('/')[0]}
                            </span>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                            <div className="bg-primary h-1.5 rounded-full" style={{ width: '100%' }}></div>
                          </div>
                          <span className="text-xs text-gray-500 mt-0.5">Готов к отправке</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Form {...messageForm}>
                    <form 
                      onSubmit={messageForm.handleSubmit(onSubmitMessage)} 
                      className="flex gap-2 w-full"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="relative group">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={openFileDialog}
                          className="h-10 w-10 relative"
                        >
                          <PaperclipIcon className="h-4 w-4" />
                        </Button>
                        <div className="absolute bottom-full mb-2 left-0 bg-white shadow-md rounded-md p-2 hidden group-hover:block min-w-[250px] text-xs z-10">
                          <p className="font-medium mb-1">Поддерживаемые типы файлов:</p>
                          <ul className="space-y-1">
                            <li className="flex items-center"><Image className="h-3 w-3 mr-1" />Изображения (jpg, png, gif, jpeg)</li>
                            <li className="flex items-center"><video className="h-3 w-3 mr-1" />Видео (mp4, avi, mov, mkv)</li>
                            <li className="flex items-center"><FileIcon className="h-3 w-3 mr-1" />Документы (pdf, doc, docx, xls, xlsx, txt)</li>
                          </ul>
                        </div>
                      </div>
                      <FormField
                        control={messageForm.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem className="flex-grow">
                            <FormControl>
                              <Textarea 
                                placeholder="Введите сообщение..." 
                                className="resize-none min-h-[60px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="self-end" 
                        disabled={sendMessageMutation.isPending}
                      >
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Отправить</span>
                      </Button>
                    </form>
                  </Form>
                </CardFooter>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessagesSquare className="h-12 w-12 mb-4" />
                <p>Выберите чат слева или создайте новый</p>
                <Button 
                  variant="outline" 
                  onClick={() => setIsNewChatDialogOpen(true)}
                  className="mt-4"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Создать чат
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
      
      {/* Диалог создания нового чата */}
      <Dialog open={isNewChatDialogOpen} onOpenChange={setIsNewChatDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Создать новый чат</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="private">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value={ChatTypeEnum.PRIVATE}>Личный чат</TabsTrigger>
              <TabsTrigger value={ChatTypeEnum.GROUP}>Групповой чат</TabsTrigger>
            </TabsList>
            
            <Form {...newChatForm}>
              <form onSubmit={newChatForm.handleSubmit(onSubmitNewChat)}>
                <TabsContent value={ChatTypeEnum.PRIVATE} className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <FormField
                      control={newChatForm.control}
                      name="participantIds"
                      render={() => (
                        <FormItem>
                          <Select
                            onValueChange={(value) => {
                              const userId = parseInt(value);
                              newChatForm.setValue("participantIds", [userId]);
                              
                              // Для личного чата используем имя собеседника
                              const participant = chatUsers.find(u => u.id === userId);
                              if (participant) {
                                newChatForm.setValue("name", `${participant.firstName} ${participant.lastName}`);
                              }
                              
                              // Устанавливаем тип чата как личный
                              newChatForm.setValue("type", ChatTypeEnum.PRIVATE);
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите собеседника" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {usersLoading ? (
                                <div className="flex justify-center items-center py-2">
                                  <Clock className="h-4 w-4 text-primary animate-spin" />
                                </div>
                              ) : (
                                chatUsers
                                  .filter(u => u.id !== user?.id)
                                  .map(u => (
                                    <SelectItem key={u.id} value={u.id.toString()}>
                                      {u.firstName} {u.lastName} ({u.role})
                                    </SelectItem>
                                  ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value={ChatTypeEnum.GROUP} className="space-y-4 mt-4">
                  <FormField
                    control={newChatForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Название группового чата" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Выберите участников</h4>
                    <div className="border rounded-md p-2 max-h-60 overflow-y-auto space-y-2">
                      {usersLoading ? (
                        <div className="flex justify-center items-center py-2">
                          <Clock className="h-4 w-4 text-primary animate-spin" />
                        </div>
                      ) : (
                        chatUsers
                          .filter(u => u.id !== user?.id)
                          .map(u => {
                            const id = u.id.toString();
                            return (
                              <div key={id} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`user-${id}`}
                                  checked={newChatForm.getValues().participantIds.includes(u.id)}
                                  onCheckedChange={(checked) => {
                                    const currentParticipants = newChatForm.getValues().participantIds;
                                    if (checked) {
                                      newChatForm.setValue("participantIds", [...currentParticipants, u.id]);
                                    } else {
                                      newChatForm.setValue(
                                        "participantIds", 
                                        currentParticipants.filter(pid => pid !== u.id)
                                      );
                                    }
                                    
                                    // Устанавливаем тип чата как групповой
                                    newChatForm.setValue("type", ChatTypeEnum.GROUP);
                                  }}
                                />
                                <label 
                                  htmlFor={`user-${id}`}
                                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {u.firstName} {u.lastName}
                                  <span className="text-xs text-gray-500 ml-1">
                                    ({u.role === UserRoleEnum.TEACHER ? 'Учитель' : 
                                     u.role === UserRoleEnum.STUDENT ? 'Ученик' : 
                                     u.role === UserRoleEnum.PARENT ? 'Родитель' : 
                                     u.role})
                                  </span>
                                </label>
                              </div>
                            )
                          })
                      )}
                    </div>
                    {newChatForm.formState.errors.participantIds && (
                      <p className="text-sm font-medium text-destructive mt-1">
                        {newChatForm.formState.errors.participantIds.message}
                      </p>
                    )}
                    
                    {/* Показываем выбранных участников */}
                    {newChatForm.getValues().participantIds.length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-sm font-medium mb-1">Выбрано участников: {newChatForm.getValues().participantIds.length}</h4>
                        <div className="flex flex-wrap gap-1">
                          {newChatForm.getValues().participantIds.map(pid => {
                            const participant = chatUsers.find(u => u.id === pid);
                            if (!participant) return null;
                            
                            return (
                              <Badge key={pid} variant="secondary" className="flex items-center gap-1">
                                {participant.firstName} {participant.lastName}
                                <X 
                                  className="h-3 w-3 cursor-pointer" 
                                  onClick={() => {
                                    const currentParticipants = newChatForm.getValues().participantIds;
                                    newChatForm.setValue(
                                      "participantIds", 
                                      currentParticipants.filter(id => id !== pid)
                                    );
                                  }}
                                />
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <DialogFooter className="mt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsNewChatDialogOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createChatMutation.isPending}
                  >
                    {createChatMutation.isPending && (
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Создать чат
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </Tabs>
        </DialogContent>
      </Dialog>
      {/* Диалог со списком участников группового чата */}
      <Dialog open={isParticipantsDialogOpen} onOpenChange={setIsParticipantsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Участники чата</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {participantsLoading ? (
              <div className="flex justify-center items-center py-8">
                <Clock className="h-5 w-5 text-primary animate-spin" />
              </div>
            ) : chatParticipants.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Участники не найдены</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-auto pr-2">
                {chatParticipants.map(participant => (
                  <div 
                    key={participant.id}
                    className="flex items-center p-2 hover:bg-gray-50 rounded-md"
                  >
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarFallback className="bg-primary text-white">
                        {participant.firstName.charAt(0)}{participant.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {participant.firstName} {participant.lastName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {participant.username} • {participant.role}
                      </p>
                    </div>
                    {/* Отображаем метку создателя чата */}
                    {selectedChat && selectedChat.creatorId === participant.id && (
                      <Badge variant="outline" className="ml-2 bg-primary/10">
                        Создатель
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsParticipantsDialogOpen(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог редактирования чата */}
      <EditChatDialog
        isOpen={editChatDialogOpen}
        onClose={() => setEditChatDialogOpen(false)}
        onSubmit={(values) => updateChatMutation.mutate({ 
          chatId: chatToEdit?.id || 0, 
          name: values.name 
        })}
        defaultName={chatToEdit?.name || ''}
        isSubmitting={updateChatMutation.isPending}
      />
      
      {/* Диалог подтверждения удаления чата */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удаление чата</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить этот чат? Это действие невозможно отменить.
              Все сообщения также будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => chatToDelete && deleteChatMutation.mutate(chatToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteChatMutation.isPending}
            >
              {deleteChatMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Удаление...
                </>
              ) : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Диалог подтверждения выхода из чата */}
      <AlertDialog open={leaveAlertOpen} onOpenChange={setLeaveAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Выход из чата</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите выйти из этого чата? 
              Вы больше не будете получать сообщения и уведомления.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => chatToLeave && leaveChatMutation.mutate(chatToLeave.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={leaveChatMutation.isPending}
            >
              {leaveChatMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Выход...
                </>
              ) : "Выйти"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
