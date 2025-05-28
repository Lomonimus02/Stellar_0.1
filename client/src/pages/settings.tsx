import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { UserRoleEnum, User } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  User as UserIcon, 
  Bell, 
  Lock, 
  Mail, 
  Phone, 
  Shield, 
  CheckCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Schema for profile update
const profileFormSchema = z.object({
  firstName: z.string().min(1, "Имя обязательно"),
  lastName: z.string().min(1, "Фамилия обязательна"),
  email: z.string().email("Введите корректный email"),
  phone: z.string().optional(),
});

// Schema for password change
const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Текущий пароль обязателен"),
  newPassword: z.string().min(6, "Новый пароль должен содержать минимум 6 символов"),
  confirmPassword: z.string().min(1, "Подтвердите пароль"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

// Schema for notification settings
const notificationFormSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  newGrades: z.boolean(),
  newHomework: z.boolean(),
  absenceAlerts: z.boolean(),
  systemUpdates: z.boolean(),
});

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  
  // Profile form
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  });
  
  // Password form
  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Notification settings form
  const notificationForm = useForm<z.infer<typeof notificationFormSchema>>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      newGrades: true,
      newHomework: true,
      absenceAlerts: true,
      systemUpdates: false,
    },
  });
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileFormSchema>) => {
      if (!user) throw new Error("User not authenticated");
      
      const res = await apiRequest("PUT", `/api/users/${user.id}`, data);
      return res.json();
    },
    onSuccess: (updatedUser: User) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Профиль обновлен",
        description: "Ваши личные данные успешно обновлены",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить профиль",
        variant: "destructive",
      });
    },
  });
  
  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordFormSchema>) => {
      if (!user) throw new Error("User not authenticated");
      
      const res = await apiRequest("PUT", `/api/users/${user.id}`, {
        password: data.newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Пароль изменен",
        description: "Ваш пароль успешно изменен",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось изменить пароль",
        variant: "destructive",
      });
    },
  });
  
  // Save notification settings mutation
  const saveNotificationSettingsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof notificationFormSchema>) => {
      // This would normally call an API, but for now we just simulate success
      return new Promise<z.infer<typeof notificationFormSchema>>((resolve) => {
        setTimeout(() => resolve(data), 500);
      });
    },
    onSuccess: () => {
      toast({
        title: "Настройки сохранены",
        description: "Настройки уведомлений успешно сохранены",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить настройки",
        variant: "destructive",
      });
    },
  });
  
  // Update profile handler
  const onProfileSubmit = (values: z.infer<typeof profileFormSchema>) => {
    updateProfileMutation.mutate(values);
  };
  
  // Change password handler
  const onPasswordSubmit = (values: z.infer<typeof passwordFormSchema>) => {
    changePasswordMutation.mutate(values);
  };
  
  // Save notification settings handler
  const onNotificationSubmit = (values: z.infer<typeof notificationFormSchema>) => {
    saveNotificationSettingsMutation.mutate(values);
  };
  
  // Get role display name
  const getRoleName = (role: UserRoleEnum) => {
    const roleNames = {
      [UserRoleEnum.SUPER_ADMIN]: "Супер-администратор",
      [UserRoleEnum.SCHOOL_ADMIN]: "Администратор школы",
      [UserRoleEnum.TEACHER]: "Учитель",
      [UserRoleEnum.STUDENT]: "Ученик",
      [UserRoleEnum.PARENT]: "Родитель",
      [UserRoleEnum.PRINCIPAL]: "Директор",
      [UserRoleEnum.VICE_PRINCIPAL]: "Завуч"
    };
    
    return roleNames[role] || role;
  };
  
  if (!user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Необходимо авторизоваться</h2>
            <p className="text-gray-600">Пожалуйста, войдите в систему для доступа к настройкам</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-heading font-bold text-gray-800 mb-6">Настройки</h2>
        
        <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Профиль</TabsTrigger>
            <TabsTrigger value="password">Безопасность</TabsTrigger>
            <TabsTrigger value="notifications">Уведомления</TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Личная информация</CardTitle>
                <CardDescription>
                  Обновите вашу личную информацию и контактные данные
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Имя</FormLabel>
                            <FormControl>
                              <Input placeholder="Имя" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Фамилия</FormLabel>
                            <FormControl>
                              <Input placeholder="Фамилия" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <UserIcon className="h-5 w-5 text-gray-500 mr-2" />
                        <span className="text-sm text-gray-500 font-medium">Логин: </span>
                        <span className="text-sm ml-2">{user.username}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <Shield className="h-5 w-5 text-gray-500 mr-2" />
                        <span className="text-sm text-gray-500 font-medium">Роль: </span>
                        <span className="text-sm ml-2">{getRoleName(user.role)}</span>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <Mail className="h-4 w-4 text-gray-500 mr-2" />
                                <Input placeholder="your-email@example.com" {...field} />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Этот email будет использоваться для уведомлений и восстановления пароля
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Телефон</FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <Phone className="h-4 w-4 text-gray-500 mr-2" />
                                <Input placeholder="+7 (___) ___-__-__" {...field} />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Номер телефона для SMS-уведомлений (необязательно)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full sm:w-auto"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Password Tab */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Пароль и безопасность</CardTitle>
                <CardDescription>
                  Измените ваш пароль и настройте параметры безопасности
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Текущий пароль</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Lock className="h-4 w-4 text-gray-500 mr-2" />
                              <Input type="password" placeholder="••••••••" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Новый пароль</FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <Lock className="h-4 w-4 text-gray-500 mr-2" />
                                <Input type="password" placeholder="••••••••" {...field} />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Минимум 6 символов
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Подтверждение пароля</FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <Lock className="h-4 w-4 text-gray-500 mr-2" />
                                <Input type="password" placeholder="••••••••" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full sm:w-auto"
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending ? 'Изменение пароля...' : 'Изменить пароль'}
                    </Button>
                  </form>
                </Form>
                
                <Separator className="my-8" />
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-lg mb-2">Двухфакторная аутентификация</h3>
                    <p className="text-gray-500 text-sm mb-4">
                      Улучшите безопасность вашего аккаунта с помощью двухфакторной аутентификации
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        window.open('/api/auth/2fa/setup', '_blank');
                      }}
                    >
                      Настроить 2FA
                    </Button>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-lg mb-2">История входов</h3>
                    <p className="text-gray-500 text-sm mb-4">
                      Просмотрите историю входов в вашу учетную запись
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        window.open('/api/auth/login-history', '_blank');
                      }}
                    >
                      Показать историю
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Настройки уведомлений</CardTitle>
                <CardDescription>
                  Выберите, о чем и как вы хотите получать уведомления
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-medium text-base">Каналы уведомлений</h3>
                      
                      <FormField
                        control={notificationForm.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Email уведомления</FormLabel>
                              <FormDescription>
                                Получать уведомления на email {user.email}
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={notificationForm.control}
                        name="pushNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Push-уведомления</FormLabel>
                              <FormDescription>
                                Получать push-уведомления в браузере
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={notificationForm.control}
                        name="smsNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">SMS-уведомления</FormLabel>
                              <FormDescription>
                                Получать уведомления по SMS
                                {!user.phone && " (необходимо указать номер телефона)"}
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={!user.phone}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h3 className="font-medium text-base">Типы уведомлений</h3>
                      
                      <FormField
                        control={notificationForm.control}
                        name="newGrades"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Новые оценки</FormLabel>
                              <FormDescription>
                                Уведомления о новых оценках
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={notificationForm.control}
                        name="newHomework"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Домашние задания</FormLabel>
                              <FormDescription>
                                Уведомления о новых домашних заданиях
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={notificationForm.control}
                        name="absenceAlerts"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Посещаемость</FormLabel>
                              <FormDescription>
                                Уведомления о пропусках занятий
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={notificationForm.control}
                        name="systemUpdates"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Обновления системы</FormLabel>
                              <FormDescription>
                                Уведомления об обновлениях и улучшениях системы
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full sm:w-auto"
                      disabled={saveNotificationSettingsMutation.isPending}
                    >
                      {saveNotificationSettingsMutation.isPending ? 'Сохранение...' : 'Сохранить настройки'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
