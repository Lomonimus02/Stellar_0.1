import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Тип для уведомлений
interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type: "info" | "warning" | "success" | "error";
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();
  
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    select: (data) => data.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  });

  const unreadNotifications = notifications.filter(notification => !notification.isRead);
  const readNotifications = notifications.filter(notification => notification.isRead);

  // Мутация для отметки уведомления как прочитанного
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/notifications/${id}/read`, "PATCH");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Готово",
        description: "Уведомление отмечено как прочитанное",
        variant: "default",
      });
      // Обновляем данные после успешной отметки
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось отметить уведомление: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Мутация для отметки всех уведомлений как прочитанных
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/notifications/read-all", "PATCH");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Готово",
        description: "Все уведомления отмечены как прочитанные",
        variant: "default",
      });
      // Обновляем данные после успешной отметки
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось отметить все уведомления: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const getTypeIcon = (type: string) => {
    switch(type) {
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
      case "warning":
        return <Bell className="h-5 w-5 text-yellow-500" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <BellOff className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const handleMarkAllAsRead = () => {
    if (unreadNotifications.length > 0) {
      markAllAsReadMutation.mutate();
    }
  };

  const handleMarkAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };

  const renderNotification = (notification: Notification) => (
    <Card key={notification.id} className={`mb-3 ${!notification.isRead ? 'border-l-4 border-l-primary' : ''}`}>
      <CardHeader className="py-3 px-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {getTypeIcon(notification.type)}
            <CardTitle className="text-md font-medium">{notification.title}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {format(new Date(notification.createdAt), 'dd.MM.yyyy HH:mm')}
            </Badge>
            {!notification.isRead && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleMarkAsRead(notification.id)}
                className="h-7 w-7 p-0"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-2 px-4">
        <p className="text-sm text-muted-foreground">{notification.message}</p>
      </CardContent>
    </Card>
  );

  const renderNotificationList = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center p-8">
          <p>Загрузка уведомлений...</p>
        </div>
      );
    }

    if (activeTab === "all" && notifications.length === 0) {
      return (
        <div className="text-center p-8 text-muted-foreground">
          <Bell className="mx-auto h-12 w-12 mb-3 opacity-20" />
          <p>У вас нет уведомлений</p>
        </div>
      );
    }

    if (activeTab === "unread" && unreadNotifications.length === 0) {
      return (
        <div className="text-center p-8 text-muted-foreground">
          <CheckCircle className="mx-auto h-12 w-12 mb-3 opacity-20" />
          <p>У вас нет непрочитанных уведомлений</p>
        </div>
      );
    }

    if (activeTab === "read" && readNotifications.length === 0) {
      return (
        <div className="text-center p-8 text-muted-foreground">
          <BellOff className="mx-auto h-12 w-12 mb-3 opacity-20" />
          <p>У вас нет прочитанных уведомлений</p>
        </div>
      );
    }

    return (
      <>
        {activeTab === "all" && notifications.map(renderNotification)}
        {activeTab === "unread" && unreadNotifications.map(renderNotification)}
        {activeTab === "read" && readNotifications.map(renderNotification)}
      </>
    );
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Уведомления</h1>
          <div className="flex space-x-2">
            {unreadNotifications.length > 0 && (
              <Button 
                onClick={handleMarkAllAsRead} 
                variant="outline"
                disabled={markAllAsReadMutation.isPending}
              >
                {markAllAsReadMutation.isPending 
                  ? "Обработка..." 
                  : "Отметить все как прочитанные"
                }
              </Button>
            )}
            <Button 
              variant="outline"
              onClick={() => {
                window.location.href = '/settings';
                // После загрузки страницы настроек активируем вкладку "Уведомления"
                setTimeout(() => {
                  const notificationsTab = document.querySelector('[data-value="notifications"]') as HTMLElement;
                  if (notificationsTab) {
                    notificationsTab.click();
                  }
                }, 500);
              }}
            >
              Настройки уведомлений
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              Все <Badge className="ml-2" variant="secondary">{notifications.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="unread">
              Непрочитанные <Badge className="ml-2" variant="secondary">{unreadNotifications.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="read">
              Прочитанные <Badge className="ml-2" variant="secondary">{readNotifications.length}</Badge>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <div className="space-y-4">
              {renderNotificationList()}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}