import React, { useState, useEffect } from 'react';
import { Search, X, Filter, Users, MessageCircle, Plus } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { UserCard } from './user-card';
import { AvatarUpload } from "@/components/ui/avatar-upload";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ChatTypeEnum } from "@shared/schema";
import { cn } from "@/lib/utils";

// Простые переводы ролей на русский язык
const getRoleLabel = (role: string): string => {
  const roleLabels: Record<string, string> = {
    'super_admin': 'Супер-администратор',
    'school_admin': 'Администратор школы',
    'teacher': 'Учитель',
    'student': 'Ученик',
    'parent': 'Родитель',
    'principal': 'Директор',
    'vice_principal': 'Завуч',
    'class_teacher': 'Классный руководитель',
  };
  return roleLabels[role] || role;
};

interface User {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  username?: string;
  avatarUrl?: string;
}

interface UserSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUserId: number;
  chatType: ChatTypeEnum;
  onCreateChat: (data: {
    type: ChatTypeEnum;
    participantIds: number[];
    name?: string;
    avatarUrl?: string | null;
  }) => void;
  isLoading?: boolean;
}

export function UserSelectionDialog({
  isOpen,
  onClose,
  users,
  currentUserId,
  chatType,
  onCreateChat,
  isLoading = false
}: UserSelectionDialogProps) {
  console.log('UserSelectionDialog render:', { isOpen, users: users?.length, currentUserId, chatType });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [groupChatName, setGroupChatName] = useState('');
  const [groupAvatarUrl, setGroupAvatarUrl] = useState<string | null>(null);
  
  // Проверяем, что users является массивом
  if (!Array.isArray(users)) {
    console.error('Users is not an array:', users);
    return null;
  }
  
  // Сбрасываем состояние при открытии/закрытии диалога
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedUsers([]);
      setSelectedRoles([]);
      setGroupChatName('');
    }
  }, [isOpen]);

  // Обработка выбора пользователя
  const handleUserSelect = (user: User) => {
    if (chatType === ChatTypeEnum.PRIVATE) {
      // Для личного чата сразу создаем чат
      // Логика проверки дублирования теперь обрабатывается на сервере
      onCreateChat({
        type: ChatTypeEnum.PRIVATE,
        participantIds: [user.id],
        name: `${user.firstName} ${user.lastName}`
      });
    } else {
      // Для группового чата добавляем/убираем из списка
      setSelectedUsers(prev => {
        const isSelected = prev.some(u => u.id === user.id);
        if (isSelected) {
          return prev.filter(u => u.id !== user.id);
        } else {
          return [...prev, user];
        }
      });
    }
  };

  // Фильтрация пользователей по поисковому запросу и выбранным ролям
  const filteredUsers = users.filter(user => {
    // Исключаем текущего пользователя
    if (user.id === currentUserId) return false;
    
    // Фильтр по поисковому запросу
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
                         fullName.includes(query) || 
                         (user.username && user.username.toLowerCase().includes(query));
    
    // Фильтр по выбранным ролям
    const matchesRole = selectedRoles.length === 0 || 
                       selectedRoles.includes(user.role);
    
    return matchesSearch && matchesRole;
  });

  // Создание группового чата
  const handleCreateGroupChat = () => {
    if (selectedUsers.length === 0) return;

    const chatName = groupChatName.trim() ||
                    `Групповой чат (${selectedUsers.length + 1} участников)`;

    onCreateChat({
      type: ChatTypeEnum.GROUP,
      participantIds: selectedUsers.map(u => u.id),
      name: chatName,
      avatarUrl: groupAvatarUrl
    });
  };

  // Удаление пользователя из выбранных
  const removeSelectedUser = (userId: number) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  // Получение уникальных ролей для фильтра
  const availableRoles = Array.from(new Set(users
    .filter(user => user.id !== currentUserId)
    .map(user => user.role)))
    .sort();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {chatType === ChatTypeEnum.PRIVATE ? (
              <>
                <MessageCircle className="h-5 w-5" />
                Выберите собеседника
              </>
            ) : (
              <>
                <Users className="h-5 w-5" />
                Создать групповой чат
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden">
          {/* Поиск и фильтры */}
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input 
                placeholder="Поиск пользователей..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* Фильтр по ролям */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Роли
                  {selectedRoles.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {selectedRoles.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-semibold">Фильтр по ролям</div>
                {availableRoles.map(role => {
                  const label = getRoleLabel(role);
                  
                  return (
                    <DropdownMenuCheckboxItem
                      key={role}
                      checked={selectedRoles.includes(role)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRoles([...selectedRoles, role]);
                        } else {
                          setSelectedRoles(selectedRoles.filter(r => r !== role));
                        }
                      }}
                    >
                      {label}
                    </DropdownMenuCheckboxItem>
                  );
                })}
                {selectedRoles.length > 0 && (
                  <>
                    <div className="border-t my-1" />
                    <button
                      className="w-full px-2 py-1.5 text-sm text-left hover:bg-gray-100 rounded"
                      onClick={() => setSelectedRoles([])}
                    >
                      Очистить фильтры
                    </button>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Выбранные пользователи для группового чата */}
          {chatType === ChatTypeEnum.GROUP && selectedUsers.length > 0 && (
            <div className="border rounded-md p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Выбранные участники ({selectedUsers.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <Badge 
                    key={user.id} 
                    variant="secondary" 
                    className="flex items-center gap-1"
                  >
                    {user.firstName} {user.lastName}
                    <button
                      onClick={() => removeSelectedUser(user.id)}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Список пользователей */}
          <div className="border rounded-md flex-1 overflow-hidden">
            <ScrollArea className="h-[300px] p-2">
              {filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-gray-500">
                  <p>Пользователи не найдены</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map(user => (
                    <UserCard 
                      key={user.id}
                      user={user}
                      isSelected={selectedUsers.some(u => u.id === user.id)}
                      onClick={() => handleUserSelect(user)}
                      showCheckmark={chatType === ChatTypeEnum.GROUP}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Футер для группового чата */}
        {chatType === ChatTypeEnum.GROUP && (
          <DialogFooter className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Аватарка группы</span>
                <AvatarUpload
                  value={groupAvatarUrl}
                  onChange={setGroupAvatarUrl}
                  fallback="👥"
                  size="md"
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Название группового чата (необязательно)"
                  value={groupChatName}
                  onChange={(e) => setGroupChatName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button
                onClick={handleCreateGroupChat}
                disabled={selectedUsers.length === 0 || isLoading}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Создать чат ({selectedUsers.length} участников)
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
