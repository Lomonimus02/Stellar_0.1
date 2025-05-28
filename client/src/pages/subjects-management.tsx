// client/src/pages/subjects-management.tsx
import { useState, useMemo, useCallback } from "react"; // Added useCallback
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useRoleCheck } from "@/hooks/use-role-check";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Subject, Subgroup, Class, InsertSubgroup, InsertSubject, School, Schedule } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Added Input import
import { Plus, BookOpen, Users, Loader2, Filter, ArrowLeft, Inbox, ListX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Added Tooltip components
import { SubjectSubgroupCard, SubjectSubgroupItem } from "@/components/subjects-management/subject-subgroup-card";
import { SubjectFormDialog } from "@/components/subjects-management/subject-form-dialog";
import { SubgroupFormDialog } from "@/components/subjects-management/subgroup-form-dialog";
import { ClassCard } from "@/components/subjects-management/class-card";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SubjectsManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSchoolAdmin, isAdmin } = useRoleCheck();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation(); // Получаем функцию навигации

  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [isSubgroupDialogOpen, setIsSubgroupDialogOpen] = useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<SubjectSubgroupItem | null>(null); // Для отслеживания выбранного предмета/подгруппы
  const [relatedClasses, setRelatedClasses] = useState<Class[]>([]); // Классы для выбранного элемента
  const [isLoadingRelatedClasses, setIsLoadingRelatedClasses] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SubjectSubgroupItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<SubjectSubgroupItem | null>(null);

  // --- School ID ---
  const schoolId = user?.schoolId || null;

  // --- Data Fetching Queries ---
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      // console.log("*** DEBUG: Fetching subjects with schoolId:", schoolId);
      const res = await apiRequest(`/api/subjects?schoolId=${schoolId}`);
      const data = await res.json();
      // console.log("*** DEBUG: Fetched subjects data:", data);
      return data;
    },
    enabled: !!schoolId && isAdmin(),
  });

  // Fetch subgroups for the school
  const { data: subgroups = [], isLoading: subgroupsLoading } = useQuery<Subgroup[]>({
    queryKey: ["/api/subgroups", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const res = await apiRequest(`/api/subgroups?schoolId=${schoolId}`);
      return res.json();
    },
    enabled: !!schoolId && isAdmin(),
  });

  // Fetch classes for the school
  const { data: classes = [], isLoading: classesLoading } = useQuery<Class[]>({
    queryKey: ["/api/classes", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const res = await apiRequest(`/api/classes?schoolId=${schoolId}`);
      return res.json();
    },
    enabled: !!schoolId && isAdmin(),
  });

  // Fetch schedules for the school (нужно для поиска связанных классов)
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules", { schoolId }],
    queryFn: async () => {
      if (!schoolId) return [];
      const res = await apiRequest(`/api/schedules?schoolId=${schoolId}`); // Предполагаем, что API поддерживает фильтр по schoolId
      return res.json();
    },
    enabled: !!schoolId && isAdmin(),
  });

  // --- Memoized Data ---
  const combinedItems = useMemo(() => {
    // console.log('Recalculating combinedItems. Subjects:', subjects, 'Subgroups:', subgroups);
    const items: SubjectSubgroupItem[] = [
      ...subjects,
      ...subgroups.map(sg => ({ ...sg, isSubgroup: true })),
    ];

    const filtered = selectedClassFilter === "all"
      ? items
      : items.filter(item => {
          if ('isSubgroup' in item) {
            return item.classId === parseInt(selectedClassFilter);
          }
          return true;
        });

    return filtered.sort((a, b) => {
      const aIsSubgroup = 'isSubgroup' in a;
      const bIsSubgroup = 'isSubgroup' in b;
      if (aIsSubgroup !== bIsSubgroup) return aIsSubgroup ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [subjects, subgroups, selectedClassFilter]);

  const isLoading = subjectsLoading || subgroupsLoading || classesLoading || schedulesLoading;

  // --- Mutation Operations ---
  const createSubjectMutation = useMutation({
    mutationFn: (data: Omit<InsertSubject, 'schoolId'> & { schoolId: number }) =>
      apiRequest('/api/subjects', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subjects', schoolId] });
      setIsSubjectDialogOpen(false);
      toast({ title: "Предмет успешно создан" });
    },
    onError: (error: any) => toast({ title: "Ошибка создания предмета", description: error.message, variant: "destructive" })
  });

  const createSubgroupMutation = useMutation({
    mutationFn: (data: Omit<InsertSubgroup, 'schoolId'> & { schoolId: number }) =>
      apiRequest('/api/subgroups', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subgroups', schoolId] });
      setIsSubgroupDialogOpen(false);
      toast({ title: "Подгруппа успешно создана" });
    },
    onError: (error: any) => toast({ title: "Ошибка создания подгруппы", description: error.message, variant: "destructive" })
  });

  const handleCreateSubject = (data: Omit<InsertSubject, 'schoolId'>) => {
    if (schoolId) {
      createSubjectMutation.mutate({ ...data, schoolId });
    } else {
      toast({ title: "Ошибка конфигурации", description: "Не удалось определить ID школы для создания предмета.", variant: "destructive" });
    }
  };

  const handleCreateSubgroup = (data: Omit<InsertSubgroup, 'schoolId'> & { studentIds?: number[] }) => {
    if (schoolId) {
      createSubgroupMutation.mutate({ ...data, schoolId });
    } else {
      toast({ title: "Ошибка конфигурации", description: "Не удалось определить ID школы для создания подгруппы.", variant: "destructive" });
    }
  };

  // --- Event Handlers ---
  const handleCardClick = useCallback(async (item: SubjectSubgroupItem) => {
    setIsLoadingRelatedClasses(true);
    setSelectedItem(item);
    setRelatedClasses([]); // Очищаем предыдущие классы

    const isSubgroup = 'isSubgroup' in item;
    let relatedScheduleIds: number[] = [];

    if (isSubgroup) {
      // Находим расписания для подгруппы
      relatedScheduleIds = schedules
        .filter(s => s.subgroupId === item.id)
        .map(s => s.classId);
    } else {
      // Находим расписания для предмета
      relatedScheduleIds = schedules
        .filter(s => s.subjectId === item.id)
        .map(s => s.classId);
    }

    const uniqueClassIds = [...new Set(relatedScheduleIds)];
    const relatedClassData = classes.filter(cls => uniqueClassIds.includes(cls.id));

    setRelatedClasses(relatedClassData);
    setIsLoadingRelatedClasses(false);
  }, [schedules, classes]); // Added dependencies: schedules, classes

  const handleClassCardClick = useCallback((classData: Class) => {
    if (!selectedItem) return;

    const isSubgroup = 'isSubgroup' in selectedItem;
    const subjectId = isSubgroup ? null : selectedItem.id; // Предмет ID или null для подгруппы
    const subgroupId = isSubgroup ? selectedItem.id : null; // Подгруппа ID или null для предмета

    // Если это подгруппа, нам нужен ID предмета, к которому она относится (через расписание)
    let finalSubjectId = subjectId;
    if (isSubgroup && subgroupId) {
      const scheduleWithSubgroup = schedules.find(s => s.subgroupId === subgroupId && s.classId === classData.id);
      if (scheduleWithSubgroup) {
        finalSubjectId = scheduleWithSubgroup.subjectId;
      } else {
        toast({ title: "Ошибка навигации", description: "Не удалось найти связанный предмет для этой подгруппы в расписании.", variant: "destructive" });
        return;
      }
    }

    if (finalSubjectId === null) {
      toast({ title: "Ошибка навигации", description: "Не удалось определить предмет для перехода к журналу.", variant: "destructive" });
      return;
    }

    // Формируем URL для перехода к журналу
    const url = `/class-grade-details/${classData.id}/${finalSubjectId}${subgroupId ? `/${subgroupId}` : ''}`;
    navigate(url);
  }, [selectedItem, schedules, navigate, toast]); // Added dependencies: selectedItem, schedules, navigate, toast

  const handleBackClick = useCallback(() => {
    setSelectedItem(null);
    setRelatedClasses([]);
  }, []);

  // --- Mutations (Delete, Edit - continued) ---
  const deleteSubjectMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/subjects/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subjects', schoolId] });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      toast({ title: "Предмет удалён" });
    },
    onError: (error: any) => toast({ title: "Ошибка удаления предмета", description: error.message, variant: "destructive" })
  });
  const deleteSubgroupMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/subgroups/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subgroups', schoolId] });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      toast({ title: "Подгруппа удалена" });
    },
    onError: (error: any) => toast({ title: "Ошибка удаления подгруппы", description: error.message, variant: "destructive" })
  });

  // --- МУТАЦИИ ДЛЯ РЕДАКТИРОВАНИЯ ---
  const editSubjectMutation = useMutation({
    mutationFn: async (data: { id: number, values: Partial<InsertSubject> }) => {
      // console.log("*** DEBUG: Starting subject edit mutation with data:", data);
      const result = await apiRequest(`/api/subjects/${data.id}`, 'PATCH', data.values);
      // console.log("*** DEBUG: PATCH request complete, result status:", result.status);
      await result.text();
      if (!result.ok) {
        throw new Error(await result.text() || `Failed to update subject ${data.id}`);
      }
      return result;
    },
    onSuccess: (data, variables) => {
      // console.log('*** DEBUG: Edit subject mutation succeeded for ID:', variables.id);
      queryClient.invalidateQueries({ queryKey: ['/api/subjects', schoolId] });
      setIsEditDialogOpen(false);
      setItemToEdit(null);
      toast({ title: "Предмет успешно обновлён" });
    },
    onError: (error: any, variables) => {
      // console.error(`*** DEBUG: Edit subject mutation error for ID ${variables.id}:`, error);
      toast({ title: "Ошибка обновления предмета", description: error.message, variant: "destructive" });
    }
  });
  const editSubgroupMutation = useMutation({
    mutationFn: async (data: { id: number, values: Partial<InsertSubgroup> }) => {
      // console.log("*** DEBUG: Starting subgroup edit mutation with data:", data);
      const result = await apiRequest(`/api/subgroups/${data.id}`, 'PATCH', data.values);
      // console.log("*** DEBUG: Subgroup PATCH request complete, result status:", result.status);
      await result.text();
      if (!result.ok) {
         throw new Error(await result.text() || `Failed to update subgroup ${data.id}`);
      }
      return result;
    },
    onSuccess: (data, variables) => {
      // console.log('*** DEBUG: Edit subgroup mutation succeeded for ID:', variables.id);
      // It will automatically refetch in the background.
      queryClient.invalidateQueries({ queryKey: ['/api/subgroups', schoolId] });
      setIsEditDialogOpen(false);
      setItemToEdit(null);
      toast({ title: "Подгруппа успешно обновлена" });
    },
    onError: (error: any, variables) => {
      // console.error(`*** DEBUG: Edit subgroup mutation error for ID ${variables.id}:`, error);
      toast({ title: "Ошибка обновления подгруппы", description: error.message, variant: "destructive" });
    }
  });

  // --- Dialog Control Handlers ---
  const openCreateSubjectDialog = useCallback(() => setIsSubjectDialogOpen(true), []);
  const closeCreateSubjectDialog = useCallback(() => setIsSubjectDialogOpen(false), []);
  const openCreateSubgroupDialog = useCallback(() => setIsSubgroupDialogOpen(true), []);
  const closeCreateSubgroupDialog = useCallback(() => setIsSubgroupDialogOpen(false), []);

  const openEditDialog = useCallback((item: SubjectSubgroupItem) => {
    setItemToEdit(item);
    setIsEditDialogOpen(true);
  }, []);
  const closeEditDialog = useCallback(() => {
    setIsEditDialogOpen(false);
    setItemToEdit(null);
  }, []);

  const openDeleteDialog = useCallback((item: SubjectSubgroupItem) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  }, []);
  const closeDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  }, []);


  // --- Render Logic ---
  return (
    <MainLayout> {/* Background is now globally set in MainLayout component */}
      <TooltipProvider delayDuration={300}>
        <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden"> {/* Added relative and overflow-hidden for positioning context */}
          
          {/* View: Related Classes for a Selected Item - This view will animate in from the right */}
          <div 
            className={`transition-all duration-300 ease-out 
                        ${selectedItem 
                          ? 'opacity-100 translate-x-0 scale-100 delay-100 pointer-events-auto' 
                          : 'opacity-0 translate-x-6 scale-95 pointer-events-none absolute top-0 left-0 w-full invisible'}`}
          >
            {selectedItem && ( // Conditional rendering to ensure data is present before trying to render
              <>
                <Button 
                  onClick={handleBackClick} 
                  className="mb-6 inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium bg-white/15 backdrop-filter backdrop-blur-lg text-slate-800 shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.45),inset_0_1px_2px_rgba(0,0,0,0.05),0_15px_30px_-8px_rgba(0,0,0,0.08),_0_8px_20px_-12px_rgba(0,0,0,0.05)] hover:bg-white/25 hover:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.55),inset_0_1px_2px_rgba(0,0,0,0.08),0_18px_35px_-8px_rgba(0,0,0,0.1),0_10px_25px_-12px_rgba(0,0,0,0.07)] hover:-translate-y-px active:scale-[0.98] active:bg-white/20 active:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3),inset_0_1px_3px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Назад к списку {/* Back to list */}
                </Button>
                <h1 className="text-3xl font-bold mb-2">
                  Классы для: {selectedItem.name}
                </h1>
                <p className="text-muted-foreground mb-6">
                  {'isSubgroup' in selectedItem ? `Подгруппа класса ${classes.find(c => c.id === selectedItem.classId)?.name}` : "Предмет"}
                </p>

                {isLoadingRelatedClasses ? (
                  <div className="flex flex-col justify-center items-center h-64 text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                    <p className="text-sm text-slate-600">Загрузка классов...</p>
                  </div>
                ) : relatedClasses.length === 0 ? (
                  <Card className="bg-white/30 backdrop-filter backdrop-blur-xl rounded-2xl shadow-lg border border-white/20">
                    <CardContent className="pt-10 pb-10 text-center bg-transparent">
                      <ListX className="h-16 w-16 text-slate-500 mx-auto mb-6" />
                      <p className="text-xl font-semibold text-slate-700">
                        Нет связанных классов
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
                        Для "{selectedItem.name}" ({'isSubgroup' in selectedItem ? 'подгруппы' : 'предмета'}) не найдено использующих его классов.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {relatedClasses.map((cls) => (
                      <Tooltip key={cls.id}>
                        <TooltipTrigger className="h-full w-full">
                          <ClassCard
                            classData={cls}
                            onClick={handleClassCardClick}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Перейти к журналу класса</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* View: Main List of Subjects and Subgroups - This view will animate in from the left (or be initial state) */}
          <div 
            className={`transition-all duration-300 ease-out 
                        ${!selectedItem 
                          ? 'opacity-100 translate-x-0 scale-100 delay-100 pointer-events-auto' 
                          : 'opacity-0 -translate-x-6 scale-95 pointer-events-none absolute top-0 left-0 w-full invisible'}`}
          >
            {/* This content is always rendered if selectedItem is null, or during its exit animation */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h1 className="text-3xl font-bold">Предметы и подгруппы</h1>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  onClick={openCreateSubjectDialog} 
                  className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium text-white bg-gradient-to-b from-[rgb(2,191,122)]/95 via-[rgb(2,191,122)]/90 to-[rgb(2,191,122)]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_0_0_1.5px_rgba(255,255,255,0.2),0_5px_15px_-3px_rgba(0,0,0,0.08),_0_8px_25px_-8px_rgba(0,0,0,0.07)] hover:from-[rgb(2,191,122)]/95 hover:via-[rgb(2,191,122)]/90 hover:to-[rgb(2,191,122)]/95 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_0_0_1.5px_rgba(255,255,255,0.3),0_6px_18px_-3px_rgba(0,0,0,0.1),0_10px_30px_-8px_rgba(0,0,0,0.09)] hover:-translate-y-px active:scale-[0.97] active:from-[rgb(2,191,122)]/95 active:via-[rgb(2,191,122)]/90 active:to-[rgb(2,191,122)]/95 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
                >
                  <Plus className="h-4 w-4 mr-2" /> Добавить предмет {/* Add Subject */}
                </Button>
                <Button 
                  onClick={openCreateSubgroupDialog} 
                  className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium text-white bg-gradient-to-b from-[rgb(2,191,122)]/95 via-[rgb(2,191,122)]/90 to-[rgb(2,191,122)]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_0_0_1.5px_rgba(255,255,255,0.2),0_5px_15px_-3px_rgba(0,0,0,0.08),_0_8px_25px_-8px_rgba(0,0,0,0.07)] hover:from-[rgb(2,191,122)]/95 hover:via-[rgb(2,191,122)]/90 hover:to-[rgb(2,191,122)]/95 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_0_0_1.5px_rgba(255,255,255,0.3),0_6px_18px_-3px_rgba(0,0,0,0.1),0_10px_30px_-8px_rgba(0,0,0,0.09)] hover:-translate-y-px active:scale-[0.97] active:from-[rgb(2,191,122)]/95 active:via-[rgb(2,191,122)]/90 active:to-[rgb(2,191,122)]/95 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
                >
                  <Plus className="h-4 w-4 mr-2" /> Добавить подгруппу {/* Add Subgroup */}
                </Button>
              </div>
            </div>

            <div className="mb-6">
              <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
                <SelectTrigger 
                  className="w-[250px] rounded-xl px-4 py-3 text-base font-medium bg-slate-100/20 backdrop-filter backdrop-blur-md border border-white/20 text-slate-900 placeholder:text-slate-500/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out [&>svg]:text-slate-700"
                >
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" /> {/* This icon might need color adjustment if text-muted-foreground is too light now */}
                  <SelectValue placeholder="Фильтр по классу" />
                </SelectTrigger>
                <SelectContent className="p-2 bg-slate-100/40 backdrop-filter backdrop-blur-xl rounded-2xl shadow-lg border border-white/20">
                  <SelectItem value="all" className="text-slate-800 relative flex w-full cursor-default select-none items-center rounded-md py-2.5 pl-8 pr-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[rgb(2,191,122)]/10 data-[highlighted]:text-accent-foreground focus:bg-[rgb(2,191,122)]/10 focus:text-accent-foreground">Все классы (для подгрупп)</SelectItem>
                  {classesLoading ? (
                    <SelectItem value="loading" disabled className="text-slate-800 relative flex w-full cursor-default select-none items-center rounded-md py-2.5 pl-8 pr-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[rgb(2,191,122)]/10 data-[highlighted]:text-accent-foreground focus:bg-[rgb(2,191,122)]/10 focus:text-accent-foreground">Загрузка классов...</SelectItem>
                  ) : (
                    classes.map((cls) => (
                      <SelectItem 
                        key={cls.id} 
                        value={cls.id.toString()}
                        className="text-slate-800 relative flex w-full cursor-default select-none items-center rounded-md py-2.5 pl-8 pr-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[rgb(2,191,122)]/10 data-[highlighted]:text-accent-foreground focus:bg-[rgb(2,191,122)]/10 focus:text-accent-foreground"
                      >
                        {cls.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-64">
                <Loader2 className="h-10 w-10 animate-spin text-[rgb(2,191,122)] mb-3" /> {/* Ensured primary color for spinner */}
                <p className="text-sm text-slate-600">Загрузка элементов...</p> {/* Ensured text color for new bg */}
              </div>
            ) : combinedItems.length === 0 ? (
              // Applying glassmorphism to empty state card for combined items
              <Card className="p-6 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20">
                <CardContent className="pt-6 pb-6 text-center bg-transparent"> {/* Adjusted padding to work with p-6 on Card */}
                  <Inbox className="h-16 w-16 text-slate-500 mx-auto mb-6" /> {/* Adjusted icon color & margin */}
                  <p className="text-xl font-semibold text-slate-700"> {/* Adjusted text style */}
                    {selectedClassFilter === "all"
                      ? "Пока нет предметов или подгрупп"
                      : "Нет подгрупп для этого класса"}
                  </p>
                  <p className="text-sm text-slate-500 mt-2"> {/* Adjusted text style & margin */}
                    {selectedClassFilter === "all"
                      ? "Попробуйте добавить новый предмет или подгруппу, чтобы начать."
                      : "Вы можете добавить подгруппу для этого класса или изменить фильтр."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"> {/* Increased gap */}
                {combinedItems.map((item) => (
                  <SubjectSubgroupCard
                    key={'isSubgroup' in item ? `subgroup-${item.id}` : `subject-${item.id}`}
                    item={item}
                    classes={classes}
                    subjects={subjects}
                    onClick={handleCardClick} // Already useCallback
                    onEdit={openEditDialog}    // useCallback
                    onDelete={openDeleteDialog}  // useCallback
                  />
                ))}
              </div>
            )}
          </div>
          {/* The extra closing bracket was here, now removed. */}
        </div>

        {/* --- Dialogs --- */}
        <SubjectFormDialog
          isOpen={isSubjectDialogOpen}
          onClose={closeCreateSubjectDialog} // useCallback
          onSubmit={handleCreateSubject}
          isLoading={createSubjectMutation.isPending}
        />
        <SubgroupFormDialog
          isOpen={isSubgroupDialogOpen}
          onClose={closeCreateSubgroupDialog} // useCallback
          onSubmit={handleCreateSubgroup}
          isLoading={createSubgroupMutation.isPending}
          classes={classes}
          subjects={subjects}
        />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={closeDeleteDialog}>
        <DialogContent className="p-6 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Удаление</DialogTitle> {/* Deletion */}
            <DialogDescription className="text-slate-600">
              Вы уверены, что хотите удалить {('isSubgroup' in (itemToDelete || {})) ? 'подгруппу' : 'предмет'} "{itemToDelete?.name}"? {/* Are you sure you want to delete... */}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6 pt-2"> {/* Increased gap and added padding top */}
            <Button 
              onClick={closeDeleteDialog}
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium bg-white/15 backdrop-filter backdrop-blur-lg text-slate-800 shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.45),inset_0_1px_2px_rgba(0,0,0,0.05),0_15px_30px_-8px_rgba(0,0,0,0.08),_0_8px_20px_-12px_rgba(0,0,0,0.05)] hover:bg-white/25 hover:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.55),inset_0_1px_2px_rgba(0,0,0,0.08),0_18px_35px_-8px_rgba(0,0,0,0.1),0_10px_25px_-12px_rgba(0,0,0,0.07)] hover:-translate-y-px active:scale-[0.98] active:bg-white/20 active:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3),inset_0_1px_3px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
            >
              Отмена
            </Button> {/* Cancel */}
            <Button
              onClick={() => {
                if (!itemToDelete) return;
                if ('isSubgroup' in itemToDelete) {
                  deleteSubgroupMutation.mutate(itemToDelete.id);
                } else {
                  deleteSubjectMutation.mutate(itemToDelete.id);
                }
              }}
              disabled={deleteSubjectMutation.isPending || deleteSubgroupMutation.isPending}
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium text-white bg-gradient-to-b from-red-500/95 via-red-600/90 to-red-700/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_0_0_1.5px_rgba(255,255,255,0.2),0_5px_15px_-3px_rgba(127,29,29,0.2),_0_8px_25px_-8px_rgba(127,29,29,0.15)] hover:from-red-400/95 hover:via-red-500/90 hover:to-red-600/95 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_0_0_1.5px_rgba(255,255,255,0.3),0_6px_18px_-3px_rgba(127,29,29,0.25),_0_10px_30px_-8px_rgba(127,29,29,0.2)] hover:-translate-y-px active:scale-[0.97] active:from-red-600/95 active:via-red-700/90 active:to-red-800/95 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
            >
              {deleteSubjectMutation.isPending || deleteSubgroupMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {deleteSubjectMutation.isPending || deleteSubgroupMutation.isPending ? "Удаление..." : "Удалить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования */}
      {/* Edit Subgroup Dialog - Always Mounted */}
      <SubgroupFormDialog
        isOpen={isEditDialogOpen && !!itemToEdit && 'isSubgroup' in itemToEdit}
        onClose={closeEditDialog}
        onSubmit={(values) => {
          if (!itemToEdit || !('isSubgroup' in itemToEdit)) return;
          const { name, description, classId, studentIds } = values;
          editSubgroupMutation.mutate({ 
            id: itemToEdit.id, 
            values: { name, description, classId: parseInt(classId), studentIds: studentIds?.map(Number) || [] } 
          });
        }}
        isLoading={editSubgroupMutation.isPending}
        classes={classes}
        subjects={subjects}
        defaultValues={itemToEdit && 'isSubgroup' in itemToEdit ? {
          name: itemToEdit.name,
          description: itemToEdit.description || "",
          classId: itemToEdit.classId?.toString() || "",
          studentIds: itemToEdit.studentIds ? itemToEdit.studentIds.map(String) : [],
          id: itemToEdit.id, // Pass ID for edit mode detection in dialog
        } : undefined}
      />
      {/* Edit Subject Dialog - Always Mounted */}
      <SubjectFormDialog
        isOpen={isEditDialogOpen && !!itemToEdit && !('isSubgroup' in itemToEdit)}
        onClose={closeEditDialog}
        onSubmit={(values) => {
          if (!itemToEdit || 'isSubgroup' in itemToEdit) return;
          editSubjectMutation.mutate({ 
            id: itemToEdit.id, 
            values: { name: values.name, description: values.description } 
          });
        }}
        isLoading={editSubjectMutation.isPending}
        defaultValues={itemToEdit && !('isSubgroup' in itemToEdit) ? {
          name: itemToEdit.name,
          description: itemToEdit.description || "",
          // id: itemToEdit.id // If SubjectFormDialog uses id for edit mode detection
        } : undefined}
      />
      </TooltipProvider> {/* Closed TooltipProvider */}
    </MainLayout>
  );
}