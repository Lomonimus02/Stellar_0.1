import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useRoleCheck } from "@/hooks/use-role-check";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Calendar, Save, Plus, Trash2, ArrowLeft, Settings } from "lucide-react";
import { AcademicPeriodTypeEnum } from "@shared/schema";
import { Link } from "wouter";

interface ClassData {
  id: number;
  name: string;
  schoolId: number;
  gradeLevel: number;
  academicYear: string;
}

interface PeriodBoundary {
  periodKey: string;
  periodName: string;
  startDate: string;
  endDate: string;
  academicYear: string;
}

interface AcademicPeriodsData {
  periodType: AcademicPeriodTypeEnum;
  boundaries: PeriodBoundary[];
}

export default function AcademicPeriods() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSchoolAdmin } = useRoleCheck();
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [periodType, setPeriodType] = useState<AcademicPeriodTypeEnum>(AcademicPeriodTypeEnum.QUARTERS);
  const [boundaries, setBoundaries] = useState<PeriodBoundary[]>([]);

  // Загрузка списка классов
  const {
    data: classes,
    isLoading: classesLoading
  } = useQuery({
    queryKey: ['/api/classes'],
    enabled: !!user
  });

  // Загрузка настроек учебных периодов для выбранного класса
  const {
    data: academicPeriodsData,
    isLoading: periodsLoading,
    refetch: refetchPeriods
  } = useQuery({
    queryKey: [`/api/academic-periods/${selectedClass}`],
    enabled: !!selectedClass,
    select: (data): AcademicPeriodsData => data,
    staleTime: 0
  });

  // Мутация для обновления настроек учебных периодов
  const updatePeriodsMutation = useMutation({
    mutationFn: async (data: { periodType: AcademicPeriodTypeEnum; boundaries: PeriodBoundary[] }) => {
      if (!selectedClass) throw new Error("No class selected");

      return apiRequest(`/api/academic-periods/${selectedClass}`, 'PUT', data);
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Настройки учебных периодов обновлены"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/academic-periods/${selectedClass}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить настройки",
        variant: "destructive"
      });
    }
  });

  // Обновляем состояние при загрузке данных
  useEffect(() => {
    if (academicPeriodsData) {
      setPeriodType(academicPeriodsData.periodType);
      setBoundaries(academicPeriodsData.boundaries || []);
    }
  }, [academicPeriodsData]);

  // Генерация периодов по умолчанию на основе типа
  const generateDefaultPeriods = (type: AcademicPeriodTypeEnum, academicYear: string): PeriodBoundary[] => {
    const currentYear = parseInt(academicYear.split('-')[0]);
    
    switch (type) {
      case AcademicPeriodTypeEnum.QUARTERS:
        return [
          {
            periodKey: 'quarter1',
            periodName: '1 четверть',
            startDate: `${currentYear}-09-01`,
            endDate: `${currentYear}-10-31`,
            academicYear
          },
          {
            periodKey: 'quarter2',
            periodName: '2 четверть',
            startDate: `${currentYear}-11-01`,
            endDate: `${currentYear}-12-31`,
            academicYear
          },
          {
            periodKey: 'quarter3',
            periodName: '3 четверть',
            startDate: `${currentYear + 1}-01-01`,
            endDate: `${currentYear + 1}-03-31`,
            academicYear
          },
          {
            periodKey: 'quarter4',
            periodName: '4 четверть',
            startDate: `${currentYear + 1}-04-01`,
            endDate: `${currentYear + 1}-05-31`,
            academicYear
          }
        ];
      case AcademicPeriodTypeEnum.SEMESTERS:
        return [
          {
            periodKey: 'semester1',
            periodName: '1 полугодие',
            startDate: `${currentYear}-09-01`,
            endDate: `${currentYear}-12-31`,
            academicYear
          },
          {
            periodKey: 'semester2',
            periodName: '2 полугодие',
            startDate: `${currentYear + 1}-01-01`,
            endDate: `${currentYear + 1}-05-31`,
            academicYear
          }
        ];
      case AcademicPeriodTypeEnum.TRIMESTERS:
        return [
          {
            periodKey: 'trimester1',
            periodName: '1 триместр',
            startDate: `${currentYear}-09-01`,
            endDate: `${currentYear}-11-30`,
            academicYear
          },
          {
            periodKey: 'trimester2',
            periodName: '2 триместр',
            startDate: `${currentYear}-12-01`,
            endDate: `${currentYear + 1}-02-28`,
            academicYear
          },
          {
            periodKey: 'trimester3',
            periodName: '3 триместр',
            startDate: `${currentYear + 1}-03-01`,
            endDate: `${currentYear + 1}-05-31`,
            academicYear
          }
        ];
      default:
        return [];
    }
  };

  // Обработчик изменения типа периода
  const handlePeriodTypeChange = (newType: AcademicPeriodTypeEnum) => {
    setPeriodType(newType);
    
    if (selectedClass) {
      const selectedClassData = classes?.find((cls: ClassData) => cls.id === selectedClass);
      if (selectedClassData) {
        const defaultPeriods = generateDefaultPeriods(newType, selectedClassData.academicYear);
        setBoundaries(defaultPeriods);
      }
    }
  };

  // Обработчик изменения границ периода
  const handleBoundaryChange = (index: number, field: keyof PeriodBoundary, value: string) => {
    const newBoundaries = [...boundaries];
    newBoundaries[index] = { ...newBoundaries[index], [field]: value };
    setBoundaries(newBoundaries);
  };

  // Обработчик сохранения
  const handleSave = () => {
    updatePeriodsMutation.mutate({
      periodType,
      boundaries
    });
  };

  // Фильтрация классов для администратора школы
  const filteredClasses = classes?.filter((cls: ClassData) => {
    if (isSchoolAdmin()) {
      return cls.schoolId === user?.schoolId;
    }
    return true;
  }) || [];

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Учебные периоды
                </CardTitle>
                <CardDescription>
                  Настройте модели обучения и границы учебных периодов для классов
                </CardDescription>
              </div>
              <Link href="/grading-systems">
                <Button variant="outline" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Назад к управлению
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Выбор класса */}
              <div className="space-y-2">
                <Label htmlFor="class-select">Выберите класс</Label>
                {classesLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="animate-spin" size={20} />
                    <span>Загрузка классов...</span>
                  </div>
                ) : (
                  <Select
                    value={selectedClass?.toString() || ""}
                    onValueChange={(value) => setSelectedClass(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите класс" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredClasses.map((cls: ClassData) => (
                        <SelectItem key={cls.id} value={cls.id.toString()}>
                          {cls.name} ({cls.academicYear})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Настройки периодов */}
              {selectedClass && (
                <>
                  {periodsLoading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="animate-spin" size={20} />
                      <span>Загрузка настроек...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Выбор типа периода */}
                      <div className="space-y-2">
                        <Label htmlFor="period-type">Модель обучения</Label>
                        <Select
                          value={periodType}
                          onValueChange={handlePeriodTypeChange}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={AcademicPeriodTypeEnum.QUARTERS}>
                              По четвертям
                            </SelectItem>
                            <SelectItem value={AcademicPeriodTypeEnum.SEMESTERS}>
                              По полугодиям
                            </SelectItem>
                            <SelectItem value={AcademicPeriodTypeEnum.TRIMESTERS}>
                              По триместрам
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Границы периодов */}
                      <div className="space-y-4">
                        <Label>Границы учебных периодов</Label>
                        {boundaries.map((boundary, index) => (
                          <Card key={boundary.periodKey} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Название периода</Label>
                                <Input
                                  value={boundary.periodName}
                                  onChange={(e) => handleBoundaryChange(index, 'periodName', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Дата начала</Label>
                                <Input
                                  type="date"
                                  value={boundary.startDate}
                                  onChange={(e) => handleBoundaryChange(index, 'startDate', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Дата окончания</Label>
                                <Input
                                  type="date"
                                  value={boundary.endDate}
                                  onChange={(e) => handleBoundaryChange(index, 'endDate', e.target.value)}
                                />
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>

                      {/* Кнопка сохранения */}
                      <div className="flex justify-end">
                        <Button
                          onClick={handleSave}
                          disabled={updatePeriodsMutation.isPending}
                          className="flex items-center gap-2"
                        >
                          {updatePeriodsMutation.isPending ? (
                            <Loader2 className="animate-spin h-4 w-4" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Сохранить настройки
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
