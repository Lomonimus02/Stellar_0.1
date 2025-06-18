// client/src/pages/settings.tsx
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
  Settings2,
  Info,
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
import { Label } from "@/components/ui/label";
import { useSettings } from "@/contexts/SettingsContext";

// Schema for profile update
const profileFormSchema = z.object({
  firstName: z.string().min(1, "Имя обязательно"),
  lastName: z.string().min(1, "Фамилия обязательна"),
  email: z.string().email("Введите корректный email"),
  phone: z.string().optional(),
});

// Schema for password change
const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Текущий пароль обязателен"),
    newPassword: z
      .string()
      .min(6, "Новый пароль должен содержать минимум 6 символов"),
    confirmPassword: z.string().min(1, "Подтвердите пароль"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
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

  const { isRmbControlEnabled, setIsRmbControlEnabled } = useSettings();

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

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

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileFormSchema>) => {
      if (!user) throw new Error("User not authenticated");
      const res = await apiRequest(`/api/users/${user.id}`, "PATCH", data);
      return res.json();
    },
    onSuccess: (updatedUser: User) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Профиль обновлен",
        description: "Ваши личные данные успешно обновлены",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить профиль",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordFormSchema>) => {
      if (!user) throw new Error("User not authenticated");
      const res = await apiRequest(
        `/api/users/change-password`,
        "POST",
        { oldPassword: data.currentPassword, newPassword: data.newPassword }
      );
      return res.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Пароль изменен",
        description: "Ваш пароль успешно изменен",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось изменить пароль",
        variant: "destructive",
      });
    },
  });

  const saveNotificationSettingsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof notificationFormSchema>) => {
      return new Promise<z.infer<typeof notificationFormSchema>>((resolve) => {
        console.log("Simulating save notification settings:", data);
        setTimeout(() => resolve(data), 500);
      });
    },
    onSuccess: () => {
      toast({
        title: "Настройки сохранены",
        description: "Настройки уведомлений успешно сохранены",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить настройки",
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (values: z.infer<typeof profileFormSchema>) => {
    updateProfileMutation.mutate(values);
  };

  const onPasswordSubmit = (values: z.infer<typeof passwordFormSchema>) => {
    changePasswordMutation.mutate(values);
  };

  const onNotificationSubmit = (
    values: z.infer<typeof notificationFormSchema>
  ) => {
    saveNotificationSettingsMutation.mutate(values);
  };

  const getRoleName = (role: UserRoleEnum) => {
    const roleNames = {
      [UserRoleEnum.SUPER_ADMIN]: "Супер-администратор",
      [UserRoleEnum.SCHOOL_ADMIN]: "Администратор школы",
      [UserRoleEnum.TEACHER]: "Учитель",
      [UserRoleEnum.STUDENT]: "Ученик",
      [UserRoleEnum.PARENT]: "Родитель",
      [UserRoleEnum.PRINCIPAL]: "Директор",
      [UserRoleEnum.VICE_PRINCIPAL]: "Завуч",
    };
    return roleNames[role] || role;
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[calc(100vh-120px)]">
          <Card className="p-8 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20 text-center max-w-md w-full">
            <Info className="h-14 w-14 text-slate-500 mx-auto mb-5" />
            <CardTitle className="text-xl font-semibold text-slate-800 mb-2">
              Необходимо авторизоваться
            </CardTitle>
            <CardDescription className="text-sm text-slate-600">
              Пожалуйста, войдите в систему для доступа к настройкам.
            </CardDescription>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Tabs
          defaultValue="profile"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8">
            <h1 className="text-3xl font-bold text-slate-800 text-center sm:text-left">
              Настройки
            </h1>
            <TabsList className="inline-flex self-center sm:self-auto h-auto items-center justify-center rounded-full p-1 bg-slate-200/20 backdrop-filter backdrop-blur-md border border-white/20 shadow-sm">
              <TabsTrigger
                value="profile"
                className="relative px-5 py-2.5 text-sm font-medium text-slate-700 rounded-full hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-200/50 data-[state=active]:text-slate-900 data-[state=active]:font-semibold transition-colors duration-150"
              >
                {activeTab === 'profile' && <span className="absolute inset-0 z-0 rounded-full bg-white/50 backdrop-filter backdrop-blur-lg shadow-md"></span>}
                <span className="relative z-10 flex items-center"><UserIcon className="h-4 w-4 mr-2 opacity-80" />Профиль</span>
              </TabsTrigger>
              <TabsTrigger
                value="password"
                className="relative px-5 py-2.5 text-sm font-medium text-slate-700 rounded-full hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-200/50 data-[state=active]:text-slate-900 data-[state=active]:font-semibold transition-colors duration-150"
              >
                {activeTab === 'password' && <span className="absolute inset-0 z-0 rounded-full bg-white/50 backdrop-filter backdrop-blur-lg shadow-md"></span>}
                <span className="relative z-10 flex items-center"><Lock className="h-4 w-4 mr-2 opacity-80" />Безопасность</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="relative px-5 py-2.5 text-sm font-medium text-slate-700 rounded-full hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-200/50 data-[state=active]:text-slate-900 data-[state=active]:font-semibold transition-colors duration-150"
              >
                {activeTab === 'notifications' && <span className="absolute inset-0 z-0 rounded-full bg-white/50 backdrop-filter backdrop-blur-lg shadow-md"></span>}
                <span className="relative z-10 flex items-center"><Bell className="h-4 w-4 mr-2 opacity-80" />Уведомления</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="p-6 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20">
              <CardHeader className="p-0 pb-5">
                <CardTitle className="text-xl font-semibold text-slate-800">
                  Личная информация
                </CardTitle>
                <CardDescription className="text-sm text-slate-600 pt-1">
                  Обновите вашу личную информацию и контактные данные.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-3">
                <Form {...profileForm}>
                  <form
                    onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                    className="space-y-5"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField
                        control={profileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700 font-medium text-sm">Имя</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Имя"
                                {...field}
                                className="w-full rounded-xl px-4 py-3 text-base font-medium bg-slate-100/20 backdrop-filter backdrop-blur-md border border-white/20 text-slate-900 placeholder:text-slate-500/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
                              />
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
                            <FormLabel className="text-slate-700 font-medium text-sm">Фамилия</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Фамилия"
                                {...field}
                                className="w-full rounded-xl px-4 py-3 text-base font-medium bg-slate-100/20 backdrop-filter backdrop-blur-md border border-white/20 text-slate-900 placeholder:text-slate-500/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 text-slate-500 mr-2.5 flex-shrink-0" />
                        <span className="text-sm text-slate-600 font-medium w-20">Логин:</span>
                        <span className="text-sm text-slate-800 ml-2">{user.username}</span>
                      </div>
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 text-slate-500 mr-2.5 flex-shrink-0" />
                        <span className="text-sm text-slate-600 font-medium w-20">Роль:</span>
                        <span className="text-sm text-slate-800 ml-2">{getRoleName(user.role)}</span>
                      </div>
                    </div>

                    <Separator className="my-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent border-0" />

                    <div className="space-y-5">
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700 font-medium text-sm">Email</FormLabel>
                            <FormControl>
                              <div className="relative flex items-center">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500/90" />
                                <Input
                                  type="email"
                                  placeholder="your-email@example.com"
                                  {...field}
                                  className="w-full rounded-xl pl-10 pr-4 py-3 text-base font-medium bg-slate-100/20 backdrop-filter backdrop-blur-md border border-white/20 text-slate-900 placeholder:text-slate-500/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
                                />
                              </div>
                            </FormControl>
                            <FormDescription className="text-sm text-slate-500/90 pl-1 pt-1.5">
                              Этот email будет использоваться для уведомлений и восстановления пароля.
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
                            <FormLabel className="text-slate-700 font-medium text-sm">Телефон</FormLabel>
                            <FormControl>
                              <div className="relative flex items-center">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500/90" />
                                <Input
                                  placeholder="+7 (___) ___-__-__"
                                  {...field}
                                  className="w-full rounded-xl pl-10 pr-4 py-3 text-base font-medium bg-slate-100/20 backdrop-filter backdrop-blur-md border border-white/20 text-slate-900 placeholder:text-slate-500/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
                                />
                              </div>
                            </FormControl>
                            <FormDescription className="text-sm text-slate-500/90 pl-1 pt-1.5">
                              Номер телефона для SMS-уведомлений (необязательно).
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="pt-3">
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="min-w-[200px] inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium text-white bg-gradient-to-b from-[rgb(2,191,122)]/95 via-[rgb(2,191,122)]/90 to-[rgb(2,191,122)]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_0_0_1.5px_rgba(255,255,255,0.2),0_5px_15px_-3px_rgba(0,0,0,0.08),_0_8px_25px_-8px_rgba(0,0,0,0.07)] hover:from-[rgb(2,191,122)]/95 hover:via-[rgb(2,191,122)]/90 hover:to-[rgb(2,191,122)]/95 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_0_0_1.5px_rgba(255,255,255,0.3),0_6px_18px_-3px_rgba(0,0,0,0.1),0_10px_30px_-8px_rgba(0,0,0,0.09)] hover:-translate-y-px active:scale-[0.97] active:from-[rgb(2,191,122)]/95 active:via-[rgb(2,191,122)]/90 active:to-[rgb(2,191,122)]/95 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900/20 transition-all duration-200 ease-in-out"
                      >
                        {updateProfileMutation.isPending
                          ? "Сохранение..."
                          : "Сохранить изменения"}
                      </Button>
                    </div>
                  </form>
                </Form>

                <Separator className="my-5 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent border-0" />

                <div className="space-y-3.5">
                  <h3 className="text-base font-semibold text-slate-800">Настройки интерфейса</h3>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-2xl border border-white/20 p-4 bg-slate-100/10 backdrop-filter backdrop-blur-lg shadow-sm gap-4">
                    <div className="space-y-1 flex-grow">
                      <Label htmlFor="rbm-sidebar-toggle" className="text-sm font-medium text-slate-800 cursor-pointer">
                        Управление сайдбаром по ПКМ
                      </Label>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Включить/отключить открытие сайдбара правой кнопкой мыши.
                        При включении, сайдбар будет открываться по ПКМ (поверх контента), и будет доступна функция его закрепления.
                        При отключении, управление осуществляется только через иконку-бургер (с адаптацией контента), а закрепление недоступно.
                      </p>
                    </div>
                    <Switch
                      id="rbm-sidebar-toggle"
                      checked={isRmbControlEnabled}
                      onCheckedChange={setIsRmbControlEnabled}
                      aria-label="Toggle RMB sidebar control"
                      className="data-[state=checked]:bg-[rgb(2,191,122)] data-[state=unchecked]:bg-slate-500/30 shrink-0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password">
            <Card className="p-6 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20">
              <CardHeader className="p-0 pb-5">
                <CardTitle className="text-xl font-semibold text-slate-800">
                  Пароль и безопасность
                </CardTitle>
                <CardDescription className="text-sm text-slate-600 pt-1">
                  Измените ваш пароль и настройте параметры безопасности.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-3">
                <Form {...passwordForm}>
                  <form
                    onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                    className="space-y-5"
                  >
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 font-medium text-sm">Текущий пароль</FormLabel>
                          <FormControl>
                            <div className="relative flex items-center">
                              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500/90" />
                              <Input
                                type="password"
                                placeholder="••••••••"
                                {...field}
                                className="w-full rounded-xl pl-10 pr-4 py-3 text-base font-medium bg-slate-100/20 backdrop-filter backdrop-blur-md border border-white/20 text-slate-900 placeholder:text-slate-500/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700 font-medium text-sm">Новый пароль</FormLabel>
                            <FormControl>
                              <div className="relative flex items-center">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500/90" />
                                <Input
                                  type="password"
                                  placeholder="••••••••"
                                  {...field}
                                  className="w-full rounded-xl pl-10 pr-4 py-3 text-base font-medium bg-slate-100/20 backdrop-filter backdrop-blur-md border border-white/20 text-slate-900 placeholder:text-slate-500/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
                                />
                              </div>
                            </FormControl>
                            <FormDescription className="text-sm text-slate-500/90 pl-1 pt-1.5">
                              Минимум 6 символов.
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
                            <FormLabel className="text-slate-700 font-medium text-sm">Подтверждение пароля</FormLabel>
                            <FormControl>
                              <div className="relative flex items-center">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500/90" />
                                <Input
                                  type="password"
                                  placeholder="••••••••"
                                  {...field}
                                  className="w-full rounded-xl pl-10 pr-4 py-3 text-base font-medium bg-slate-100/20 backdrop-filter backdrop-blur-md border border-white/20 text-slate-900 placeholder:text-slate-500/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={changePasswordMutation.isPending}
                        className="min-w-[200px] inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium text-white bg-gradient-to-b from-[rgb(2,191,122)]/95 via-[rgb(2,191,122)]/90 to-[rgb(2,191,122)]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_0_0_1.5px_rgba(255,255,255,0.2),0_5px_15px_-3px_rgba(0,0,0,0.08),_0_8px_25px_-8px_rgba(0,0,0,0.07)] hover:from-[rgb(2,191,122)]/95 hover:via-[rgb(2,191,122)]/90 hover:to-[rgb(2,191,122)]/95 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_0_0_1.5px_rgba(255,255,255,0.3),0_6px_18px_-3px_rgba(0,0,0,0.1),0_10px_30px_-8px_rgba(0,0,0,0.09)] hover:-translate-y-px active:scale-[0.97] active:from-[rgb(2,191,122)]/95 active:via-[rgb(2,191,122)]/90 active:to-[rgb(2,191,122)]/95 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900/20 transition-all duration-200 ease-in-out"
                      >
                        {changePasswordMutation.isPending
                          ? "Изменение..."
                          : "Изменить пароль"}
                      </Button>
                    </div>
                  </form>
                </Form>

                <Separator className="my-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent border-0" />

                <div className="space-y-5">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 mb-2">
                      Двухфакторная аутентификация (2FA)
                    </h3>
                    <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                      Улучшите безопасность вашего аккаунта с помощью
                      двухфакторной аутентификации.
                    </p>
                    <Button
                      variant="outline"
                       onClick={() => {
                        window.open('/api/auth/2fa/setup', '_blank', 'noopener,noreferrer');
                        toast({ title: "Перенаправление", description: "Открывается страница настройки 2FA..." });
                      }}
                      className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium bg-white/15 backdrop-filter backdrop-blur-lg text-slate-800 shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.45),inset_0_1px_2px_rgba(0,0,0,0.05),0_15px_30px_-8px_rgba(0,0,0,0.08),_0_8px_20px_-12px_rgba(0,0,0,0.05)] hover:bg-white/25 hover:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.55),inset_0_1px_2px_rgba(0,0,0,0.08),0_18px_35px_-8px_rgba(0,0,0,0.1),0_10px_25px_-12px_rgba(0,0,0,0.07)] hover:-translate-y-px active:scale-[0.98] active:bg-white/20 active:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3),inset_0_1px_3px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900/20 transition-all duration-200 ease-in-out"
                    >
                      Настроить 2FA
                    </Button>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 mb-2">
                      История входов
                    </h3>
                    <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                      Просмотрите недавнюю историю входов в вашу учетную запись.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        toast({ title: "Функция в разработке", description: "Просмотр истории входов будет доступен позже." });
                      }}
                      className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium bg-white/15 backdrop-filter backdrop-blur-lg text-slate-800 shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.45),inset_0_1px_2px_rgba(0,0,0,0.05),0_15px_30px_-8px_rgba(0,0,0,0.08),_0_8px_20px_-12px_rgba(0,0,0,0.05)] hover:bg-white/25 hover:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.55),inset_0_1px_2px_rgba(0,0,0,0.08),0_18px_35px_-8px_rgba(0,0,0,0.1),0_10px_25px_-12px_rgba(0,0,0,0.07)] hover:-translate-y-px active:scale-[0.98] active:bg-white/20 active:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3),inset_0_1px_3px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900/20 transition-all duration-200 ease-in-out"
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
            <Card className="p-6 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20">
              <CardHeader className="p-0 pb-5">
                <CardTitle className="text-xl font-semibold text-slate-800">
                  Настройки уведомлений
                </CardTitle>
                <CardDescription className="text-sm text-slate-600 pt-1">
                  Выберите, о чем и как вы хотите получать уведомления.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-3">
                <Form {...notificationForm}>
                  <form
                    onSubmit={notificationForm.handleSubmit(
                      onNotificationSubmit
                    )}
                    className="space-y-5"
                  >
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-slate-800">
                        Каналы уведомлений
                      </h3>
                      {[
                        { name: "emailNotifications", label: "Email уведомления", description: `Получать уведомления на email ${user.email}` },
                        { name: "pushNotifications", label: "Push-уведомления", description: "Получать push-уведомления в браузере" },
                        { name: "smsNotifications", label: "SMS-уведомления", description: `Получать уведомления по SMS${!user.phone ? " (необходимо указать номер телефона)" : ""}`, disabled: !user.phone },
                      ].map(item => (
                        <FormField
                          key={item.name}
                          control={notificationForm.control}
                          name={item.name as keyof z.infer<typeof notificationFormSchema>}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-white/20 p-4 bg-slate-100/10 backdrop-filter backdrop-blur-lg shadow-sm gap-3">
                              <div className="space-y-0.5 flex-grow">
                                <FormLabel className="text-sm font-medium text-slate-800 cursor-pointer" htmlFor={item.name}>
                                  {item.label}
                                </FormLabel>
                                <FormDescription className="text-sm text-slate-600">
                                  {item.description}
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  id={item.name}
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={item.disabled}
                                  className="data-[state=checked]:bg-[rgb(2,191,122)] data-[state=unchecked]:bg-slate-500/30 shrink-0"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>

                    <Separator className="my-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent border-0" />

                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-slate-800">
                        Типы уведомлений
                      </h3>
                      {[
                        { name: "newGrades", label: "Новые оценки", description: "Уведомления о новых оценках" },
                        { name: "newHomework", label: "Домашние задания", description: "Уведомления о новых домашних заданиях" },
                        { name: "absenceAlerts", label: "Посещаемость", description: "Уведомления о пропусках занятий" },
                        { name: "systemUpdates", label: "Обновления системы", description: "Уведомления об обновлениях и улучшениях системы" },
                      ].map(item => (
                         <FormField
                          key={item.name}
                          control={notificationForm.control}
                          name={item.name as keyof z.infer<typeof notificationFormSchema>}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-white/20 p-4 bg-slate-100/10 backdrop-filter backdrop-blur-lg shadow-sm gap-3">
                              <div className="space-y-0.5 flex-grow">
                                <FormLabel className="text-sm font-medium text-slate-800 cursor-pointer" htmlFor={item.name}>
                                  {item.label}
                                </FormLabel>
                                <FormDescription className="text-sm text-slate-600">
                                  {item.description}
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  id={item.name}
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className="data-[state=checked]:bg-[rgb(2,191,122)] data-[state=unchecked]:bg-slate-500/30 shrink-0"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <div className="pt-3">
                      <Button
                        type="submit"
                        disabled={saveNotificationSettingsMutation.isPending}
                        className="min-w-[200px] inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium text-white bg-gradient-to-b from-[rgb(2,191,122)]/95 via-[rgb(2,191,122)]/90 to-[rgb(2,191,122)]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_0_0_1.5px_rgba(255,255,255,0.2),0_5px_15px_-3px_rgba(0,0,0,0.08),_0_8px_25px_-8px_rgba(0,0,0,0.07)] hover:from-[rgb(2,191,122)]/95 hover:via-[rgb(2,191,122)]/90 hover:to-[rgb(2,191,122)]/95 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_0_0_1.5px_rgba(255,255,255,0.3),0_6px_18px_-3px_rgba(0,0,0,0.1),0_10px_30px_-8px_rgba(0,0,0,0.09)] hover:-translate-y-px active:scale-[0.97] active:from-[rgb(2,191,122)]/95 active:via-[rgb(2,191,122)]/90 active:to-[rgb(2,191,122)]/95 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900/20 transition-all duration-200 ease-in-out"
                      >
                        {saveNotificationSettingsMutation.isPending
                          ? "Сохранение..."
                          : "Сохранить настройки"}
                      </Button>
                    </div>
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