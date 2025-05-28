import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { UserRoleEnum, Grade, Attendance, Class } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { 
  BarChart as BarChartIcon, 
  PieChart as PieChartIcon, 
  Calendar, 
  Users, 
  ArrowUpCircle,
  ArrowDownCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("month");
  
  // Define allowed roles for this page
  const allowedRoles = [
    UserRoleEnum.SUPER_ADMIN, 
    UserRoleEnum.SCHOOL_ADMIN, 
    UserRoleEnum.PRINCIPAL, 
    UserRoleEnum.VICE_PRINCIPAL
  ];

  // Check if user has permission to access this page
  const hasAccess = user && allowedRoles.includes(user.role);
  
  // Fetch grades
  const { data: grades = [], isLoading: gradesLoading } = useQuery<Grade[]>({
    queryKey: ["/api/grades"],
    enabled: !!user && hasAccess
  });
  
  // Fetch attendance
  const { data: attendance = [], isLoading: attendanceLoading } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance"],
    enabled: !!user && hasAccess
  });
  
  // Fetch classes
  const { data: classes = [], isLoading: classesLoading } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    enabled: !!user && hasAccess
  });
  
  // No access message for unauthorized users
  if (!hasAccess) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Доступ запрещен</h2>
            <p className="text-gray-600">У вас нет прав для просмотра этой страницы</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  // Loading state
  const isLoading = gradesLoading || attendanceLoading || classesLoading;
  
  // Filter data by class if a class is selected
  const filteredGrades = selectedClassId === "all" 
    ? grades 
    : grades.filter(g => g.classId === parseInt(selectedClassId));
  
  const filteredAttendance = selectedClassId === "all" 
    ? attendance 
    : attendance.filter(a => a.classId === parseInt(selectedClassId));
  
  // Calculate grade statistics
  const gradeDistribution = [
    { name: "Отлично (5)", value: filteredGrades.filter(g => g.grade === 5).length },
    { name: "Хорошо (4)", value: filteredGrades.filter(g => g.grade === 4).length },
    { name: "Удовл. (3)", value: filteredGrades.filter(g => g.grade === 3).length },
    { name: "Неудовл. (2)", value: filteredGrades.filter(g => g.grade === 2).length },
    { name: "Плохо (1)", value: filteredGrades.filter(g => g.grade === 1).length },
  ];
  
  // Calculate attendance statistics
  const attendanceDistribution = [
    { name: "Присутствовал", value: filteredAttendance.filter(a => a.status === "present").length },
    { name: "Отсутствовал", value: filteredAttendance.filter(a => a.status === "absent").length },
    { name: "Опоздал", value: filteredAttendance.filter(a => a.status === "late").length },
  ];
  
  // Calculate average grade
  const averageGrade = filteredGrades.length > 0 
    ? (filteredGrades.reduce((acc, g) => acc + g.grade, 0) / filteredGrades.length).toFixed(2)
    : "0.00";
  
  // Calculate attendance rate
  const attendanceRate = filteredAttendance.length > 0
    ? ((filteredAttendance.filter(a => a.status === "present").length / filteredAttendance.length) * 100).toFixed(2)
    : "0.00";
  
  // Prepare data for grade trend chart (mock data since we don't have real time-based data)
  const gradeTrendData = [
    { name: "Сен", average: 4.2 },
    { name: "Окт", average: 4.1 },
    { name: "Ноя", average: 3.9 },
    { name: "Дек", average: 4.3 },
    { name: "Янв", average: 4.5 },
    { name: "Фев", average: 4.2 },
    { name: "Мар", average: 4.4 },
    { name: "Апр", average: 4.6 },
    { name: "Май", average: 4.3 },
  ];
  
  // Prepare data for attendance trend chart (mock data since we don't have real time-based data)
  const attendanceTrendData = [
    { name: "Сен", rate: 95 },
    { name: "Окт", rate: 92 },
    { name: "Ноя", rate: 88 },
    { name: "Дек", rate: 91 },
    { name: "Янв", rate: 93 },
    { name: "Фев", rate: 90 },
    { name: "Мар", rate: 94 },
    { name: "Апр", rate: 96 },
    { name: "Май", rate: 92 },
  ];
  
  // Colors for pie charts
  const GRADE_COLORS = ['#4CAF50', '#8BC34A', '#FFEB3B', '#FF9800', '#F44336'];
  const ATTENDANCE_COLORS = ['#4CAF50', '#F44336', '#FFC107'];
  
  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-gray-800 mb-2 md:mb-0">Аналитика</h2>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={selectedClassId}
            onValueChange={setSelectedClassId}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Выберите класс" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все классы</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id.toString()}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={selectedPeriod}
            onValueChange={setSelectedPeriod}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Выберите период" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
              <SelectItem value="quarter">Квартал</SelectItem>
              <SelectItem value="year">Год</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center py-12">
          <BarChartIcon className="h-12 w-12 text-primary mx-auto animate-pulse" />
          <p className="mt-4 text-gray-500">Загрузка данных аналитики...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Средний балл</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end">
                  <div className="text-3xl font-bold text-gray-900">{averageGrade}</div>
                  <div className="ml-2 text-sm text-green-500 flex items-center">
                    <ArrowUpCircle className="h-4 w-4 mr-1" />
                    <span>+0.2</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">По сравнению с прошлым периодом</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Посещаемость</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end">
                  <div className="text-3xl font-bold text-gray-900">{attendanceRate}%</div>
                  <div className="ml-2 text-sm text-red-500 flex items-center">
                    <ArrowDownCircle className="h-4 w-4 mr-1" />
                    <span>-1.5%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">По сравнению с прошлым периодом</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Всего оценок</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end">
                  <div className="text-3xl font-bold text-gray-900">{filteredGrades.length}</div>
                  <div className="ml-2 text-sm text-green-500 flex items-center">
                    <ArrowUpCircle className="h-4 w-4 mr-1" />
                    <span>+18</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">По сравнению с прошлым периодом</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Кол-во учеников</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end">
                  <div className="text-3xl font-bold text-gray-900">124</div>
                  <div className="ml-2 text-sm text-green-500 flex items-center">
                    <ArrowUpCircle className="h-4 w-4 mr-1" />
                    <span>+2</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">По сравнению с прошлым периодом</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts Section */}
          <Tabs defaultValue="grades" className="mb-6">
            <TabsList>
              <TabsTrigger value="grades">Успеваемость</TabsTrigger>
              <TabsTrigger value="attendance">Посещаемость</TabsTrigger>
              <TabsTrigger value="activity">Активность</TabsTrigger>
            </TabsList>
            
            <TabsContent value="grades" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Динамика средних оценок</CardTitle>
                    <CardDescription>
                      Изменение средних оценок по месяцам
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gradeTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 5]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="average" name="Средний балл" fill="#4CAF50" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Распределение оценок</CardTitle>
                    <CardDescription>
                      Процентное соотношение оценок
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={gradeDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {gradeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={GRADE_COLORS[index % GRADE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Топ предметов по успеваемости</CardTitle>
                  <CardDescription>
                    Рейтинг предметов по среднему баллу
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Математика</span>
                        <span className="text-sm font-medium text-gray-700">4.8</span>
                      </div>
                      <Progress value={96} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Физика</span>
                        <span className="text-sm font-medium text-gray-700">4.5</span>
                      </div>
                      <Progress value={90} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Литература</span>
                        <span className="text-sm font-medium text-gray-700">4.3</span>
                      </div>
                      <Progress value={86} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Биология</span>
                        <span className="text-sm font-medium text-gray-700">4.2</span>
                      </div>
                      <Progress value={84} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">История</span>
                        <span className="text-sm font-medium text-gray-700">4.0</span>
                      </div>
                      <Progress value={80} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="attendance" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Динамика посещаемости</CardTitle>
                    <CardDescription>
                      Процент посещаемости по месяцам
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attendanceTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="rate" name="Посещаемость (%)" fill="#8BC34A" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Статус посещаемости</CardTitle>
                    <CardDescription>
                      Распределение по статусам
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={attendanceDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {attendanceDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={ATTENDANCE_COLORS[index % ATTENDANCE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Посещаемость по дням недели</CardTitle>
                  <CardDescription>
                    Процент посещаемости в разрезе дней недели
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Понедельник</span>
                        <span className="text-sm font-medium text-gray-700">92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Вторник</span>
                        <span className="text-sm font-medium text-gray-700">95%</span>
                      </div>
                      <Progress value={95} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Среда</span>
                        <span className="text-sm font-medium text-gray-700">89%</span>
                      </div>
                      <Progress value={89} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Четверг</span>
                        <span className="text-sm font-medium text-gray-700">91%</span>
                      </div>
                      <Progress value={91} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Пятница</span>
                        <span className="text-sm font-medium text-gray-700">87%</span>
                      </div>
                      <Progress value={87} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="activity" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Активность пользователей</CardTitle>
                    <CardDescription>
                      Количество входов в систему по ролям пользователей
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: "Ученики", logins: 420 },
                          { name: "Учителя", logins: 180 },
                          { name: "Родители", logins: 240 },
                          { name: "Админы", logins: 65 },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="logins" name="Количество входов" fill="#8BC34A" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Активность по времени</CardTitle>
                    <CardDescription>
                      Распределение активности по часам
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { hour: "8-10", activity: 120 },
                          { hour: "10-12", activity: 180 },
                          { hour: "12-14", activity: 220 },
                          { hour: "14-16", activity: 270 },
                          { hour: "16-18", activity: 310 },
                          { hour: "18-20", activity: 180 },
                          { hour: "20-22", activity: 120 },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="activity" name="Активность" fill="#4CAF50" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Заполнение домашних заданий</CardTitle>
                  <CardDescription>
                    Процент сдачи домашних заданий по классам
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">5A класс</span>
                        <span className="text-sm font-medium text-gray-700">87%</span>
                      </div>
                      <Progress value={87} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">6Б класс</span>
                        <span className="text-sm font-medium text-gray-700">92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">7А класс</span>
                        <span className="text-sm font-medium text-gray-700">78%</span>
                      </div>
                      <Progress value={78} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">8В класс</span>
                        <span className="text-sm font-medium text-gray-700">83%</span>
                      </div>
                      <Progress value={83} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">9А класс</span>
                        <span className="text-sm font-medium text-gray-700">89%</span>
                      </div>
                      <Progress value={89} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Reports Section */}
          <Card>
            <CardHeader>
              <CardTitle>Отчеты</CardTitle>
              <CardDescription>
                Сформируйте отчеты для анализа и печати
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto py-6 flex flex-col items-center justify-center"
                  onClick={() => {
                    window.open(`/api/reports/performance?classId=${selectedClassId}&period=${selectedPeriod}`, '_blank');
                  }}
                >
                  <BarChartIcon className="h-8 w-8 mb-2 text-primary" />
                  <span>Успеваемость</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto py-6 flex flex-col items-center justify-center"
                  onClick={() => {
                    window.open(`/api/reports/attendance?classId=${selectedClassId}&period=${selectedPeriod}`, '_blank');
                  }}
                >
                  <Calendar className="h-8 w-8 mb-2 text-primary" />
                  <span>Посещаемость</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto py-6 flex flex-col items-center justify-center"
                  onClick={() => {
                    window.open(`/api/reports/students?classId=${selectedClassId}`, '_blank');
                  }}
                >
                  <Users className="h-8 w-8 mb-2 text-primary" />
                  <span>Ученики</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto py-6 flex flex-col items-center justify-center"
                  onClick={() => {
                    window.open(`/api/reports/summary?classId=${selectedClassId}&period=${selectedPeriod}`, '_blank');
                  }}
                >
                  <PieChartIcon className="h-8 w-8 mb-2 text-primary" />
                  <span>Сводный отчет</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </MainLayout>
  );
}
