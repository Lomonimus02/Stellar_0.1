import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface TimeSlot {
  id: number;
  slotNumber: number;
  startTime: string;
  endTime: string;
  isDefault?: boolean;
  schoolId?: number;
}

interface ClassTimeSlot {
  id: number;
  classId: number;
  slotNumber: number;
  startTime: string;
  endTime: string;
}

interface TimeSlotFormData {
  slotNumber: number;
  startTime: string;
  endTime: string;
}

interface TimeSlotsManagerProps {
  classId: number;
}

export const TimeSlotsManager: React.FC<TimeSlotsManagerProps> = ({ classId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<TimeSlotFormData>({
    slotNumber: 0,
    startTime: '08:00',
    endTime: '08:45'
  });
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);

  // Инициализация слотов по умолчанию
  const { data: defaultSlots = [] } = useQuery<TimeSlot[]>({
    queryKey: ['/api/time-slots/defaults'],
  });

  // Получение настроенных слотов для класса
  const { data: classTimeSlots = [], isLoading: isLoadingClassSlots } = useQuery<ClassTimeSlot[]>({
    queryKey: ['/api/class', classId, 'time-slots'],
    enabled: !!classId,
  });

  // Создание или обновление временного слота для класса
  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: TimeSlotFormData) => {
      return apiRequest(`/api/class/${classId}/time-slots`, 'POST', data);
    },
    onSuccess: (data) => {
      // Явно обновляем кэш запроса
      queryClient.invalidateQueries({
        queryKey: ['/api/class', classId, 'time-slots']
      });
      // Обновляем также стандартные слоты для обеспечения согласованности
      queryClient.invalidateQueries({
        queryKey: ['/api/time-slots/defaults']
      });
      setIsDialogOpen(false);
      toast({
        title: "Успешно",
        description: "Временной слот сохранен",
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

  // Удаление временного слота для класса
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/class-time-slots/${id}`, 'DELETE');
    },
    onSuccess: () => {
      // Явно обновляем кэш запроса
      queryClient.invalidateQueries({
        queryKey: ['/api/class', classId, 'time-slots']
      });
      // Обновляем также все связанные запросы для расписания
      queryClient.invalidateQueries({
        queryKey: ['/api/time-slots/defaults']
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

  // Сброс всех настроек временных слотов для класса
  const resetAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/class/${classId}/time-slots/reset`, 'POST');
    },
    onSuccess: () => {
      // Явно обновляем кэш запроса
      queryClient.invalidateQueries({
        queryKey: ['/api/class', classId, 'time-slots']
      });
      // Обновляем также все связанные запросы для расписания
      queryClient.invalidateQueries({
        queryKey: ['/api/time-slots/defaults']
      });
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
        description: "Не удалось сбросить настройки временных слотов",
        variant: "destructive",
      });
      console.error("Error resetting all time slots:", error);
    }
  });

  // Открытие диалога для редактирования слота
  const openEditDialog = (slot: ClassTimeSlot) => {
    setFormData({
      slotNumber: slot.slotNumber,
      startTime: slot.startTime,
      endTime: slot.endTime
    });
    setEditingSlotId(slot.id);
    setIsDialogOpen(true);
  };

  // Открытие диалога для создания нового слота
  const openCreateDialog = (slotNumber: number) => {
    // Находим слот по умолчанию для этого номера
    const defaultSlot = defaultSlots.find(slot => slot.slotNumber === slotNumber);
    
    setFormData({
      slotNumber,
      startTime: defaultSlot?.startTime || '08:00',
      endTime: defaultSlot?.endTime || '08:45'
    });
    setEditingSlotId(null);
    setIsDialogOpen(true);
  };

  // Обработка отправки формы
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Настройка временных слотов</CardTitle>
        <CardDescription>
          Настройте время начала и окончания уроков для этого класса.
          Вы можете изменить стандартные временные интервалы для каждого урока.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingClassSlots ? (
          <div className="flex justify-center my-4">Загрузка...</div>
        ) : (
          <>
            <Table>
              <TableCaption>Временные слоты для уроков</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер урока</TableHead>
                  <TableHead>Время начала</TableHead>
                  <TableHead>Время окончания</TableHead>
                  <TableHead>Тип настройки</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {defaultSlots.map((defaultSlot) => {
                  const effectiveSlot = getEffectiveSlot(defaultSlot.slotNumber);
                  const isCustomized = classTimeSlots.some(slot => slot.slotNumber === defaultSlot.slotNumber);
                  
                  return (
                    <TableRow key={defaultSlot.slotNumber}>
                      <TableCell className="font-medium">{defaultSlot.slotNumber} урок</TableCell>
                      <TableCell>{effectiveSlot?.startTime || defaultSlot.startTime}</TableCell>
                      <TableCell>{effectiveSlot?.endTime || defaultSlot.endTime}</TableCell>
                      <TableCell>
                        {isCustomized ? (
                          <span className="text-primary font-medium">Индивидуальный</span>
                        ) : (
                          <span className="text-muted-foreground">По умолчанию</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isCustomized ? (
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                const classSlot = classTimeSlots.find(slot => slot.slotNumber === defaultSlot.slotNumber);
                                if (classSlot) openEditDialog(classSlot);
                              }}
                            >
                              Изменить
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => {
                                const classSlot = classTimeSlots.find(slot => slot.slotNumber === defaultSlot.slotNumber);
                                if (classSlot) deleteMutation.mutate(classSlot.id);
                              }}
                            >
                              Сбросить
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => resetAllMutation.mutate()}>
          Сбросить все настройки
        </Button>
      </CardFooter>

      {/* Диалог для редактирования слота */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSlotId ? 'Изменение временного слота' : 'Создание временного слота'}
            </DialogTitle>
            <DialogDescription>
              Укажите время начала и окончания урока.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="slotNumber" className="text-right">
                  Номер урока
                </Label>
                <div className="col-span-3">
                  <Input
                    id="slotNumber"
                    value={formData.slotNumber}
                    onChange={(e) => setFormData({...formData, slotNumber: parseInt(e.target.value) || 0})}
                    disabled
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startTime" className="text-right">
                  Время начала
                </Label>
                <div className="col-span-3">
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endTime" className="text-right">
                  Время окончания
                </Label>
                <div className="col-span-3">
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit">Сохранить</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};