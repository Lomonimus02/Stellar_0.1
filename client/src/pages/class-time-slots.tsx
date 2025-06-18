import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useRoleCheck } from '@/hooks/use-role-check';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FiClock, FiEdit, FiTrash2, FiArrowLeft, FiCheck, FiRotateCcw } from 'react-icons/fi';
import { TimeSlot, ClassTimeSlot } from '@shared/schema';
import { MainLayout } from '@/components/layout/main-layout';

interface TimeSlotFormData {
  slotNumber: number;
  startTime: string;
  endTime: string;
}

const ClassTimeSlotsPage: React.FC = () => {
  const params = useParams<{ classId: string }>();
  const classId = parseInt(params.classId);
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isPrincipal } = useRoleCheck();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<TimeSlotFormData>({
    slotNumber: 0,
    startTime: '08:00',
    endTime: '08:45'
  });
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);

  // Получение информации о классе
  const { data: classData = {name: ""}, isLoading: isClassLoading } = useQuery({
    queryKey: ['/api/classes', classId],
    enabled: !isNaN(classId),
  });

  // Получение временных слотов по умолчанию
  const { data: defaultSlots = [], isLoading: isDefaultSlotsLoading } = useQuery<TimeSlot[]>({
    queryKey: ['/api/time-slots/defaults'],
  });

  // Получение временных слотов класса
  const { data: classTimeSlots = [], isLoading: isClassSlotsLoading } = useQuery<ClassTimeSlot[]>({
    queryKey: [`/api/class/${classId}/time-slots`],
    enabled: !isNaN(classId),
  });

  // Мутация для создания/обновления временного слота
  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: TimeSlotFormData) => {
      return apiRequest(`/api/class/${classId}/time-slots`, 'POST', {
        slotNumber: data.slotNumber,
        startTime: data.startTime,
        endTime: data.endTime
      });
    },
    onSuccess: () => {
      // Инвалидируем запросы к временным слотам (для обновления текущей страницы)
      queryClient.invalidateQueries({
        queryKey: [`/api/class/${classId}/time-slots`]
      });
      
      // Инвалидируем запросы к расписанию, чтобы обновить отображение в ScheduleDayCard
      queryClient.invalidateQueries({
        queryKey: ['/api/schedules']
      });
      
      setIsDialogOpen(false);
      toast({
        title: "Успешно",
        description: editingSlotId ? "Временной слот обновлен" : "Временной слот создан",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить временной слот",
        variant: "destructive",
      });
      console.error("Error saving time slot:", error);
    }
  });

  // Мутация для удаления временного слота
  const deleteMutation = useMutation({
    mutationFn: async (slotId: number) => {
      return apiRequest(`/api/class-time-slots/${slotId}`, 'DELETE');
    },
    onSuccess: () => {
      // Инвалидируем запросы к временным слотам (для обновления текущей страницы)
      queryClient.invalidateQueries({
        queryKey: [`/api/class/${classId}/time-slots`]
      });
      
      // Инвалидируем запросы к расписанию, чтобы обновить отображение в ScheduleDayCard
      queryClient.invalidateQueries({
        queryKey: ['/api/schedules']
      });
      
      toast({
        title: "Успешно",
        description: "Временной слот удален",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить временной слот",
        variant: "destructive",
      });
      console.error("Error deleting time slot:", error);
    }
  });

  // Мутация для сброса всех настроек
  const resetAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/class/${classId}/time-slots/reset`, 'POST');
    },
    onSuccess: () => {
      // Инвалидируем запросы к временным слотам (для обновления текущей страницы)
      queryClient.invalidateQueries({
        queryKey: [`/api/class/${classId}/time-slots`]
      });
      
      // Инвалидируем запросы к расписанию, чтобы обновить отображение в ScheduleDayCard
      queryClient.invalidateQueries({
        queryKey: ['/api/schedules']
      });
      
      toast({
        title: "Успешно",
        description: "Все настройки временных слотов сброшены",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось сбросить настройки",
        variant: "destructive",
      });
      console.error("Error resetting time slots:", error);
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openCreateDialog = (slotNumber: number) => {
    const defaultSlot = defaultSlots.find(slot => 
      slot.slotNumber === slotNumber);
    
    setFormData({
      slotNumber,
      startTime: defaultSlot?.startTime || '08:00',
      endTime: defaultSlot?.endTime || '08:45'
    });
    setEditingSlotId(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (slot: ClassTimeSlot) => {
    setFormData({
      slotNumber: slot.slotNumber,
      startTime: slot.startTime,
      endTime: slot.endTime
    });
    setEditingSlotId(slot.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrUpdateMutation.mutate(formData);
  };

  // Получение эффективного слота (настроенный для класса или по умолчанию)
  const getEffectiveSlot = (slotNumber: number) => {
    const classSlot = classTimeSlots.find(slot => slot.slotNumber === slotNumber);
    if (classSlot) return classSlot;
    
    return defaultSlots.find(slot => slot.slotNumber === slotNumber);
  };

  const isLoading = isClassLoading || isDefaultSlotsLoading || isClassSlotsLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
          <span className="ml-3 text-lg">Загрузка...</span>
        </div>
      </div>
    );
  }

  // Определяем, может ли пользователь редактировать
  const canEdit = !isPrincipal();

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Button 
              variant="outline" 
              onClick={() => navigate(`/schedule-class/${classId}`)}
              className="mb-2"
            >
              <FiArrowLeft className="mr-2" /> Вернуться к расписанию
            </Button>
            <h1 className="text-2xl font-bold">
              {canEdit ? "Настройка" : "Просмотр"} временных слотов для класса {classData?.name || ''}
            </h1>
            <p className="text-gray-600 mt-1">
              {canEdit 
                ? "Здесь вы можете настроить индивидуальные временные слоты для уроков этого класса." 
                : "Здесь отображаются настроенные временные слоты для уроков этого класса."}
            </p>
          </div>
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => {
                if (window.confirm("Вы уверены, что хотите сбросить все настройки?")) {
                  resetAllMutation.mutate();
                }
              }}
              className="flex items-center"
            >
              <FiRotateCcw className="mr-2" />
              Сбросить настройки
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Временные слоты для уроков</CardTitle>
            <CardDescription>
              Эти настройки будут применяться только к данному классу и переопределят стандартные временные интервалы.
              Если слот не настроен, будет использоваться время по умолчанию.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер урока</TableHead>
                  <TableHead>Время по умолчанию</TableHead>
                  <TableHead>Настроенное время</TableHead>
                  {canEdit && <TableHead>Действия</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {defaultSlots.map((defaultSlot) => {
                  const classSlot = classTimeSlots.find(cs => cs.slotNumber === defaultSlot.slotNumber);
                  return (
                    <TableRow key={defaultSlot.slotNumber}>
                      <TableCell className="font-medium">{defaultSlot.slotNumber} урок</TableCell>
                      <TableCell>
                        {defaultSlot.startTime} - {defaultSlot.endTime}
                      </TableCell>
                      <TableCell>
                        {classSlot ? (
                          <span className="text-primary-600 font-medium">
                            {classSlot.startTime} - {classSlot.endTime}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Используется время по умолчанию</span>
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          {classSlot ? (
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => openEditDialog(classSlot)}
                              >
                                <FiEdit size={16} />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  if (window.confirm("Удалить настройку для этого слота?")) {
                                    deleteMutation.mutate(classSlot.id);
                                  }
                                }}
                              >
                                <FiTrash2 size={16} />
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => openCreateDialog(defaultSlot.slotNumber)}
                            >
                              Настроить
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Диалог для создания или редактирования временного слота */}
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingSlotId ? "Редактирование временного слота" : "Настройка временного слота"}
                </DialogTitle>
                <DialogDescription>
                  Укажите время начала и окончания для урока #{formData.slotNumber}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Время начала</Label>
                      <Input
                        id="startTime"
                        name="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">Время окончания</Label>
                      <Input
                        id="endTime"
                        name="endTime"
                        type="time"
                        value={formData.endTime}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createOrUpdateMutation.isPending}>
                    {createOrUpdateMutation.isPending && (
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                    )}
                    {editingSlotId ? "Сохранить" : "Создать"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        <div className="mt-8">
          <Alert>
            <FiClock className="h-4 w-4" />
            <AlertTitle>Как это работает</AlertTitle>
            <AlertDescription>
              <p className="mt-2">
                При создании расписания для класса, преподаватели будут выбирать номер урока
                (например, "1 урок"), а система автоматически подставит настроенное для этого
                класса время начала и окончания.
              </p>
              <p className="mt-2">
                Если для класса не настроено индивидуальное время, будет использоваться
                стандартное расписание звонков.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </MainLayout>
  );
};

export default ClassTimeSlotsPage;