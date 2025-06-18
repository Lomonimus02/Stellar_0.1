// client/src/pages/class-details.tsx
import { useState, useMemo, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useRoleCheck } from "@/hooks/use-role-check";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Class, ClassWithStudentCount, User, UserRoleEnum, GradingSystemEnum } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  School, 
  Users, 
  UserPlus, 
  Search, 
  GraduationCap,
  Calendar,
  BookOpen,
  Loader2,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Edit3,
  Check,
  X
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function ClassDetailsPage() {
  const { classId } = useParams<{ classId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPrincipal, isVicePrincipal, isSchoolAdmin } = useRoleCheck();
  const queryClient = useQueryClient();

  // State
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditingGradingSystem, setIsEditingGradingSystem] = useState(false);
  const [selectedGradingSystem, setSelectedGradingSystem] = useState<GradingSystemEnum | null>(null);
  const [isAssignTeacherDialogOpen, setIsAssignTeacherDialogOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

  // Check access
  const hasAccess = isPrincipal() || isVicePrincipal() || isSchoolAdmin();
  
  if (!hasAccess) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Доступ запрещен</h1>
            <p className="text-gray-600">У вас нет прав для просмотра этой страницы.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Data fetching
  const { data: classData, isLoading: classLoading } = useQuery<ClassWithStudentCount>({
    queryKey: ["/api/classes", classId],
    queryFn: async () => {
      const res = await apiRequest(`/api/classes/${classId}`);
      return res.json();
    },
    enabled: !!classId,
  });

  // Get students for this class
  const { data: classStudents = [], isLoading: studentsLoading } = useQuery<User[]>({
    queryKey: ["/api/student-classes", classId],
    queryFn: async () => {
      const res = await apiRequest(`/api/student-classes?classId=${classId}`);
      return res.json();
    },
    enabled: !!classId,
  });



  // Get available students (not in any class)
  const { data: availableStudents = [] } = useQuery<User[]>({
    queryKey: ["/api/users", "students", classData?.schoolId],
    queryFn: async () => {
      if (!classData?.schoolId) return [];
      const res = await apiRequest(`/api/users`);
      const data = await res.json();
      return data.filter((student: User) => 
        student.activeRole === UserRoleEnum.STUDENT && 
        student.schoolId === classData.schoolId &&
        !student.classId
      );
    },
    enabled: !!classData?.schoolId && isAddStudentDialogOpen,
  });

  // Get available teachers for class teacher assignment
  const { data: availableTeachers = [] } = useQuery<User[]>({
    queryKey: ["/api/users", "teachers", classData?.schoolId],
    queryFn: async () => {
      if (!classData?.schoolId) return [];
      const res = await apiRequest(`/api/users`);
      const data = await res.json();
      return data.filter((user: User) =>
        (user.activeRole === UserRoleEnum.TEACHER || user.activeRole === UserRoleEnum.CLASS_TEACHER) &&
        user.schoolId === classData.schoolId
      );
    },
    enabled: !!classData?.schoolId && isAssignTeacherDialogOpen,
  });

  // Get current class teacher
  const { data: classTeacher } = useQuery<User | null>({
    queryKey: ['/api/class-teacher', classId],
    queryFn: async () => {
      if (!classId) return null;

      // Get all user roles and find the class teacher for this class
      const allUserRolesRes = await apiRequest('/api/user-roles');
      const allUserRoles = await allUserRolesRes.json();

      const classTeacherRole = allUserRoles.find((role: any) =>
        role.role === UserRoleEnum.CLASS_TEACHER && role.classId === parseInt(classId)
      );

      if (!classTeacherRole) return null;

      // Get the teacher user data
      const teacherRes = await apiRequest(`/api/users/${classTeacherRole.userId}`);
      return teacherRes.json();
    },
    enabled: !!classId,
  });

  // Filtered students based on search
  const filteredStudents = useMemo(() => {
    return classStudents.filter(student => {
      const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
      const username = (student.username || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      return fullName.includes(searchLower) || username.includes(searchLower);
    });
  }, [classStudents, searchTerm]);

  // Mutations
  const addStudentToClassMutation = useMutation({
    mutationFn: async ({ studentId, classId }: { studentId: number; classId: number }) => {
      const res = await apiRequest('/api/student-classes', 'POST', { studentId, classId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/student-classes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsAddStudentDialogOpen(false);
      setSelectedStudentId("");
      toast({ title: "Ученик успешно добавлен в класс" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка добавления ученика", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const removeStudentFromClassMutation = useMutation({
    mutationFn: async ({ studentId, classId }: { studentId: number; classId: number }) => {
      const res = await apiRequest(`/api/student-classes?studentId=${studentId}&classId=${classId}`, 'DELETE');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/student-classes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      toast({ title: "Ученик удален из класса" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка удаления ученика", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  // Mutation for updating grading system
  const updateGradingSystemMutation = useMutation({
    mutationFn: async ({ classId, gradingSystem }: { classId: number; gradingSystem: GradingSystemEnum }) => {
      const res = await apiRequest(`/api/classes/${classId}`, 'PATCH', { gradingSystem });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      setIsEditingGradingSystem(false);
      setSelectedGradingSystem(null);
      toast({
        title: "Система оценивания обновлена",
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка обновления системы оценивания",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation for assigning class teacher
  const assignClassTeacherMutation = useMutation({
    mutationFn: async ({ teacherId, classId }: { teacherId: number; classId: number }) => {
      try {
        console.log('=== assignClassTeacherMutation started ===');
        console.log('Mutation parameters:', { teacherId, classId });

        // Debug: Check current user first
        console.log('Checking current user...');
        // Временно отключаем проверку пользователя
        // await checkCurrentUser();

        // First, remove any existing class teacher role for this class
        console.log('Fetching all user roles...');
        let userRoles;
        try {
          // Используем обычный fetch вместо apiRequest для простоты
          const response = await fetch('/api/user-roles', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          console.log('Response status:', response.status);
          console.log('Response content-type:', response.headers.get('content-type'));

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText.substring(0, 100)}`);
          }

          const responseText = await response.text();
          console.log('Raw response:', responseText.substring(0, 200));

          try {
            userRoles = JSON.parse(responseText);
            console.log('Fetched user roles:', userRoles);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error(`Не удалось распарсить ответ сервера: ${parseError.message}`);
          }
        } catch (error) {
          console.error('Error fetching user roles:', error);
          throw new Error('Не удалось получить роли пользователей. Возможно, сессия истекла.');
        }

        const existingClassTeacherRole = userRoles.find((role: any) =>
          role.role === UserRoleEnum.CLASS_TEACHER && role.classId === classId
        );

        if (existingClassTeacherRole) {
          console.log('Removing existing class teacher role:', existingClassTeacherRole.id);
          const deleteResponse = await fetch(`/api/user-roles/${existingClassTeacherRole.id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (!deleteResponse.ok) {
            throw new Error(`Failed to delete existing role: ${deleteResponse.status}`);
          }
        }

        // Then assign the new class teacher role
        console.log('Creating new class teacher role:', { teacherId, classId, schoolId: classData?.schoolId });
        const createResponse = await fetch('/api/user-roles', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: teacherId,
            role: UserRoleEnum.CLASS_TEACHER,
            schoolId: classData?.schoolId,
            classId: classId
          })
        });

        if (!createResponse.ok) {
          throw new Error(`Failed to create class teacher role: ${createResponse.status}`);
        }

        return createResponse.json();
      } catch (error) {
        console.error('Error in assignClassTeacherMutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/class-teacher'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-roles'] });
      setIsAssignTeacherDialogOpen(false);
      setSelectedTeacherId("");
      toast({
        title: "Классный руководитель назначен",
        variant: "default"
      });
    },
    onError: (error: any) => {
      console.error('assignClassTeacherMutation error:', error);
      toast({
        title: "Ошибка назначения классного руководителя",
        description: error.message || "Неизвестная ошибка",
        variant: "destructive"
      });
    }
  });

  // Event handlers
  const handleAddStudent = useCallback(() => {
    if (!selectedStudentId || !classId) return;
    
    addStudentToClassMutation.mutate({
      studentId: parseInt(selectedStudentId),
      classId: parseInt(classId)
    });
  }, [selectedStudentId, classId, addStudentToClassMutation]);

  const handleRemoveStudent = useCallback((studentId: number) => {
    if (!classId) return;
    
    removeStudentFromClassMutation.mutate({
      studentId,
      classId: parseInt(classId)
    });
  }, [classId, removeStudentFromClassMutation]);

  const closeAddStudentDialog = useCallback(() => {
    setIsAddStudentDialogOpen(false);
    setSelectedStudentId("");
  }, []);

  const handleEditGradingSystem = useCallback(() => {
    setSelectedGradingSystem(classData?.gradingSystem || null);
    setIsEditingGradingSystem(true);
  }, [classData?.gradingSystem]);

  const handleSaveGradingSystem = useCallback(() => {
    if (!selectedGradingSystem || !classId) return;

    updateGradingSystemMutation.mutate({
      classId: parseInt(classId),
      gradingSystem: selectedGradingSystem
    });
  }, [selectedGradingSystem, classId, updateGradingSystemMutation]);

  const handleCancelEditGradingSystem = useCallback(() => {
    setIsEditingGradingSystem(false);
    setSelectedGradingSystem(null);
  }, []);

  const handleAssignTeacher = useCallback(() => {
    console.log('Opening assign teacher dialog');
    setIsAssignTeacherDialogOpen(true);
  }, []);

  const handleConfirmAssignTeacher = useCallback(() => {
    console.log('handleConfirmAssignTeacher called');
    console.log('Current state:', {
      selectedTeacherId,
      classId,
      classData: classData?.id,
      schoolId: classData?.schoolId
    });

    if (!selectedTeacherId || !classId) {
      console.error('Missing required data:', { selectedTeacherId, classId });
      return;
    }

    console.log('Starting class teacher assignment with data:', {
      teacherId: parseInt(selectedTeacherId),
      classId: parseInt(classId),
      schoolId: classData?.schoolId
    });

    try {
      assignClassTeacherMutation.mutate({
        teacherId: parseInt(selectedTeacherId),
        classId: parseInt(classId)
      });
    } catch (error) {
      console.error('Error calling mutation:', error);
    }
  }, [selectedTeacherId, classId, assignClassTeacherMutation, classData]);

  const handleCancelAssignTeacher = useCallback(() => {
    setIsAssignTeacherDialogOpen(false);
    setSelectedTeacherId("");
  }, []);

  // Debug function to check current user
  const checkCurrentUser = useCallback(async () => {
    try {
      const response = await apiRequest('/api/user');
      const userData = await response.json();
      console.log('Current user data:', userData);

      const rolesResponse = await apiRequest('/api/user-roles');
      const rolesData = await rolesResponse.json();
      console.log('All user roles:', rolesData);
    } catch (error) {
      console.error('Error checking user:', error);
    }
  }, []);

  if (classLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Загрузка класса...</span>
        </div>
      </MainLayout>
    );
  }

  if (!classData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Класс не найден</h1>
            <p className="text-gray-600 mb-4">Запрашиваемый класс не существует или был удален.</p>
            <Button onClick={() => navigate('/classes-management')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Вернуться к списку классов
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/classes-management')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад к классам
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <School className="h-8 w-8 text-blue-600" />
                {classData.name}
              </h1>
              <p className="text-gray-600">
                {classData.gradeLevel} класс • {classData.academicYear} • 
                Учеников: {classStudents.length}
              </p>
            </div>
            <Button
              onClick={() => setIsAddStudentDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Добавить ученика
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Class Information */}
          <div className="lg:col-span-1">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Информация о классе
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Название</label>
                  <p className="text-lg font-semibold">{classData.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Уровень</label>
                  <p className="text-lg">{classData.gradeLevel} класс</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Учебный год</label>
                  <p className="text-lg">{classData.academicYear}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-500">Система оценивания</label>
                    {!isEditingGradingSystem && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEditGradingSystem}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {isEditingGradingSystem ? (
                    <div className="mt-2 space-y-2">
                      <Select
                        value={selectedGradingSystem || ''}
                        onValueChange={(value) => setSelectedGradingSystem(value as GradingSystemEnum)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Выберите систему оценивания" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={GradingSystemEnum.FIVE_POINT}>5-балльная</SelectItem>
                          <SelectItem value={GradingSystemEnum.CUMULATIVE}>Накопительная</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveGradingSystem}
                          disabled={!selectedGradingSystem || updateGradingSystemMutation.isPending}
                          className="h-7"
                        >
                          {updateGradingSystemMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEditGradingSystem}
                          disabled={updateGradingSystemMutation.isPending}
                          className="h-7"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Badge variant="secondary" className="mt-1">
                      {classData.gradingSystem === 'five_point' ? '5-балльная' : 'Накопительная'}
                    </Badge>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Количество учеников</label>
                  <p className="text-lg font-semibold text-blue-600">{classStudents.length}</p>
                </div>
              </CardContent>
            </Card>

            {/* Class Teacher Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Классный руководитель
                </CardTitle>
              </CardHeader>
              <CardContent>
                {classTeacher ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-lg font-medium text-green-600">
                              {(classTeacher.firstName?.[0] || '?')}{(classTeacher.lastName?.[0] || '?')}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-medium text-gray-900">
                            {classTeacher.lastName} {classTeacher.firstName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {classTeacher.username}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAssignTeacher}
                      >
                        Изменить
                      </Button>
                    </div>
                    {classTeacher.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        {classTeacher.email}
                      </div>
                    )}
                    {classTeacher.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        {classTeacher.phone}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Классный руководитель не назначен</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={handleAssignTeacher}
                    >
                      Назначить руководителя
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Students List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Список учеников
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Поиск учеников..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {studentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Загрузка учеников...</span>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchTerm ? 'Ученики не найдены' : 'В классе нет учеников'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm 
                        ? 'Попробуйте изменить параметры поиска' 
                        : 'Добавьте учеников в этот класс'}
                    </p>
                    {!searchTerm && (
                      <Button
                        onClick={() => setIsAddStudentDialogOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        Добавить первого ученика
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredStudents.map((student, index) => (
                      <div key={student.id}>
                        <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600">
                                  {(student.firstName?.[0] || '?')}{(student.lastName?.[0] || '?')}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {student.lastName} {student.firstName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {student.username}
                              </p>
                              {student.email && (
                                <p className="text-xs text-gray-400">
                                  {student.email}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveStudent(student.id)}
                            disabled={removeStudentFromClassMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                        {index < filteredStudents.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Student Dialog */}
        <Dialog open={isAddStudentDialogOpen} onOpenChange={closeAddStudentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить ученика в класс</DialogTitle>
              <DialogDescription>
                Выберите ученика для добавления в класс {classData.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Выберите ученика:</label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите ученика" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStudents.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">
                        Нет доступных учеников
                      </div>
                    ) : (
                      availableStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id.toString()}>
                          {student.lastName} {student.firstName} ({student.username})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={closeAddStudentDialog}>
                  Отмена
                </Button>
                <Button
                  onClick={handleAddStudent}
                  disabled={!selectedStudentId || addStudentToClassMutation.isPending}
                >
                  {addStudentToClassMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Добавление...
                    </>
                  ) : (
                    "Добавить"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign Class Teacher Dialog */}
        <Dialog open={isAssignTeacherDialogOpen} onOpenChange={setIsAssignTeacherDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Назначить классного руководителя</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Выберите учителя</label>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Выберите учителя" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id.toString()}>
                        {teacher.lastName} {teacher.firstName} ({teacher.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={handleCancelAssignTeacher}
                disabled={assignClassTeacherMutation.isPending}
              >
                Отмена
              </Button>
              <Button
                onClick={() => {
                  console.log('Button clicked!');
                  console.log('selectedTeacherId:', selectedTeacherId);
                  console.log('isPending:', assignClassTeacherMutation.isPending);
                  handleConfirmAssignTeacher();
                }}
                disabled={!selectedTeacherId || assignClassTeacherMutation.isPending}
              >
                {assignClassTeacherMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Назначить
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
