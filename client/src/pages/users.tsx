import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useRoleCheck } from "@/hooks/use-role-check";
import { UserRoleEnum, User, UserWithRoles, UserRoleModel, insertUserSchema, Class, ParentStudent } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Search, Filter, BookOpen, UsersIcon, UserIcon, UserPlusIcon, Loader2, Trash2, UserCog } from "lucide-react";
import UserRolesManager from "@/components/dashboard/user-roles-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  FormDescription
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils"; // Added cn import

// Extended user schema with validation for adding users
const userFormSchema = insertUserSchema.extend({
  username: z.string().min(3, "Логин должен содержать минимум 3 символа"),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
  firstName: z.string().min(1, "Имя обязательно"),
  lastName: z.string().min(1, "Фамилия обязательна"),
  email: z.string().email("Введите корректный email"),
  role: z.enum([
    UserRoleEnum.SUPER_ADMIN,
    UserRoleEnum.SCHOOL_ADMIN,
    UserRoleEnum.TEACHER,
    UserRoleEnum.STUDENT,
    UserRoleEnum.PARENT,
    UserRoleEnum.PRINCIPAL,
    UserRoleEnum.VICE_PRINCIPAL,
    UserRoleEnum.CLASS_TEACHER
  ]),
  confirmPassword: z.string().min(1, "Подтвердите пароль"),
  // Дополнительные поля для привязок
  classIds: z.array(z.number()).default([]),
  parentIds: z.array(z.number()).default([]),
  childIds: z.array(z.number()).default([]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

// Extended user schema with validation for editing users (password optional)
const editUserFormSchema = insertUserSchema.extend({
  username: z.string().min(3, "Логин должен содержать минимум 3 символа"),
  password: z.string().optional(),
  firstName: z.string().min(1, "Имя обязательно"),
  lastName: z.string().min(1, "Фамилия обязательна"),
  email: z.string().email("Введите корректный email"),
  role: z.enum([
    UserRoleEnum.SUPER_ADMIN,
    UserRoleEnum.SCHOOL_ADMIN,
    UserRoleEnum.TEACHER,
    UserRoleEnum.STUDENT,
    UserRoleEnum.PARENT,
    UserRoleEnum.PRINCIPAL,
    UserRoleEnum.VICE_PRINCIPAL,
    UserRoleEnum.CLASS_TEACHER
  ]),
  confirmPassword: z.string().optional(),
  // Дополнительные поля для привязок
  classIds: z.array(z.number()).default([]),
  parentIds: z.array(z.number()).default([]),
  childIds: z.array(z.number()).default([]),
}).refine((data) => {
  // Если пароль введен, то подтверждение пароля обязательно и должно совпадать
  if (data.password && data.password.length > 0) {
    if (!data.confirmPassword || data.confirmPassword.length === 0) {
      return false;
    }
    return data.password === data.confirmPassword;
  }
  // Если пароль не введен, то валидация проходит
  return true;
}, {
  message: "Пароли не совпадают или не заполнено подтверждение пароля",
  path: ["confirmPassword"],
}).refine((data) => {
  // Если пароль введен, он должен быть минимум 6 символов
  if (data.password && data.password.length > 0) {
    return data.password.length >= 6;
  }
  return true;
}, {
  message: "Пароль должен содержать минимум 6 символов",
  path: ["password"],
});

type UserFormData = z.infer<typeof userFormSchema>;
type EditUserFormData = z.infer<typeof editUserFormSchema>;

export default function UsersPage() {
  const { user } = useAuth();
  const { isAdmin, canEdit, isPrincipal } = useRoleCheck();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRoleEnum | "all">("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRolesDialogOpen, setIsRolesDialogOpen] = useState(false);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<UserWithRoles | null>(null);
  
  // Only Super admin, School admin and Principal can access this page
  if (!isAdmin()) {
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
  
  // Fetch users
  const { data: users = [], isLoading, error, refetch } = useQuery<UserWithRoles[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin(),
    retry: 1,
    // Use the error handler safely, TypeScript might complain but this works at runtime
    onError: (err: any) => {
      console.error("Ошибка загрузки пользователей:", err);
      toast({
        title: "Ошибка загрузки пользователей",
        description: err.message || "Не удалось загрузить список пользователей",
        variant: "destructive",
      });
    },
    // Add staleTime to prevent unnecessary refetches
    staleTime: 10 * 1000, // 10 seconds
    // Make sure data is refetched when tab regains focus
    refetchOnWindowFocus: true
  });
  
  // Fetch schools for dropdown
  const { isSuperAdmin, isSchoolAdmin } = useRoleCheck();
  const { data: schools = [] } = useQuery({
    queryKey: ["/api/schools"],
    enabled: isSuperAdmin()
  });
  
  // Filter users based on search query and role filter
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || userHasRole(u, roleFilter);

    // Hide current user from the table if they are a super admin
    const isCurrentUserSuperAdmin = isSuperAdmin();
    const isCurrentUser = user && u.id === user.id;
    const shouldHideCurrentUser = isCurrentUserSuperAdmin && isCurrentUser;

    return matchesSearch && matchesRole && !shouldHideCurrentUser;
  });
  
  // Form for adding users
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: UserRoleEnum.STUDENT,
      schoolId: null,
      classIds: [],
      parentIds: [],
      childIds: [],
    },
  });

  // Form for editing users
  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: UserRoleEnum.STUDENT,
      schoolId: null,
      classIds: [],
      parentIds: [],
      childIds: [],
    },
  });
  
  // Reset form when dialog closes
  const resetForm = () => {
    form.reset({
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: UserRoleEnum.STUDENT,
      schoolId: user?.schoolId || null,
      classIds: [],
      parentIds: [],
      childIds: [],
    });
  };

  // Reset edit form when dialog closes
  const resetEditForm = () => {
    editForm.reset({
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: UserRoleEnum.STUDENT,
      schoolId: user?.schoolId || null,
      classIds: [],
      parentIds: [],
      childIds: [],
    });
  };
  
  // Set form values when editing
  const setFormForEdit = (user: UserWithRoles) => {
    console.log("Начало редактирования пользователя:", user);

    // Загружаем классы для ученика при редактировании
    if (user.role === UserRoleEnum.STUDENT) {
      fetchStudentClassesForEdit(user.id);
    }

    // Загружаем связи родитель-ребенок при редактировании
    if (user.role === UserRoleEnum.PARENT) {
      fetchParentStudentsForEdit(user.id);
    } else if (user.role === UserRoleEnum.STUDENT) {
      fetchStudentParentsForEdit(user.id);
    }

    // Устанавливаем начальные значения для массивов
    const initialValues = {
      username: user.username,
      password: "", // Don't include password when editing
      confirmPassword: "",
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      schoolId: user.schoolId,
      classIds: [], // Будет заполнено после загрузки данных
      parentIds: [], // Будет заполнено после загрузки данных
      childIds: [], // Будет заполнено после загрузки данных
    };

    console.log("Устанавливаем начальные значения формы:", initialValues);
    editForm.reset(initialValues);
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
      [UserRoleEnum.VICE_PRINCIPAL]: "Завуч",
      [UserRoleEnum.CLASS_TEACHER]: "Классный руководитель"
    };

    return roleNames[role] || role;
  };

  // Check if user has a specific role
  const userHasRole = (user: UserWithRoles, role: UserRoleEnum) => {
    return user.roles?.some(ur => ur.role === role) || false;
  };

  // Check if current user can edit/delete another user
  const canEditOrDeleteUser = (targetUser: UserWithRoles) => {
    if (!user) return false;

    // Super admin can edit/delete anyone except themselves (already handled above)
    if (isSuperAdmin()) return true;

    // School admin cannot edit/delete themselves
    if (isSchoolAdmin() && user.id === targetUser.id) return false;

    // School admin can edit/delete other users
    return canEdit();
  };

  // Check if current user can manage roles for another user
  const canManageUserRoles = (targetUser: UserWithRoles) => {
    if (!user) return false;

    // Super admin can manage anyone's roles except themselves (already handled above)
    if (isSuperAdmin()) return true;

    // School admin can manage roles for themselves and other users in their school
    if (isSchoolAdmin()) return canEdit();

    return canEdit();
  };

  // Get user's primary role (first role or active role)
  const getUserPrimaryRole = (user: UserWithRoles): UserRoleEnum | null => {
    if (!user.roles || user.roles.length === 0) return null;

    // Try to find active role first
    if (user.activeRole) {
      const activeRoleExists = user.roles.some(ur => ur.role === user.activeRole);
      if (activeRoleExists) return user.activeRole;
    }

    // Return first role as fallback
    return user.roles[0].role;
  };

  // Get user roles display
  const getUserRolesDisplay = (userRoles: UserRoleModel[] | undefined) => {
    if (!userRoles || userRoles.length === 0) {
      return <span className="text-slate-500 italic">Нет ролей</span>;
    }

    if (userRoles.length === 1) {
      return <span className="text-slate-600">{getRoleName(userRoles[0].role)}</span>;
    }

    // Multiple roles - show them as a comma-separated list
    const roleNames = userRoles.map(ur => getRoleName(ur.role));
    return (
      <span className="text-slate-600" title={roleNames.join(', ')}>
        {roleNames.length > 2
          ? `${roleNames.slice(0, 2).join(', ')} +${roleNames.length - 2}`
          : roleNames.join(', ')
        }
      </span>
    );
  };
  
  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const { confirmPassword, ...userData } = data;
      const res = await apiRequest("/api/users", "POST", userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Пользователь добавлен",
        description: "Новый пользователь успешно зарегистрирован",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить пользователя",
        variant: "destructive",
      });
    },
  });
  
  // Edit user mutation
  const editUserMutation = useMutation({
    mutationFn: async (data: { id: number; user: Partial<EditUserFormData> }) => {
      const { confirmPassword, ...userData } = data.user;
      // Удаляем пустые поля пароля
      if (!userData.password || userData.password.trim() === "") {
        delete userData.password;
      }
      const res = await apiRequest(`/api/users/${data.id}`, "PUT", userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      resetEditForm();
      toast({
        title: "Пользователь обновлен",
        description: "Информация о пользователе успешно обновлена",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить информацию о пользователе",
        variant: "destructive",
      });
    },
  });
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/users/${id}`, "DELETE");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "Пользователь удален",
        description: "Пользователь был успешно удален из системы",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить пользователя",
        variant: "destructive",
      });
    },
  });
  
  const onSubmitAdd = (values: UserFormData) => {
    addUserMutation.mutate(values);
  };
  
  const onSubmitEdit = (values: EditUserFormData) => {
    if (selectedUser) {
      // Only include password if it was changed
      const userData = { ...values } as Partial<EditUserFormData>;
      if (!userData.password || userData.password.trim() === "") {
        userData.password = undefined; // Используем undefined вместо delete
      }

      // Добавляем более детальное логирование отправляемых данных
      console.log("Отправляемые данные пользователя:", userData);
      console.log("ClassIds (тип):", typeof userData.classIds, Array.isArray(userData.classIds));
      console.log("ClassIds (значение):", userData.classIds);

      // Проверяем содержимое данных формы перед отправкой
      const formValues = editForm.getValues();
      console.log("Значения формы перед отправкой:", formValues);
      console.log("Значение classIds в форме:", formValues.classIds);

      // Проверка - если это массив и он пуст, заменяем на []
      if (userData.classIds === undefined) {
        userData.classIds = [];
        console.log("ClassIds было undefined, установлено в []");
      }

      // Проверка - для поддержки обратной совместимости с classId
      if (userData.role === UserRoleEnum.STUDENT && Array.isArray(userData.classIds) && userData.classIds.length > 0) {
        console.log(`Устанавливаем classId=${userData.classIds[0]} для обратной совместимости`);
      }

      editUserMutation.mutate({
        id: selectedUser.id,
        user: userData,
      });
    }
  };
  
  const handleEdit = (user: UserWithRoles) => {
    setSelectedUser(user);
    setFormForEdit(user);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (user: UserWithRoles) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleManageRoles = (user: UserWithRoles) => {
    setSelectedUserForRoles(user);
    setIsRolesDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };
  
  // States for student-class management
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [searchStudentTerm, setSearchStudentTerm] = useState("");
  
  // States for parent-student management
  const [selectedParent, setSelectedParent] = useState<number | null>(null);
  const [searchParentTerm, setSearchParentTerm] = useState("");
  
  // Функции для загрузки данных при редактировании
  const fetchStudentClassesForEdit = async (studentId: number) => {
    try {
      console.log(`Загрузка классов для ученика ID=${studentId}`);
      const res = await fetch(`/api/student-classes?studentId=${studentId}`);
      if (!res.ok) throw new Error("Failed to fetch student classes");
      const studentClassConnections = await res.json();
      console.log(`Получены классы ученика:`, studentClassConnections);

      // Извлекаем идентификаторы классов из связей студент-класс
      // В каждой записи есть поле classId с идентификатором класса
      const classIds = studentClassConnections.map((connection: { classId: number }) => connection.classId);
      console.log(`Извлеченные classIds:`, classIds);

      // Фильтруем null или undefined значения
      const validClassIds = classIds.filter(id => id !== null && id !== undefined);
      console.log(`Отфильтрованные classIds:`, validClassIds);

      // Устанавливаем значение в форме редактирования
      editForm.setValue("classIds", validClassIds);

      // Проверяем, что значение действительно установлено
      console.log(`Текущее значение classIds в форме после установки:`, editForm.getValues("classIds"));
    } catch (error) {
      console.error("Error fetching student classes:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить классы ученика",
        variant: "destructive",
      });
    }
  };

  const fetchParentStudentsForEdit = async (parentId: number) => {
    try {
      const res = await fetch(`/api/parent-students?parentId=${parentId}`);
      if (!res.ok) throw new Error("Failed to fetch parent-student connections");
      const connections = await res.json();
      editForm.setValue("childIds", connections.map((c: ParentStudent) => c.studentId));
    } catch (error) {
      console.error("Error fetching parent-student connections:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить связи родитель-ученик",
        variant: "destructive",
      });
    }
  };

  const fetchStudentParentsForEdit = async (studentId: number) => {
    try {
      const res = await fetch(`/api/student-parents?studentId=${studentId}`);
      if (!res.ok) throw new Error("Failed to fetch student-parent connections");
      const connections = await res.json();
      editForm.setValue("parentIds", connections.map((c: ParentStudent) => c.parentId));
    } catch (error) {
      console.error("Error fetching student-parent connections:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить связи ученик-родитель",
        variant: "destructive",
      });
    }
  };
  
  // Fetch classes for student assignment
  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    enabled: isAdmin()
  });
  
  // Fetch student classes for selected student
  const { data: studentClasses = [], isLoading: studentClassesLoading, refetch: refetchStudentClasses } = useQuery<Class[]>({
    queryKey: ["/api/student-classes", selectedStudent],
    queryFn: async ({ queryKey }) => {
      const studentId = queryKey[1];
      if (!studentId) return [];
      const res = await fetch(`/api/student-classes?studentId=${studentId}`);
      if (!res.ok) throw new Error("Failed to fetch student classes");
      return res.json();
    },
    enabled: !!selectedStudent
  });
  
  // Fetch parent-student connections for selected parent
  const { data: parentStudents = [], isLoading: parentStudentsLoading, refetch: refetchParentStudents } = useQuery<ParentStudent[]>({
    queryKey: ["/api/parent-students", selectedParent],
    queryFn: async ({ queryKey }) => {
      const parentId = queryKey[1];
      if (!parentId) return [];
      const res = await fetch(`/api/parent-students?parentId=${parentId}`);
      if (!res.ok) throw new Error("Failed to fetch parent-student connections");
      return res.json();
    },
    enabled: !!selectedParent
  });
  
  // Filter students and parents
  const students = users.filter(u => userHasRole(u, UserRoleEnum.STUDENT));
  const parents = users.filter(u => userHasRole(u, UserRoleEnum.PARENT));
  
  const filteredStudents = searchStudentTerm 
    ? students.filter(student => 
        `${student.firstName} ${student.lastName} ${student.username}`.toLowerCase().includes(searchStudentTerm.toLowerCase()))
    : students;
    
  const filteredParents = searchParentTerm
    ? parents.filter(parent => 
        `${parent.firstName} ${parent.lastName} ${parent.username}`.toLowerCase().includes(searchParentTerm.toLowerCase()))
    : parents;
  
  // Form for adding student to class
  const studentClassForm = useForm({
    defaultValues: {
      studentId: "",
      classId: ""
    },
    resolver: zodResolver(
      z.object({
        studentId: z.string({
          required_error: "Выберите ученика"
        }),
        classId: z.string({
          required_error: "Выберите класс"
        })
      })
    )
  });
  
  // Form for connecting parent and student
  const parentStudentForm = useForm({
    defaultValues: {
      parentId: "",
      studentId: ""
    },
    resolver: zodResolver(
      z.object({
        parentId: z.string({
          required_error: "Выберите родителя"
        }),
        studentId: z.string({
          required_error: "Выберите ученика"
        })
      })
    )
  });
  
  // Add student to class mutation
  const addStudentToClassMutation = useMutation({
    mutationFn: async (data: { studentId: number, classId: number }) => {
      const res = await apiRequest("/api/student-classes", "POST", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Ученик добавлен в класс",
        variant: "default",
      });
      studentClassForm.reset({ 
        studentId: selectedStudent?.toString() || "", 
        classId: "" 
      });
      if (selectedStudent) {
        refetchStudentClasses();
      }
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить ученика в класс",
        variant: "destructive",
      });
    },
  });
  
  // Add parent-student connection mutation
  const addParentStudentMutation = useMutation({
    mutationFn: async (data: { parentId: number, studentId: number }) => {
      const res = await apiRequest("/api/parent-students", "POST", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Родитель связан с учеником",
        variant: "default",
      });
      parentStudentForm.reset({ 
        parentId: selectedParent?.toString() || "", 
        studentId: "" 
      });
      if (selectedParent) {
        refetchParentStudents();
      }
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось связать родителя с учеником",
        variant: "destructive",
      });
    },
  });
  
  // Handlers for student-class management
  const handleStudentSelect = (studentId: number) => {
    setSelectedStudent(studentId);
    studentClassForm.setValue("studentId", studentId.toString());
  };
  
  const onSubmitStudentClass = (values: any) => {
    addStudentToClassMutation.mutate({
      studentId: parseInt(values.studentId),
      classId: parseInt(values.classId)
    });
  };
  
  // Handlers for parent-student management
  const handleParentSelect = (parentId: number) => {
    setSelectedParent(parentId);
    parentStudentForm.setValue("parentId", parentId.toString());
  };
  
  const onSubmitParentStudent = (values: any) => {
    addParentStudentMutation.mutate({
      parentId: parseInt(values.parentId),
      studentId: parseInt(values.studentId)
    });
  };
  
  // Helper functions
  const getStudentName = (id: number) => {
    const student = users.find(s => s.id === id);
    return student ? `${student.lastName} ${student.firstName}` : `Ученик ${id}`;
  };
  
  const getClassName = (id: number) => {
    const cls = classes.find(c => c.id === id);
    return cls ? cls.name : `Класс ${id}`;
  };
  
  const isStudentInClass = (studentId: number, classId: number) => {
    if (!selectedStudent || selectedStudent !== studentId) return false;
    return studentClasses.some(cls => cls.id === classId);
  };
  
  const isStudentConnectedToParent = (parentId: number, studentId: number) => {
    if (!selectedParent || selectedParent !== parentId) return false;
    return parentStudents.some(ps => ps.studentId === studentId);
  };
  
  const getConnectedStudents = () => {
    if (!selectedParent) return [];
    
    return parentStudents.map(ps => {
      const student = users.find(u => u.id === ps.studentId);
      return {
        id: ps.id,
        studentId: ps.studentId,
        name: student ? `${student.lastName} ${student.firstName}` : `Ученик ${ps.studentId}`,
        email: student?.email
      };
    });
  };

  return (
    <MainLayout>
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="p-6 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Удаление пользователя</DialogTitle>
            <DialogDescription className="text-slate-600">
              Вы уверены, что хотите удалить пользователя {selectedUser?.firstName} {selectedUser?.lastName}?
              Это действие нельзя будет отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium bg-white/15 backdrop-filter backdrop-blur-lg text-slate-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.05)] hover:bg-white/25 active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 transition-all duration-200 ease-in-out"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium text-white bg-gradient-to-b from-red-500/90 via-red-600 to-red-700/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_5px_15px_rgba(220,38,38,0.3),0_8px_25px_rgba(220,38,38,0.25)] hover:from-red-500 hover:via-red-600/95 hover:to-red-700 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_6px_18px_rgba(220,38,38,0.35),0_10px_30px_rgba(220,38,38,0.3)] hover:-translate-y-px active:scale-[0.97] active:from-red-600 active:via-red-700/95 active:to-red-700/90 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 transition-all duration-200 ease-in-out"
              onClick={confirmDelete}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Удаление...
                </>
              ) : (
                <>Удалить</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Roles Management Dialog */}
      <Dialog open={isRolesDialogOpen} onOpenChange={setIsRolesDialogOpen}>
        <DialogContent className="p-6 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20 sm:max-w-md max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-800">
              Управление ролями пользователя
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              {selectedUserForRoles && (
                <>
                  Пользователь: {selectedUserForRoles.firstName} {selectedUserForRoles.lastName} ({selectedUserForRoles.username})
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedUserForRoles && (
            <UserRolesInlineManager userId={selectedUserForRoles.id} user={selectedUserForRoles} />
          )}

          <DialogFooter className="sm:justify-end mt-6">
            <Button
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium bg-white/15 backdrop-filter backdrop-blur-lg text-slate-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.05)] hover:bg-white/25 active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 transition-all duration-200 ease-in-out"
              onClick={() => {
                setIsRolesDialogOpen(false);
                setSelectedUserForRoles(null);
              }}
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8"> {/* NEW WRAPPER DIV */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="inline-flex h-auto items-center justify-center rounded-full bg-white/10 backdrop-filter backdrop-blur-xl p-1 shadow-lg border border-white/20 mb-6">
            <TabsTrigger value="users" className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold border border-transparent ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-slate-500 hover:bg-slate-700/10 hover:text-slate-700 data-[state=active]:bg-white/25 data-[state=active]:backdrop-filter data-[state=active]:backdrop-blur-lg data-[state=active]:text-[rgb(2,191,122)] data-[state=active]:shadow-xl data-[state=active]:border-white/30">
              <UsersIcon className="mr-2 h-4 w-4" />
            Пользователи
          </TabsTrigger>
          <TabsTrigger value="student-classes" className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold border border-transparent ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-slate-500 hover:bg-slate-700/10 hover:text-slate-700 data-[state=active]:bg-white/25 data-[state=active]:backdrop-filter data-[state=active]:backdrop-blur-lg data-[state=active]:text-[rgb(2,191,122)] data-[state=active]:shadow-xl data-[state=active]:border-white/30">
            <BookOpen className="mr-2 h-4 w-4" />
            Ученики и классы
          </TabsTrigger>
          <TabsTrigger value="parent-students" className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold border border-transparent ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-slate-500 hover:bg-slate-700/10 hover:text-slate-700 data-[state=active]:bg-white/25 data-[state=active]:backdrop-filter data-[state=active]:backdrop-blur-lg data-[state=active]:text-[rgb(2,191,122)] data-[state=active]:shadow-xl data-[state=active]:border-white/30">
            <UserPlusIcon className="mr-2 h-4 w-4" />
            Родители и дети
          </TabsTrigger>
        </TabsList>
        
        {/* Users Tab */}
        <TabsContent value="users">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-slate-700 mb-6">Пользователи</h2>
            {!isPrincipal() && (
              <Button 
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium text-white bg-gradient-to-b from-[rgb(2,191,122)]/95 via-[rgb(2,191,122)]/90 to-[rgb(2,191,122)]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_0_0_1.5px_rgba(255,255,255,0.2),0_5px_15px_-3px_rgba(0,0,0,0.08),_0_8px_25px_-8px_rgba(0,0,0,0.07)] hover:from-[rgb(2,191,122)]/95 hover:via-[rgb(2,191,122)]/90 hover:to-[rgb(2,191,122)]/95 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_0_0_1.5px_rgba(255,255,255,0.3),0_6px_18px_-3px_rgba(0,0,0,0.1),0_10px_30px_-8px_rgba(0,0,0,0.09)] hover:-translate-y-px active:scale-[0.97] active:from-[rgb(2,191,122)]/95 active:via-[rgb(2,191,122)]/90 active:to-[rgb(2,191,122)]/95 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
                onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Добавить пользователя
              </Button>
            )}
          </div>
          
          {/* Search and filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Поиск пользователей..."
                className={cn("flex h-10 w-full items-center rounded-xl border border-white/20 bg-slate-100/20 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-500/80 backdrop-filter backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70", "pl-10")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="w-full md:w-64">
              <Select
                value={roleFilter}
                onValueChange={(value) => setRoleFilter(value as UserRoleEnum | "all")}
              >
                <SelectTrigger className="flex h-10 w-full items-center justify-between rounded-xl border border-white/20 bg-slate-100/20 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500/80 backdrop-filter backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Фильтр по роли" />
                  </div>
                </SelectTrigger>
                <SelectContent className="relative z-50 p-1 min-w-[8rem] overflow-hidden rounded-2xl border border-white/20 bg-slate-100/50 backdrop-filter backdrop-blur-xl text-slate-800 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
                  <SelectItem value="all" className="relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm text-slate-800 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[rgb(2,191,122)]/20 data-[highlighted]:text-[rgb(2,191,122)] focus:bg-[rgb(2,191,122)]/20 focus:text-[rgb(2,191,122)]">Все роли</SelectItem>
                  {Object.values(UserRoleEnum)
                    .filter((role) => {
                      // Hide SUPER_ADMIN from school admins
                      if (!isSuperAdmin() && role === UserRoleEnum.SUPER_ADMIN) {
                        return false;
                      }
                      return true;
                    })
                    .map((role) => (
                    <SelectItem key={role} value={role} className="relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm text-slate-800 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[rgb(2,191,122)]/20 data-[highlighted]:text-[rgb(2,191,122)] focus:bg-[rgb(2,191,122)]/20 focus:text-[rgb(2,191,122)]">
                      {getRoleName(role as UserRoleEnum)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Users Table */}
          <div className="p-0 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-700/10">
                <TableRow>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Имя</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Логин</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Роль</TableHead>
                  <TableHead className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-white/10">
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-slate-600">
                      Загрузка...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-slate-600">
                      {searchQuery || roleFilter !== "all" ? "Пользователи не найдены" : "Нет пользователей"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{u.firstName} {u.lastName}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">{u.username}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm">{getUserRolesDisplay(u.roles)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEditOrDeleteUser(u) && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(u)}>
                                <Pencil className="h-4 w-4 text-[rgb(2,191,122)]" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-500" onClick={() => handleDelete(u)}>
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </Button>
                            </>
                          )}
                          {canManageUserRoles(u) && (
                            <Button variant="ghost" size="sm" onClick={() => handleManageRoles(u)}>
                              <UserCog className="h-4 w-4 text-blue-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Student-Classes Tab */}
        <TabsContent value="student-classes">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-slate-700 mb-6">Управление учениками в классах</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Список студентов */}
            <Card className="md:col-span-1 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20 p-0 overflow-hidden">
              <CardHeader className="p-6"> {/* Added padding for CardHeader */}
                <CardTitle className="text-xl font-semibold text-slate-800">Ученики</CardTitle>
                <CardDescription className="text-sm text-slate-600">Выберите ученика для просмотра его классов</CardDescription>
                <div className="relative mt-2">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Поиск ученика..."
                    className={cn("flex h-10 w-full items-center rounded-xl border border-white/20 bg-slate-100/20 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-500/80 backdrop-filter backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70", "pl-8")}
                    value={searchStudentTerm}
                    onChange={(e) => setSearchStudentTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-6"> {/* Added padding for CardContent */}
                <div className="h-[400px] overflow-y-auto">
                  {isLoading ? (
                    <div className="text-center p-4 text-slate-500">Загрузка учеников...</div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="text-center p-4 text-slate-500">Ученики не найдены</div>
                  ) : (
                    <ul className="space-y-2">
                      {filteredStudents.map((student) => (
                        <li key={student.id}>
                          <Button
                            className={cn(
                              selectedStudent === student.id 
                                ? "w-full justify-start px-3 py-2 text-sm font-semibold rounded-full bg-white/20 backdrop-filter backdrop-blur-md text-[rgb(2,191,122)] border border-white/30 shadow-md transition-[background-color,border-color,box-shadow,opacity,transform] duration-200 ease-in-out" // Active
                                : "w-full justify-start px-3 py-2 text-sm font-medium rounded-full text-slate-700 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-sm transition-all duration-150 ease-in-out" // Inactive
                            )}
                            onClick={() => handleStudentSelect(student.id)}
                          >
                            <UserPlusIcon className="h-4 w-4 mr-2" />
                            {student.lastName} {student.firstName}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Форма добавления в класс и список классов ученика */}
            <Card className="md:col-span-2 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20 p-0 overflow-hidden">
              <CardHeader className="p-6"> {/* Added padding for CardHeader */}
                <CardTitle className="text-xl font-semibold text-slate-800">
                  {selectedStudent ? (
                    <>Классы ученика: {getStudentName(selectedStudent)}</>
                  ) : (
                    <>Выберите ученика</>
                  )}
                </CardTitle>
                <CardDescription className="text-sm text-slate-600">
                  {selectedStudent ? "Управление классами для выбранного ученика" : "Для управления классами сначала выберите ученика из списка слева"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6"> {/* Added padding for CardContent */}
                {selectedStudent && (
                  <>
                    <Form {...studentClassForm}>
                      <form onSubmit={studentClassForm.handleSubmit(onSubmitStudentClass)} className="space-y-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={studentClassForm.control}
                            name="studentId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-slate-700">Ученик</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={selectedStudent?.toString() || field.value}
                                  defaultValue={selectedStudent?.toString()}
                                >
                                  <FormControl>
                                    <SelectTrigger className="flex h-10 w-full items-center justify-between rounded-xl border border-white/20 bg-slate-100/20 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500/80 backdrop-filter backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70">
                                      <SelectValue placeholder="Выберите ученика" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="relative z-50 p-1 min-w-[8rem] overflow-hidden rounded-2xl border border-white/20 bg-slate-100/50 backdrop-filter backdrop-blur-xl text-slate-800 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
                                    {students.map((student) => (
                                      <SelectItem key={student.id} value={student.id.toString()} className="relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm text-slate-800 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[rgb(2,191,122)]/20 data-[highlighted]:text-[rgb(2,191,122)] focus:bg-[rgb(2,191,122)]/20 focus:text-[rgb(2,191,122)]">
                                        {student.lastName} {student.firstName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={studentClassForm.control}
                            name="classId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-slate-700">Класс</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="flex h-10 w-full items-center justify-between rounded-xl border border-white/20 bg-slate-100/20 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500/80 backdrop-filter backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70">
                                      <SelectValue placeholder="Выберите класс" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="relative z-50 p-1 min-w-[8rem] overflow-hidden rounded-2xl border border-white/20 bg-slate-100/50 backdrop-filter backdrop-blur-xl text-slate-800 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
                                    {classes.map((cls) => (
                                      <SelectItem 
                                        key={cls.id} 
                                        value={cls.id.toString()}
                                        disabled={isStudentInClass(selectedStudent, cls.id)}
                                        className="relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm text-slate-800 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[rgb(2,191,122)]/20 data-[highlighted]:text-[rgb(2,191,122)] focus:bg-[rgb(2,191,122)]/20 focus:text-[rgb(2,191,122)]"
                                      >
                                        {cls.name} {isStudentInClass(selectedStudent, cls.id) && "(уже добавлен)"}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button type="submit" disabled={addStudentToClassMutation.isPending} className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium text-white bg-gradient-to-b from-[rgb(2,191,122)]/95 via-[rgb(2,191,122)]/90 to-[rgb(2,191,122)]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_0_0_1.5px_rgba(255,255,255,0.2),0_5px_15px_-3px_rgba(0,0,0,0.08),_0_8px_25px_-8px_rgba(0,0,0,0.07)] hover:from-[rgb(2,191,122)]/95 hover:via-[rgb(2,191,122)]/90 hover:to-[rgb(2,191,122)]/95 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_0_0_1.5px_rgba(255,255,255,0.3),0_6px_18px_-3px_rgba(0,0,0,0.1),0_10px_30px_-8px_rgba(0,0,0,0.09)] hover:-translate-y-px active:scale-[0.97] active:from-[rgb(2,191,122)]/95 active:via-[rgb(2,191,122)]/90 active:to-[rgb(2,191,122)]/95 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out">
                          {addStudentToClassMutation.isPending ? "Добавление..." : "Добавить в класс"}
                        </Button>
                      </form>
                    </Form>

                    <div className="mt-6">
                      <h3 className="text-lg font-medium text-slate-700 mb-4">Текущие классы ученика</h3>
                      {studentClassesLoading ? (
                        <div className="text-center p-4 text-slate-500">Загрузка классов...</div>
                      ) : studentClasses.length === 0 ? (
                        <div className="text-center p-4 text-slate-500">Ученик не добавлен ни в один класс</div>
                      ) : (
                        <div className="bg-white/10 backdrop-filter backdrop-blur-md rounded-xl p-0 overflow-hidden shadow-inner border border-white/15 mt-4">
                          <Table>
                            <TableHeader className="bg-slate-700/10">
                              <TableRow>
                              <TableHead className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Класс</TableHead>
                              <TableHead className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Учебный год</TableHead>
                              <TableHead className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Уровень</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-white/10">
                            {studentClasses.map((cls) => (
                              <TableRow key={cls.id}>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{cls.name}</TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{cls.academicYear}</TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{cls.gradeLevel}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {!selectedStudent && (
                  <div className="text-center py-8 text-slate-500">
                    <BookOpen className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                    <p>Для управления классами выберите ученика из списка слева</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Parent-Students Tab */}
        <TabsContent value="parent-students">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-slate-700 mb-6">Управление связями родитель-ученик</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Список родителей */}
            <Card className="md:col-span-1 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20 p-0 overflow-hidden">
              <CardHeader className="p-6">
                <CardTitle className="text-xl font-semibold text-slate-800">Родители</CardTitle>
                <CardDescription className="text-sm text-slate-600">Выберите родителя для управления связями с учениками</CardDescription>
                <div className="relative mt-2">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Поиск родителя..."
                    className={cn("flex h-10 w-full items-center rounded-xl border border-white/20 bg-slate-100/20 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-500/80 backdrop-filter backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70", "pl-8")}
                    value={searchParentTerm}
                    onChange={(e) => setSearchParentTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[400px] overflow-y-auto">
                  {isLoading ? (
                    <div className="text-center p-4 text-slate-500">Загрузка родителей...</div>
                  ) : filteredParents.length === 0 ? (
                    <div className="text-center p-4 text-slate-500">Родители не найдены</div>
                  ) : (
                    <ul className="space-y-2">
                      {filteredParents.map((parent) => (
                        <li key={parent.id}>
                          <Button
                            className={cn(
                              selectedParent === parent.id 
                                ? "w-full justify-start px-3 py-2 text-sm font-semibold rounded-full bg-white/20 backdrop-filter backdrop-blur-md text-[rgb(2,191,122)] border border-white/30 shadow-md transition-[background-color,border-color,box-shadow,opacity,transform] duration-200 ease-in-out" // Active
                                : "w-full justify-start px-3 py-2 text-sm font-medium rounded-full text-slate-700 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-sm transition-all duration-150 ease-in-out" // Inactive
                            )}
                            onClick={() => handleParentSelect(parent.id)}
                          >
                            <UserIcon className="h-4 w-4 mr-2" />
                            {parent.lastName} {parent.firstName}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Форма добавления и список детей */}
            <Card className="md:col-span-2 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20 p-0 overflow-hidden">
              <CardHeader className="p-6">
                <CardTitle className="text-xl font-semibold text-slate-800">
                  {selectedParent ? (
                    <>Дети родителя: {getStudentName(selectedParent)}</>
                  ) : (
                    <>Выберите родителя</>
                  )}
                </CardTitle>
                <CardDescription className="text-sm text-slate-600">
                  {selectedParent 
                    ? "Управление связями для выбранного родителя" 
                    : "Для управления связями сначала выберите родителя из списка слева"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {selectedParent && (
                  <>
                    <Form {...parentStudentForm}>
                      <form onSubmit={parentStudentForm.handleSubmit(onSubmitParentStudent)} className="space-y-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={parentStudentForm.control}
                            name="parentId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-slate-700">Родитель</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={selectedParent?.toString()}
                                >
                                  <FormControl>
                                    <SelectTrigger className="flex h-10 w-full items-center justify-between rounded-xl border border-white/20 bg-slate-100/20 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500/80 backdrop-filter backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70">
                                      <SelectValue placeholder="Выберите родителя" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="relative z-50 p-1 min-w-[8rem] overflow-hidden rounded-2xl border border-white/20 bg-slate-100/50 backdrop-filter backdrop-blur-xl text-slate-800 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
                                    {parents.map((parent) => (
                                      <SelectItem key={parent.id} value={parent.id.toString()} className="relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm text-slate-800 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[rgb(2,191,122)]/20 data-[highlighted]:text-[rgb(2,191,122)] focus:bg-[rgb(2,191,122)]/20 focus:text-[rgb(2,191,122)]">
                                        {parent.lastName} {parent.firstName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={parentStudentForm.control}
                            name="studentId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-slate-700">Ученик</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="flex h-10 w-full items-center justify-between rounded-xl border border-white/20 bg-slate-100/20 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500/80 backdrop-filter backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_2px_0_rgba(0,0,0,0.08)] ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:border-[rgb(2,191,122)]/70">
                                      <SelectValue placeholder="Выберите ученика" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="relative z-50 p-1 min-w-[8rem] overflow-hidden rounded-2xl border border-white/20 bg-slate-100/50 backdrop-filter backdrop-blur-xl text-slate-800 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
                                    {students.map((student) => (
                                      <SelectItem 
                                        key={student.id} 
                                        value={student.id.toString()}
                                        disabled={isStudentConnectedToParent(selectedParent, student.id)}
                                        className="relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm text-slate-800 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[rgb(2,191,122)]/20 data-[highlighted]:text-[rgb(2,191,122)] focus:bg-[rgb(2,191,122)]/20 focus:text-[rgb(2,191,122)]"
                                      >
                                        {student.lastName} {student.firstName} 
                                        {isStudentConnectedToParent(selectedParent, student.id) && " (уже связан)"}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button type="submit" disabled={addParentStudentMutation.isPending} className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium text-white bg-gradient-to-b from-[rgb(2,191,122)]/95 via-[rgb(2,191,122)]/90 to-[rgb(2,191,122)]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_0_0_1.5px_rgba(255,255,255,0.2),0_5px_15px_-3px_rgba(0,0,0,0.08),_0_8px_25px_-8px_rgba(0,0,0,0.07)] hover:from-[rgb(2,191,122)]/95 hover:via-[rgb(2,191,122)]/90 hover:to-[rgb(2,191,122)]/95 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_0_0_1.5px_rgba(255,255,255,0.3),0_6px_18px_-3px_rgba(0,0,0,0.1),0_10px_30px_-8px_rgba(0,0,0,0.09)] hover:-translate-y-px active:scale-[0.97] active:from-[rgb(2,191,122)]/95 active:via-[rgb(2,191,122)]/90 active:to-[rgb(2,191,122)]/95 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out">
                          {addParentStudentMutation.isPending ? "Добавление..." : "Добавить ребенка"}
                        </Button>
                      </form>
                    </Form>

                    <div className="mt-6">
                      <h3 className="text-lg font-medium text-slate-700 mb-4">Дети родителя</h3>
                      {parentStudentsLoading ? (
                        <div className="text-center p-4 text-slate-500">Загрузка связей...</div>
                      ) : parentStudents.length === 0 ? (
                        <div className="text-center p-4 text-slate-500">У родителя нет связанных учеников</div>
                      ) : (
                        <div className="bg-white/10 backdrop-filter backdrop-blur-md rounded-xl p-0 overflow-hidden shadow-inner border border-white/15 mt-4">
                          <Table>
                            <TableHeader className="bg-slate-700/10">
                              <TableRow>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Ученик</TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Email</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-white/10">
                              {getConnectedStudents().map((connection) => (
                                <TableRow key={connection.id}>
                                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{connection.name}</TableCell>
                                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{connection.email || "-"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {!selectedParent && (
                  <div className="text-center py-8 text-slate-500">
                    <UsersIcon className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                    <p>Для управления связями выберите родителя из списка слева</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="p-6 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20 sm:max-w-md max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Добавить пользователя</DialogTitle>
            <DialogDescription className="text-slate-600">
              Введите информацию о новом пользователе
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitAdd)} className="space-y-4">
              <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
                <FormField
                  control={form.control}
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
                  control={form.control}
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
              
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Логин</FormLabel>
                    <FormControl>
                      <Input placeholder="Логин" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Телефон</FormLabel>
                    <FormControl>
                      <Input placeholder="Телефон" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Пароль</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Пароль" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Подтверждение</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Повторите пароль" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Роль</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите роль" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isSuperAdmin() && (
                          <SelectItem value={UserRoleEnum.SUPER_ADMIN}>Супер-администратор</SelectItem>
                        )}
                        {isAdmin() && (
                          <>
                            {isSuperAdmin() && (
                              <SelectItem value={UserRoleEnum.SCHOOL_ADMIN}>Администратор школы</SelectItem>
                            )}
                            <SelectItem value={UserRoleEnum.PRINCIPAL}>Директор</SelectItem>
                            <SelectItem value={UserRoleEnum.VICE_PRINCIPAL}>Завуч</SelectItem>
                          </>
                        )}
                        <SelectItem value={UserRoleEnum.TEACHER}>Учитель</SelectItem>
                        <SelectItem value={UserRoleEnum.CLASS_TEACHER}>Классный руководитель</SelectItem>
                        <SelectItem value={UserRoleEnum.STUDENT}>Ученик</SelectItem>
                        <SelectItem value={UserRoleEnum.PARENT}>Родитель</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {isSuperAdmin() && (
                <FormField
                  control={form.control}
                  name="schoolId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Школа</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value))}
                        value={field.value === null ? "null" : field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите школу" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="null">Не выбрано</SelectItem>
                          {Array.isArray(schools) && schools.map((school: any) => (
                            <SelectItem key={school.id} value={school.id.toString()}>
                              {school.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Управление классом для классного руководителя */}
              {form.watch("role") === UserRoleEnum.CLASS_TEACHER && (
                <FormField
                  control={form.control}
                  name="classIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Класс</FormLabel>
                      <FormDescription>
                        Выберите класс, которым будет руководить классный руководитель
                      </FormDescription>
                      <div className="mt-2">
                        {classes.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Нет доступных классов</p>
                        ) : (
                          <Select
                            onValueChange={(value) => {
                              const classId = parseInt(value);
                              field.onChange([classId]); // Устанавливаем только один класс
                            }}
                            value={field.value?.[0]?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите класс" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {classes.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id.toString()}>
                                  {cls.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Управление классом для студента */}
              {form.watch("role") === UserRoleEnum.STUDENT && (
                <FormField
                  control={form.control}
                  name="classIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Класс</FormLabel>
                      <FormDescription>
                        Выберите класс, в который будет добавлен ученик (ученик может состоять только в одном классе)
                      </FormDescription>
                      <div className="mt-2">
                        {classes.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Нет доступных классов</p>
                        ) : (
                          <Select
                            onValueChange={(value) => {
                              if (value === "none") {
                                field.onChange([]);
                              } else {
                                const classId = parseInt(value);
                                field.onChange([classId]); // Устанавливаем только один класс
                              }
                            }}
                            value={field.value?.[0]?.toString() || "none"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите класс" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Не выбрано</SelectItem>
                              {classes.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id.toString()}>
                                  {cls.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Управление связями родитель-ученик для родителя */}
              {form.watch("role") === UserRoleEnum.PARENT && (
                <FormField
                  control={form.control}
                  name="childIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дети</FormLabel>
                      <FormDescription>
                        Выберите учеников, с которыми будет связан родитель
                      </FormDescription>
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        {students.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Нет доступных учеников</p>
                        ) : (
                          <div className="space-y-2">
                            {students.map((student) => (
                              <div key={student.id} className="flex items-center">
                                <Checkbox
                                  id={`add-student-${student.id}`}
                                  checked={field.value?.includes(student.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...(field.value || []), student.id]);
                                    } else {
                                      field.onChange(
                                        field.value?.filter((id) => id !== student.id) || []
                                      );
                                    }
                                  }}
                                />
                                <Label
                                  htmlFor={`add-student-${student.id}`}
                                  className="ml-2 text-sm font-medium cursor-pointer"
                                >
                                  {student.lastName} {student.firstName}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Управление связями ученик-родитель для ученика */}
              {form.watch("role") === UserRoleEnum.STUDENT && (
                <FormField
                  control={form.control}
                  name="parentIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Родители</FormLabel>
                      <FormDescription>
                        Выберите родителей для ученика
                      </FormDescription>
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        {parents.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Нет доступных родителей</p>
                        ) : (
                          <div className="space-y-2">
                            {parents.map((parent) => (
                              <div key={parent.id} className="flex items-center">
                                <Checkbox
                                  id={`add-parent-${parent.id}`}
                                  checked={field.value?.includes(parent.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...(field.value || []), parent.id]);
                                    } else {
                                      field.onChange(
                                        field.value?.filter((id) => id !== parent.id) || []
                                      );
                                    }
                                  }}
                                />
                                <Label
                                  htmlFor={`add-parent-${parent.id}`}
                                  className="ml-2 text-sm font-medium cursor-pointer"
                                >
                                  {parent.lastName} {parent.firstName}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={addUserMutation.isPending}
                  className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium text-white bg-gradient-to-b from-[rgb(2,191,122)]/95 via-[rgb(2,191,122)]/90 to-[rgb(2,191,122)]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_0_0_1.5px_rgba(255,255,255,0.2),0_5px_15px_-3px_rgba(0,0,0,0.08),_0_8px_25px_-8px_rgba(0,0,0,0.07)] hover:from-[rgb(2,191,122)]/95 hover:via-[rgb(2,191,122)]/90 hover:to-[rgb(2,191,122)]/95 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_0_0_1.5px_rgba(255,255,255,0.3),0_6px_18px_-3px_rgba(0,0,0,0.1),0_10px_30px_-8px_rgba(0,0,0,0.09)] hover:-translate-y-px active:scale-[0.97] active:from-[rgb(2,191,122)]/95 active:via-[rgb(2,191,122)]/90 active:to-[rgb(2,191,122)]/95 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
                >
                  {addUserMutation.isPending ? "Добавление..." : "Добавить пользователя"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      </div> {/* END NEW WRAPPER DIV */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="p-6 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20 sm:max-w-md max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Редактировать пользователя</DialogTitle>
            <DialogDescription className="text-slate-600">
              Измените информацию о пользователе
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
              <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
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

              <FormField
                control={editForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Логин</FormLabel>
                    <FormControl>
                      <Input placeholder="Логин" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Телефон</FormLabel>
                    <FormControl>
                      <Input placeholder="Телефон" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
                <FormField
                  control={editForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Новый пароль (не обязательно)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Оставьте пустым, чтобы не менять" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Подтверждение пароля</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Подтверждение пароля" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {isSuperAdmin() && (
                <>
                  <FormField
                    control={editForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Роль</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите роль" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isSuperAdmin() && (
                              <>
                                <SelectItem value={UserRoleEnum.SUPER_ADMIN}>Супер-администратор</SelectItem>
                                <SelectItem value={UserRoleEnum.SCHOOL_ADMIN}>Администратор школы</SelectItem>
                              </>
                            )}
                            <SelectItem value={UserRoleEnum.PRINCIPAL}>Директор</SelectItem>
                            <SelectItem value={UserRoleEnum.VICE_PRINCIPAL}>Завуч</SelectItem>
                            <SelectItem value={UserRoleEnum.TEACHER}>Учитель</SelectItem>
                            <SelectItem value={UserRoleEnum.CLASS_TEACHER}>Классный руководитель</SelectItem>
                            <SelectItem value={UserRoleEnum.STUDENT}>Ученик</SelectItem>
                            <SelectItem value={UserRoleEnum.PARENT}>Родитель</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="schoolId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Школа</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value))}
                          value={field.value === null ? "null" : field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите школу" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="null">Не выбрано</SelectItem>
                            {Array.isArray(schools) && schools.map((school: any) => (
                              <SelectItem key={school.id} value={school.id.toString()}>
                                {school.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              
              {/* Управление классом для классного руководителя */}
              {editForm.watch("role") === UserRoleEnum.CLASS_TEACHER && (
                <FormField
                  control={editForm.control}
                  name="classIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Класс</FormLabel>
                      <FormDescription>
                        Выберите класс, которым будет руководить классный руководитель
                      </FormDescription>
                      <div className="mt-2">
                        {classes.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Нет доступных классов</p>
                        ) : (
                          <Select
                            onValueChange={(value) => {
                              const classId = parseInt(value);
                              field.onChange([classId]); // Устанавливаем только один класс
                            }}
                            value={field.value?.[0]?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите класс" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {classes.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id.toString()}>
                                  {cls.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Управление классом для студента */}
              {editForm.watch("role") === UserRoleEnum.STUDENT && (
                <FormField
                  control={editForm.control}
                  name="classIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Класс</FormLabel>
                      <FormDescription>
                        Выберите класс, в который добавлен ученик (ученик может состоять только в одном классе)
                      </FormDescription>
                      <div className="mt-2">
                        {classes.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Нет доступных классов</p>
                        ) : (
                          <Select
                            onValueChange={(value) => {
                              if (value === "none") {
                                field.onChange([]);
                              } else {
                                const classId = parseInt(value);
                                field.onChange([classId]); // Устанавливаем только один класс
                              }
                            }}
                            value={field.value?.[0]?.toString() || "none"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите класс" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Не выбрано</SelectItem>
                              {classes.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id.toString()}>
                                  {cls.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Управление связями родитель-ученик для родителя */}
              {editForm.watch("role") === UserRoleEnum.PARENT && (
                <FormField
                  control={editForm.control}
                  name="childIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дети</FormLabel>
                      <FormDescription>
                        Выберите учеников, с которыми связан родитель
                      </FormDescription>
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        {students.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Нет доступных учеников</p>
                        ) : (
                          <div className="space-y-2">
                            {students.map((student) => (
                              <div key={student.id} className="flex items-center">
                                <Checkbox
                                  id={`edit-student-${student.id}`}
                                  checked={field.value?.includes(student.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...(field.value || []), student.id]);
                                    } else {
                                      field.onChange(
                                        field.value?.filter((id) => id !== student.id) || []
                                      );
                                    }
                                  }}
                                />
                                <Label
                                  htmlFor={`edit-student-${student.id}`}
                                  className="ml-2 text-sm font-medium cursor-pointer"
                                >
                                  {student.lastName} {student.firstName}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Управление связями ученик-родитель для ученика */}
              {editForm.watch("role") === UserRoleEnum.STUDENT && (
                <FormField
                  control={editForm.control}
                  name="parentIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Родители</FormLabel>
                      <FormDescription>
                        Выберите родителей для ученика
                      </FormDescription>
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        {parents.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Нет доступных родителей</p>
                        ) : (
                          <div className="space-y-2">
                            {parents.map((parent) => (
                              <div key={parent.id} className="flex items-center">
                                <Checkbox
                                  id={`edit-parent-${parent.id}`}
                                  checked={field.value?.includes(parent.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...(field.value || []), parent.id]);
                                    } else {
                                      field.onChange(
                                        field.value?.filter((id) => id !== parent.id) || []
                                      );
                                    }
                                  }}
                                />
                                <Label
                                  htmlFor={`edit-parent-${parent.id}`}
                                  className="ml-2 text-sm font-medium cursor-pointer"
                                >
                                  {parent.lastName} {parent.firstName}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={editUserMutation.isPending}
                  className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium text-white bg-gradient-to-b from-[rgb(2,191,122)]/95 via-[rgb(2,191,122)]/90 to-[rgb(2,191,122)]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_0_0_1.5px_rgba(255,255,255,0.2),0_5px_15px_-3px_rgba(0,0,0,0.08),_0_8px_25px_-8px_rgba(0,0,0,0.07)] hover:from-[rgb(2,191,122)]/95 hover:via-[rgb(2,191,122)]/90 hover:to-[rgb(2,191,122)]/95 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_0_0_1.5px_rgba(255,255,255,0.3),0_6px_18px_-3px_rgba(0,0,0,0.1),0_10px_30px_-8px_rgba(0,0,0,0.09)] hover:-translate-y-px active:scale-[0.97] active:from-[rgb(2,191,122)]/95 active:via-[rgb(2,191,122)]/90 active:to-[rgb(2,191,122)]/95 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transition-all duration-200 ease-in-out"
                >
                  {editUserMutation.isPending ? "Сохранение..." : "Сохранить изменения"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

// Inline User Roles Manager Component
function UserRolesInlineManager({ userId, user }: { userId: number; user: UserWithRoles }) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { isSuperAdmin, isSchoolAdmin } = useRoleCheck();
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [newRole, setNewRole] = useState<UserRoleEnum | ''>('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  // Fetch user roles
  const { data: userRoles = [], isLoading: isLoadingRoles, refetch: refetchRoles } = useQuery<any[]>({
    queryKey: [`/api/user-roles/${userId}`],
  });

  // Refetch users to update the main table
  const queryClient = useQueryClient();

  // Fetch schools - only for super admin
  const { data: schools = [] } = useQuery<any[]>({
    queryKey: ["/api/schools"],
    enabled: isSuperAdmin()
  });

  // Fetch user roles to get school admin's school
  const { data: currentUserRoles = [] } = useQuery({
    queryKey: ["/api/my-roles"],
    enabled: isSchoolAdmin()
  });

  // Function to get school admin's school ID
  const getSchoolAdminSchoolId = () => {
    if (!isSchoolAdmin()) return null;

    // Check user profile first
    if (currentUser?.schoolId) return currentUser.schoolId;

    // Check user roles
    const schoolAdminRole = currentUserRoles.find((role: any) =>
      role.role === UserRoleEnum.SCHOOL_ADMIN && role.schoolId
    );

    return schoolAdminRole?.schoolId || null;
  };

  // Fetch classes
  const { data: allClasses = [] } = useQuery<any[]>({
    queryKey: ["/api/classes"],
  });

  // Filter classes by selected school
  const classes = selectedSchoolId
    ? allClasses.filter(cls => cls.schoolId === selectedSchoolId)
    : allClasses;

  // Auto-set school for school admin when adding roles
  useEffect(() => {
    if (isSchoolAdmin() && !selectedSchoolId && newRole && doesRoleRequireSchool(newRole as UserRoleEnum)) {
      const schoolId = getSchoolAdminSchoolId();
      if (schoolId) {
        setSelectedSchoolId(schoolId);
      }
    }
  }, [newRole, isSchoolAdmin, selectedSchoolId]);

  // Helper function to check if role requires school
  const doesRoleRequireSchool = (role: UserRoleEnum) => {
    return [
      UserRoleEnum.SCHOOL_ADMIN,
      UserRoleEnum.TEACHER,
      UserRoleEnum.PRINCIPAL,
      UserRoleEnum.VICE_PRINCIPAL,
      UserRoleEnum.CLASS_TEACHER,
    ].includes(role);
  };

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async (data: { userId: number; role: UserRoleEnum; schoolId: number | null; classId: number | null }) => {
      const res = await apiRequest('/api/user-roles', 'POST', data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Не удалось добавить роль');
      }
      return await res.json();
    },
    onSuccess: () => {
      refetchRoles();
      // Invalidate multiple related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-roles'] });

      toast({
        title: 'Роль добавлена',
        description: 'Роль пользователя успешно добавлена',
      });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (data: { id: number; role: UserRoleEnum; schoolId: number | null; classId: number | null }) => {
      const res = await apiRequest(`/api/user-roles/${data.id}`, 'PUT', {
        role: data.role,
        schoolId: data.schoolId,
        classId: data.classId
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Не удалось обновить роль');
      }
      return await res.json();
    },
    onSuccess: () => {
      refetchRoles();
      // Invalidate multiple related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-roles'] });

      toast({
        title: 'Роль обновлена',
        description: 'Роль пользователя успешно обновлена',
      });
      setEditingRole(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });



  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      const res = await apiRequest(`/api/user-roles/${roleId}`, 'DELETE');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Не удалось удалить роль');
      }
      return true;
    },
    onSuccess: () => {
      refetchRoles();
      // Invalidate multiple related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-roles'] });

      toast({
        title: 'Роль удалена',
        description: 'Роль пользователя успешно удалена',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setNewRole('');
    setSelectedSchoolId(null);
    setSelectedClassId(null);
    setIsAddingRole(false);
  };

  const handleAddRole = () => {
    if (!newRole) {
      toast({
        title: 'Ошибка',
        description: 'Выберите роль',
        variant: 'destructive',
      });
      return;
    }

    const isSchoolRole = doesRoleRequireSchool(newRole as UserRoleEnum);

    // For school admin, automatically use their school
    let finalSchoolId = selectedSchoolId;
    if (isSchoolRole && isSchoolAdmin()) {
      finalSchoolId = getSchoolAdminSchoolId();
    }

    if (isSchoolRole && !finalSchoolId) {
      toast({
        title: 'Ошибка',
        description: 'Для этой роли необходимо выбрать школу',
        variant: 'destructive',
      });
      return;
    }

    if (newRole === UserRoleEnum.CLASS_TEACHER && !selectedClassId) {
      toast({
        title: 'Ошибка',
        description: 'Для классного руководителя необходимо выбрать класс',
        variant: 'destructive',
      });
      return;
    }

    addRoleMutation.mutate({
      userId,
      role: newRole as UserRoleEnum,
      schoolId: isSchoolRole ? finalSchoolId : null,
      classId: newRole === UserRoleEnum.CLASS_TEACHER ? selectedClassId : null,
    });
  };

  const handleUpdateRole = () => {
    if (!editingRole || !newRole) return;

    const isSchoolRole = doesRoleRequireSchool(newRole as UserRoleEnum);

    // For school admin, automatically use their school
    let finalSchoolId = selectedSchoolId;
    if (isSchoolRole && isSchoolAdmin()) {
      finalSchoolId = getSchoolAdminSchoolId();
    }

    if (isSchoolRole && !finalSchoolId) {
      toast({
        title: 'Ошибка',
        description: 'Для этой роли необходимо выбрать школу',
        variant: 'destructive',
      });
      return;
    }

    if (newRole === UserRoleEnum.CLASS_TEACHER && !selectedClassId) {
      toast({
        title: 'Ошибка',
        description: 'Для классного руководителя необходимо выбрать класс',
        variant: 'destructive',
      });
      return;
    }

    // Update the role
    updateRoleMutation.mutate({
      id: editingRole.id,
      role: newRole as UserRoleEnum,
      schoolId: isSchoolRole ? finalSchoolId : null,
      classId: newRole === UserRoleEnum.CLASS_TEACHER ? selectedClassId : null,
    });
  };

  const startEditRole = (role: any) => {
    // Check if school admin is trying to edit their own school admin role
    if (isSchoolAdmin() && currentUser && currentUser.id === user.id &&
        role.role === UserRoleEnum.SCHOOL_ADMIN) {
      toast({
        title: 'Ошибка',
        description: 'Вы не можете изменить свою роль администратора школы',
        variant: 'destructive',
      });
      return;
    }

    setEditingRole(role);
    setNewRole(role.role);
    setSelectedSchoolId(role.schoolId);
    setSelectedClassId(role.classId);
    setIsAddingRole(true);
  };



  const handleRemoveRole = (roleId: number) => {
    if (userRoles.length <= 1) {
      toast({
        title: 'Ошибка',
        description: 'Нельзя удалить единственную роль пользователя',
        variant: 'destructive',
      });
      return;
    }

    // Check if school admin is trying to remove their own school admin role
    const roleToRemove = userRoles.find(r => r.id === roleId);
    if (isSchoolAdmin() && currentUser && currentUser.id === user.id &&
        roleToRemove && roleToRemove.role === UserRoleEnum.SCHOOL_ADMIN) {
      toast({
        title: 'Ошибка',
        description: 'Вы не можете удалить свою роль администратора школы',
        variant: 'destructive',
      });
      return;
    }

    if (confirm('Вы уверены, что хотите удалить эту роль?')) {
      removeRoleMutation.mutate(roleId);
    }
  };

  // Check if role can be removed
  const canRemoveRole = (role: any) => {
    if (userRoles.length <= 1) return false;

    // School admin cannot remove their own school admin role
    if (isSchoolAdmin() && currentUser && currentUser.id === user.id &&
        role.role === UserRoleEnum.SCHOOL_ADMIN) {
      return false;
    }

    return true;
  };

  const getRoleLabel = (role: UserRoleEnum) => {
    const roleLabels: Record<UserRoleEnum, string> = {
      [UserRoleEnum.SUPER_ADMIN]: 'Суперадминистратор',
      [UserRoleEnum.SCHOOL_ADMIN]: 'Администратор школы',
      [UserRoleEnum.TEACHER]: 'Учитель',
      [UserRoleEnum.STUDENT]: 'Ученик',
      [UserRoleEnum.PARENT]: 'Родитель',
      [UserRoleEnum.PRINCIPAL]: 'Директор',
      [UserRoleEnum.VICE_PRINCIPAL]: 'Завуч',
      [UserRoleEnum.CLASS_TEACHER]: 'Классный руководитель',
    };
    return roleLabels[role] || role;
  };

  if (isLoadingRoles) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Roles */}
      <div>
        <Label className="text-base font-medium">Роли пользователя</Label>
        <div className="mt-2 space-y-2">
          {/* All Roles */}
          {userRoles.length > 0 ? (
            userRoles.map((role, index) => (
              <div key={role.id} className="flex items-center justify-between p-3 bg-white/10 backdrop-filter backdrop-blur-md rounded-xl border border-white/20">
                <div className="flex-1">
                  <div className="font-medium text-slate-800">
                    {getRoleLabel(role.role)}
                  </div>
                  <div className="text-sm text-slate-600">
                    {!isSchoolAdmin() && role.schoolId && (
                      <span>Школа: {schools.find(s => s.id === role.schoolId)?.name || `ID: ${role.schoolId}`}</span>
                    )}
                    {role.classId && (
                      <span className={!isSchoolAdmin() && role.schoolId ? "ml-2" : ""}>Класс: {allClasses.find(c => c.id === role.classId)?.name || `ID: ${role.classId}`}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditRole(role)}
                    disabled={updateRoleMutation.isPending || (isSchoolAdmin() && currentUser && currentUser.id === user.id && role.role === UserRoleEnum.SCHOOL_ADMIN)}
                    title={isSchoolAdmin() && currentUser && currentUser.id === user.id && role.role === UserRoleEnum.SCHOOL_ADMIN ? "Вы не можете изменить свою роль администратора школы" : "Редактировать роль"}
                  >
                    <Pencil className="h-4 w-4 text-blue-500" />
                  </Button>
                  {canRemoveRole(role) ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRole(role.id)}
                      disabled={removeRoleMutation.isPending}
                      title="Удалить роль"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      title={userRoles.length <= 1 ? "Нельзя удалить единственную роль" : "Вы не можете удалить свою роль администратора школы"}
                    >
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              У пользователя нет ролей
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Role Form */}
      {!isAddingRole ? (
        <Button
          onClick={() => setIsAddingRole(true)}
          className="w-full"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          Добавить роль
        </Button>
      ) : (
        <div className="space-y-4 p-4 bg-white/5 backdrop-filter backdrop-blur-md rounded-xl border border-white/20">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">
              {editingRole ? 'Редактировать роль' : 'Добавить новую роль'}
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingRole(null);
                resetForm();
              }}
            >
              ✕
            </Button>
          </div>

          {/* Role Selection */}
          <div>
            <Label htmlFor="role">Роль</Label>
            <Select
              value={newRole}
              onValueChange={(value) => {
                setNewRole(value as UserRoleEnum);
                if (!doesRoleRequireSchool(value as UserRoleEnum)) {
                  setSelectedSchoolId(null);
                  setSelectedClassId(null);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                {isSuperAdmin() && (
                  <>
                    <SelectItem value={UserRoleEnum.SUPER_ADMIN}>Суперадминистратор</SelectItem>
                    <SelectItem value={UserRoleEnum.SCHOOL_ADMIN}>Администратор школы</SelectItem>
                  </>
                )}
                {(isSuperAdmin() || isSchoolAdmin()) && (
                  <>
                    <SelectItem value={UserRoleEnum.TEACHER}>Учитель</SelectItem>
                    <SelectItem value={UserRoleEnum.PRINCIPAL}>Директор</SelectItem>
                    <SelectItem value={UserRoleEnum.VICE_PRINCIPAL}>Завуч</SelectItem>
                    <SelectItem value={UserRoleEnum.CLASS_TEACHER}>Классный руководитель</SelectItem>
                  </>
                )}
                <SelectItem value={UserRoleEnum.STUDENT}>Ученик</SelectItem>
                <SelectItem value={UserRoleEnum.PARENT}>Родитель</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* School Selection - only for super admin */}
          {newRole && doesRoleRequireSchool(newRole as UserRoleEnum) && !isSchoolAdmin() && (
            <div>
              <Label htmlFor="school">Школа</Label>
              <Select
                value={selectedSchoolId?.toString() || ''}
                onValueChange={(value) => {
                  setSelectedSchoolId(parseInt(value));
                  setSelectedClassId(null); // Reset class when school changes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите школу" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id.toString()}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Class Selection */}
          {newRole === UserRoleEnum.CLASS_TEACHER && selectedSchoolId && (
            <div>
              <Label htmlFor="class">Класс</Label>
              <Select
                value={selectedClassId?.toString() || ''}
                onValueChange={(value) => setSelectedClassId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите класс" />
                </SelectTrigger>
                <SelectContent>
                  {classes.length === 0 ? (
                    <SelectItem value="no-class" disabled>
                      Нет доступных классов
                    </SelectItem>
                  ) : (
                    classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.name} ({cls.academicYear})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={editingRole ? handleUpdateRole : handleAddRole}
              disabled={addRoleMutation.isPending || updateRoleMutation.isPending}
              className="flex-1"
            >
              {(addRoleMutation.isPending || updateRoleMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingRole ? 'Обновить' : 'Добавить'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditingRole(null);
                resetForm();
              }}
            >
              Отмена
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}