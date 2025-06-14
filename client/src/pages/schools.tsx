import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { UserRoleEnum, School, insertSchoolSchema } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Extended school schema with validation
const schoolFormSchema = insertSchoolSchema.extend({
  name: z.string().min(1, "Название школы обязательно"),
  address: z.string().min(1, "Адрес обязателен"),
  city: z.string().min(1, "Город обязателен"),
});

export default function Schools() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Only Super admin can access this page
  if (user?.role !== UserRoleEnum.SUPER_ADMIN) {
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
  
  // Fetch schools
  const { data: schools = [], isLoading } = useQuery<School[]>({
    queryKey: ["/api/schools"],
    enabled: user?.role === UserRoleEnum.SUPER_ADMIN
  });
  
  // Filter schools based on search query
  const filteredSchools = schools.filter(school => 
    school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    school.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    school.address.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Form for adding/editing schools
  const form = useForm<z.infer<typeof schoolFormSchema>>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      status: "active",
    },
  });
  
  // Reset form when dialog closes
  const resetForm = () => {
    form.reset({
      name: "",
      address: "",
      city: "",
      status: "active",
    });
  };
  
  // Set form values when editing
  const setFormForEdit = (school: School) => {
    form.reset({
      name: school.name,
      address: school.address,
      city: school.city,
      status: school.status,
    });
  };
  
  // Add school mutation
  const addSchoolMutation = useMutation({
    mutationFn: async (data: z.infer<typeof schoolFormSchema>) => {
      const res = await apiRequest("/api/schools", "POST", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Школа добавлена",
        description: "Новая школа успешно добавлена в систему",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить школу",
        variant: "destructive",
      });
    },
  });
  
  // Edit school mutation
  const editSchoolMutation = useMutation({
    mutationFn: async (data: { id: number; school: Partial<z.infer<typeof schoolFormSchema>> }) => {
      const res = await apiRequest(`/api/schools/${data.id}`, "PUT", data.school);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
      setIsEditDialogOpen(false);
      setSelectedSchool(null);
      resetForm();
      toast({
        title: "Школа обновлена",
        description: "Информация о школе успешно обновлена",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить информацию о школе",
        variant: "destructive",
      });
    },
  });
  
  // Delete school mutation
  const deleteSchoolMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/schools/${id}`, "DELETE");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
      setIsDeleteDialogOpen(false);
      setSelectedSchool(null);
      toast({
        title: "Школа удалена",
        description: "Школа успешно удалена из системы",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить школу",
        variant: "destructive",
      });
    },
  });
  
  const onSubmitAdd = (values: z.infer<typeof schoolFormSchema>) => {
    addSchoolMutation.mutate(values);
  };
  
  const onSubmitEdit = (values: z.infer<typeof schoolFormSchema>) => {
    if (selectedSchool) {
      editSchoolMutation.mutate({
        id: selectedSchool.id,
        school: values,
      });
    }
  };
  
  const handleEdit = (school: School) => {
    setSelectedSchool(school);
    setFormForEdit(school);
    setIsEditDialogOpen(true);
  };
  
  const handleDelete = (school: School) => {
    setSelectedSchool(school);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (selectedSchool) {
      deleteSchoolMutation.mutate(selectedSchool.id);
    }
  };
  
  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-gray-800">Школы</h2>
        <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Добавить школу
        </Button>
      </div>
      
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Поиск школ..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* Schools Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Адрес</TableHead>
              <TableHead>Город</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : filteredSchools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  {searchQuery ? "Школы не найдены" : "Нет добавленных школ"}
                </TableCell>
              </TableRow>
            ) : (
              filteredSchools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">{school.name}</TableCell>
                  <TableCell>{school.address}</TableCell>
                  <TableCell>{school.city}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      school.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {school.status === 'active' ? 'Активна' : 'Настройка'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(school)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(school)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Add School Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить школу</DialogTitle>
            <DialogDescription>
              Введите информацию о новой школе
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitAdd)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название школы</FormLabel>
                    <FormControl>
                      <Input placeholder="Название школы" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Адрес</FormLabel>
                    <FormControl>
                      <Input placeholder="Адрес" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Город</FormLabel>
                    <FormControl>
                      <Input placeholder="Город" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={addSchoolMutation.isPending}>
                  {addSchoolMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit School Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать школу</DialogTitle>
            <DialogDescription>
              Измените информацию о школе
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название школы</FormLabel>
                    <FormControl>
                      <Input placeholder="Название школы" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Адрес</FormLabel>
                    <FormControl>
                      <Input placeholder="Адрес" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Город</FormLabel>
                    <FormControl>
                      <Input placeholder="Город" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={editSchoolMutation.isPending}>
                  {editSchoolMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete School Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить школу</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить школу "{selectedSchool?.name}"? Это действие невозможно отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteSchoolMutation.isPending}
            >
              {deleteSchoolMutation.isPending ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
