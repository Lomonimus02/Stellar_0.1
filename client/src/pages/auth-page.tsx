import { Redirect } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, { message: "Введите логин" }),
  password: z.string().min(1, { message: "Введите пароль" }),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  
  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  // Handle login form submission
  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate({
      username: values.username,
      password: values.password,
    });
  };

  // Redirect if user is already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full space-y-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Hero Section */}
        <div className="hidden md:flex flex-col justify-center p-8 bg-primary bg-opacity-10 rounded-lg">
          <div className="text-center">
            <span className="material-icons text-primary-dark text-6xl mb-4">school</span>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Электронный дневник</h1>
            <p className="text-lg text-gray-700 mb-6">
              Современная платформа для управления образовательным процессом.
              Удобный доступ к расписанию, оценкам, домашним заданиям и общению между учителями,
              учениками и родителями.
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <span className="material-icons text-primary-dark mb-2">assignment</span>
                <p className="text-sm font-medium text-gray-800">Домашние задания</p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <span className="material-icons text-primary-dark mb-2">event_note</span>
                <p className="text-sm font-medium text-gray-800">Расписание</p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <span className="material-icons text-primary-dark mb-2">grade</span>
                <p className="text-sm font-medium text-gray-800">Оценки</p>
              </div>
            </div>
          </div>
        </div>

        {/* Authentication Form */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <span className="material-icons text-primary-dark text-5xl">school</span>
            </div>
            <CardTitle className="text-2xl">Добро пожаловать</CardTitle>
            <CardDescription>
              Войдите в систему для доступа к платформе
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Логин</FormLabel>
                      <FormControl>
                        <Input placeholder="Введите логин" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Пароль</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Введите пароль" 
                            {...field} 
                          />
                        </FormControl>
                        <button 
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex items-center justify-between">
                  <FormField
                    control={loginForm.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="rememberMe" 
                          checked={field.value} 
                          onCheckedChange={field.onChange} 
                        />
                        <label
                          htmlFor="rememberMe"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Запомнить меня
                        </label>
                      </div>
                    )}
                  />
                  <a href="#" className="text-sm text-primary hover:text-primary-dark">
                    Забыли пароль?
                  </a>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <span className="flex items-center">
                      <span className="material-icons animate-spin mr-2 text-sm">refresh</span>
                      Вход...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <span className="material-icons text-sm mr-2">login</span>
                      Войти
                    </span>
                  )}
                </Button>
                
                <p className="text-xs text-center text-gray-500 mt-4">
                  У вас нет аккаунта? Для регистрации обратитесь к администратору
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
