import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { BellIcon, ChevronDownIcon, MessageSquare, MenuIcon } from "lucide-react";
import { Link } from "wouter";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Notification } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { ConnectionStatus } from "@/components/ui/connection-status";

interface HeaderProps {
  toggleSidebar: () => void;
}

interface NotificationCounts {
  notificationsUnreadCount: number;
  messagesUnreadCount: number;
  totalUnreadCount: number;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Получение списка всех уведомлений для показа в меню
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user
  });

  // Получение количества непрочитанных уведомлений и сообщений
  const { data: notificationCounts = { notificationsUnreadCount: 0, messagesUnreadCount: 0, totalUnreadCount: 0 } } = 
    useQuery<NotificationCounts>({
      queryKey: ["/api/notifications/count"],
      enabled: !!user
    });

  const unreadNotifications = notifications.filter(notification => !notification.isRead);
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const markNotificationAsRead = async (id: number) => {
    await apiRequest("POST", `/api/notifications/${id}/read`);
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
  };

  return (
    <header className="bg-slate-200/60 backdrop-blur-lg shadow-xl border-b border-slate-300/50 z-10">
      <div className="flex justify-between items-center px-4 py-3">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar} 
            className="mr-2 text-slate-600 p-1.5 hover:bg-black/10 rounded-full backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-slate-500/70"
          >
            <MenuIcon className="h-6 w-6" />
          </Button>
          <div className="flex items-center">
            <span className="material-icons text-slate-700 mr-2">school</span> 
            <h1 className="text-xl font-heading font-bold text-slate-800">Электронный дневник</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Индикатор состояния соединения */}
          <ConnectionStatus className="hidden md:flex" />
          
          {/* Иконка для сообщений с индикатором количества */}
          <Link href="/messages" className="relative group">
            <div className="rounded-full p-1.5 group-hover:bg-black/5 group-hover:backdrop-blur-sm transition-colors">
              <MessageSquare className="h-5 w-5 text-slate-600 group-hover:text-slate-900" />
            </div>
            {notificationCounts.messagesUnreadCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full text-xs">
                {notificationCounts.messagesUnreadCount > 9 ? "9+" : notificationCounts.messagesUnreadCount}
              </Badge>
            )}
          </Link>
          
          {/* Выпадающее меню уведомлений с индикатором количества */}
          <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <DropdownMenuTrigger className="relative focus:outline-none group">
              <div className="rounded-full p-1.5 group-hover:bg-black/5 group-hover:backdrop-blur-sm transition-colors">
                <BellIcon className="h-5 w-5 text-slate-600 group-hover:text-slate-900" />
              </div>
              {notificationCounts.notificationsUnreadCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full text-xs">
                  {notificationCounts.notificationsUnreadCount > 9 ? "9+" : notificationCounts.notificationsUnreadCount}
                </Badge>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              {/* Styling for DropdownMenuContent will be handled in dropdown-menu.tsx */}
              <DropdownMenuLabel className="text-slate-800">Уведомления</DropdownMenuLabel>
              <div className="max-h-[320px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-4 px-2 text-center text-slate-500 text-sm">
                    Нет новых уведомлений
                  </div>
                ) : (
                  notifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`px-4 py-3 hover:bg-slate-200/70 cursor-pointer ${!notification.isRead ? 'bg-primary/10' : ''}`} // Adjusted hover and unread bg
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <p className="text-sm font-medium text-slate-800">{notification.title}</p>
                      <p className="text-xs text-slate-600">{notification.content}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(notification.createdAt).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <DropdownMenuSeparator /> {/* Separator color will be handled in dropdown-menu.tsx */}
              <div className="px-4 py-2 text-center">
                <Link href="/notifications" className="text-sm text-primary hover:text-primary/80" onClick={() => setNotificationsOpen(false)}>Все уведомления</Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center focus:outline-none group hover:bg-black/5 backdrop-blur-sm rounded-lg px-2 py-1.5 transition-colors">
              <Avatar className="h-8 w-8 border-2 border-slate-400/50">
                <AvatarFallback className="bg-primary text-white"> 
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="ml-2 text-sm font-medium text-slate-700 hidden md:block">
                {user?.firstName} {user?.lastName}
              </span>
              <ChevronDownIcon className="h-4 w-4 text-slate-500 ml-1 group-hover:text-slate-800" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Styling for DropdownMenuContent and DropdownMenuItem will be handled in dropdown-menu.tsx */}
              <Link href="/settings">
                <DropdownMenuItem className="cursor-pointer">
                  <span className="material-icons text-sm mr-2">person</span> {/* Icons inside items will inherit text color */}
                  Профиль
                </DropdownMenuItem>
              </Link>
              <Link href="/settings">
                <DropdownMenuItem className="cursor-pointer">
                  <span className="material-icons text-sm mr-2">settings</span>
                  Настройки
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                <span className="material-icons text-sm mr-2">logout</span>
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
