import { useState } from "react";
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
import { UserCard } from "./user-card";
import {
  Users,
  UserPlus,
  X,
  Search,
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
}

interface AddParticipantsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddParticipants: (userIds: number[]) => void;
  availableUsers: ChatUser[];
  currentParticipants: ChatUser[];
  currentUserId: number;
  isSubmitting: boolean;
}

export function AddParticipantsDialog({
  isOpen,
  onClose,
  onAddParticipants,
  availableUsers,
  currentParticipants,
  currentUserId,
  isSubmitting,
}: AddParticipantsDialogProps) {
  const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Фильтруем пользователей, которых можно добавить
  const usersToAdd = availableUsers.filter(user =>
    user.id !== currentUserId &&
    !currentParticipants.some(p => p.id === user.id) &&
    (user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleUserToggle = (user: ChatUser) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleAddParticipants = () => {
    if (selectedUsers.length > 0) {
      onAddParticipants(selectedUsers.map(u => u.id));
      setSelectedUsers([]);
      setSearchQuery("");
    }
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setSearchQuery("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] bg-white/95 backdrop-blur-xl border-0 shadow-2xl rounded-3xl">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Добавить участников
          </DialogTitle>
        </DialogHeader>

        {/* Поиск */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Поиск пользователей..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/80 border-gray-300/50 focus:border-primary/50 focus:ring-primary/20 rounded-xl"
          />
        </div>

        {/* Выбранные пользователи */}
        {selectedUsers.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Будут добавлены ({selectedUsers.length})
            </h4>
            <div className="flex flex-wrap gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
              {selectedUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />
                    <AvatarFallback className="text-xs bg-gray-200">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </span>
                  <button
                    onClick={() => handleUserToggle(user)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Список доступных пользователей */}
        <ScrollArea className="flex-1 max-h-[400px]">
          <div className="space-y-2">
            {usersToAdd.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Нет доступных пользователей для добавления</p>
              </div>
            ) : (
              usersToAdd.map(user => {
                const isSelected = selectedUsers.some(u => u.id === user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => handleUserToggle(user)}
                    className={`flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                      isSelected ? 'bg-primary/5 ring-2 ring-primary/20' : ''
                    }`}
                  >
                    <Avatar className="h-12 w-12 mr-3">
                      <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />
                      <AvatarFallback className="bg-gray-200 text-gray-700 font-semibold">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">Будет добавлен как пользователь</p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Кнопки действий */}
        <div className="flex gap-3 pt-4 border-t border-gray-200/50">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 rounded-xl"
          >
            Отмена
          </Button>
          <Button
            onClick={handleAddParticipants}
            disabled={selectedUsers.length === 0 || isSubmitting}
            className="flex-1 bg-primary hover:bg-primary/90 rounded-xl"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Добавление...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Добавить ({selectedUsers.length})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
