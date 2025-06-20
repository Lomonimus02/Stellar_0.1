import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useRoleCheck } from "@/hooks/use-role-check";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Check, Calendar, Settings } from "lucide-react";
import { GradingSystemEnum } from "@shared/schema";
import { Link } from "wouter";

export default function GradingSystems() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSchoolAdmin } = useRoleCheck();
  const [selectedSchool, setSelectedSchool] = useState<number | null>(null);
  
  // Тип для класса с системой оценивания
  interface ClassWithGradingSystem {
    id: number;
    name: string;
    schoolId: number;
    gradeLevel: number;
    academicYear: string;
    gradingSystem?: GradingSystemEnum;
  }

  // Загрузка списка школ (только для суперадминов)
  const {
    data: schools,
    isLoading: schoolsLoading
  } = useQuery({
    queryKey: ['/api/schools'],
    enabled: !!user && !isSchoolAdmin()
  });

  // Установка выбранной школы при инициализации
  useEffect(() => {
    if (isSchoolAdmin() && user?.schoolId) {
      // Для администратора школы автоматически выбираем его школу
      setSelectedSchool(user.schoolId);
    } else if (schools && schools.length > 0 && !selectedSchool) {
      // Для других ролей выбираем первую школу из списка
      setSelectedSchool(schools[0].id);
    }
  }, [schools, user, selectedSchool, isSchoolAdmin]);

  // Загрузка классов для выбранной школы
  const { 
    data: classes, 
    isLoading: classesLoading,
    refetch: refetchClasses
  } = useQuery({
    queryKey: ['/api/classes', selectedSchool],
    enabled: !!selectedSchool,
  });

  // Мутация для обновления системы оценивания
  const updateClassMutation = useMutation({
    mutationFn: async ({ classId, gradingSystem }: { classId: number, gradingSystem: GradingSystemEnum }) => {
      return apiRequest(`/api/classes/${classId}`, 'PATCH', { gradingSystem });
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Система оценивания обновлена",
        variant: "success"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось обновить систему оценивания: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Обработчик изменения системы оценивания для класса
  const handleGradingSystemChange = (classId: number, gradingSystem: GradingSystemEnum) => {
    updateClassMutation.mutate({ classId, gradingSystem });
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Управление
                </CardTitle>
                <CardDescription>
                  Настройте системы оценивания и учебные периоды для классов школы
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Link href="/academic-periods">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Учебные периоды
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Выбор школы - только для не-администраторов школы */}
              {!isSchoolAdmin() && (
                <>
                  {schoolsLoading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="animate-spin" size={20} />
                      <span>Загрузка списка школ...</span>
                    </div>
                  ) : schools && schools.length > 0 ? (
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium">Школа:</span>
                      <Select
                        value={selectedSchool?.toString() || ""}
                        onValueChange={(value) => setSelectedSchool(Number(value))}
                      >
                        <SelectTrigger className="w-72">
                          <SelectValue placeholder="Выберите школу" />
                        </SelectTrigger>
                        <SelectContent>
                          {schools.map((school: any) => (
                            <SelectItem key={school.id} value={school.id.toString()}>
                              {school.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>Нет доступных школ</div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Таблица классов и систем оценивания */}
        <Card>
          <CardHeader>
            <CardTitle>Классы и системы оценивания</CardTitle>
            <CardDescription>
              Выберите систему оценивания для каждого класса
            </CardDescription>
          </CardHeader>
          <CardContent>
            {classesLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="animate-spin" size={20} />
                <span>Загрузка классов...</span>
              </div>
            ) : classes && classes.length > 0 ? (
              <div className="rounded-md border">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Класс
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Учебный год
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Система оценивания
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Статус
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {classes.map((classItem: ClassWithGradingSystem) => (
                      <tr key={classItem.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {classItem.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {classItem.academicYear}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Select
                            value={classItem.gradingSystem || GradingSystemEnum.FIVE_POINT}
                            onValueChange={(value) => handleGradingSystemChange(classItem.id, value as GradingSystemEnum)}
                            disabled={updateClassMutation.isPending}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Выберите систему" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={GradingSystemEnum.FIVE_POINT}>
                                Пятибалльная
                              </SelectItem>
                              <SelectItem value={GradingSystemEnum.CUMULATIVE}>
                                Накопительная
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {updateClassMutation.isPending ? (
                            <Loader2 className="animate-spin text-primary" size={20} />
                          ) : (
                            <Check className="text-green-500" size={20} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4">
                {selectedSchool ? (
                  <p>В этой школе нет классов</p>
                ) : (
                  <p>Пожалуйста, выберите школу</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}