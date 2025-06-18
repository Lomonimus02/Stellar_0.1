import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { UserRole, Document, insertDocumentSchema, School, Class, Subject } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Filter, Plus, Search, FileText, Download, FolderOpen, CalendarIcon, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Schema for document upload
const documentFormSchema = insertDocumentSchema.extend({
  title: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  fileUrl: z.string().min(1, "URL файла обязателен"),
  schoolId: z.number().optional().nullable(),
  classId: z.number().optional().nullable(),
  subjectId: z.number().optional().nullable(),
});

export default function DocumentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | "all">("all");
  const [selectedClassId, setSelectedClassId] = useState<number | "all">("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | "all">("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Fetch documents
  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    enabled: !!user
  });
  
  // Fetch schools
  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ["/api/schools"],
    enabled: !!user
  });
  
  // Fetch classes
  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    enabled: !!user
  });
  
  // Fetch subjects
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: !!user
  });
  
  // Form for uploading documents
  const form = useForm<z.infer<typeof documentFormSchema>>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      title: "",
      description: "",
      fileUrl: "",
      schoolId: null,
      classId: null,
      subjectId: null,
    },
  });
  
  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof documentFormSchema>) => {
      const res = await apiRequest("POST", "/api/documents", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Документ загружен",
        description: "Документ успешно загружен",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось загрузить документ",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: z.infer<typeof documentFormSchema>) => {
    uploadDocumentMutation.mutate(values);
  };
  
  // Filter documents based on filters and search
  const filteredDocuments = documents.filter(doc => {
    const schoolMatches = selectedSchoolId === "all" || 
                        (doc.schoolId === null && selectedSchoolId === "all") || 
                        doc.schoolId === selectedSchoolId;
                        
    const classMatches = selectedClassId === "all" || 
                       (doc.classId === null && selectedClassId === "all") || 
                       doc.classId === selectedClassId;
                       
    const subjectMatches = selectedSubjectId === "all" || 
                         (doc.subjectId === null && selectedSubjectId === "all") || 
                         doc.subjectId === selectedSubjectId;
                         
    const searchMatches = !searchQuery || 
                        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
                        
    return schoolMatches && classMatches && subjectMatches && searchMatches;
  });
  
  // Helper functions to get names
  const getSchoolName = (id: number | null) => {
    if (id === null) return "-";
    const school = schools.find(s => s.id === id);
    return school ? school.name : `Школа ${id}`;
  };
  
  const getClassName = (id: number | null) => {
    if (id === null) return "-";
    const cls = classes.find(c => c.id === id);
    return cls ? cls.name : `Класс ${id}`;
  };
  
  const getSubjectName = (id: number | null) => {
    if (id === null) return "-";
    const subject = subjects.find(s => s.id === id);
    return subject ? subject.name : `Предмет ${id}`;
  };
  
  // Get file type icon based on file extension
  const getFileIcon = (fileUrl: string) => {
    const extension = fileUrl.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <FileText className="h-5 w-5 text-green-500" />;
      case 'ppt':
      case 'pptx':
        return <FileText className="h-5 w-5 text-orange-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Format file size (not actually used since we don't have file size info)
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  };
  
  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-gray-800">Документы</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Загрузить документ
        </Button>
      </div>
      
      {/* Filters and search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Поиск документов..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select
          value={selectedSchoolId.toString()}
          onValueChange={(value) => setSelectedSchoolId(value === "all" ? "all" : parseInt(value))}
        >
          <SelectTrigger>
            <div className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Все школы" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все школы</SelectItem>
            {schools.map((school) => (
              <SelectItem key={school.id} value={school.id.toString()}>
                {school.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select
          value={selectedClassId.toString()}
          onValueChange={(value) => setSelectedClassId(value === "all" ? "all" : parseInt(value))}
        >
          <SelectTrigger>
            <div className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Все классы" />
            </div>
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
          value={selectedSubjectId.toString()}
          onValueChange={(value) => setSelectedSubjectId(value === "all" ? "all" : parseInt(value))}
        >
          <SelectTrigger>
            <div className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Все предметы" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все предметы</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id.toString()}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Documents */}
      {isLoading ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 text-primary mx-auto animate-pulse" />
          <p className="mt-4 text-gray-500">Загрузка документов...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="pt-6">
            <FolderOpen className="h-12 w-12 text-gray-300 mx-auto" />
            <p className="mt-4 text-gray-500">
              {searchQuery || selectedSchoolId !== "all" || selectedClassId !== "all" || selectedSubjectId !== "all" 
                ? "Документы не найдены" 
                : "Нет загруженных документов"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Школа</TableHead>
                <TableHead>Класс</TableHead>
                <TableHead>Предмет</TableHead>
                <TableHead>Дата загрузки</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center">
                      {getFileIcon(doc.fileUrl)}
                      <span className="ml-2 font-medium">{doc.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {doc.description || "-"}
                  </TableCell>
                  <TableCell>{getSchoolName(doc.schoolId)}</TableCell>
                  <TableCell>{getClassName(doc.classId)}</TableCell>
                  <TableCell>{getSubjectName(doc.subjectId)}</TableCell>
                  <TableCell>
                    {new Date(doc.uploadedAt).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell>
                    <a 
                      href={doc.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="ghost">
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Скачать</span>
                      </Button>
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Upload Document Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Загрузить документ</DialogTitle>
            <DialogDescription>
              Заполните информацию о документе
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название</FormLabel>
                    <FormControl>
                      <Input placeholder="Название документа" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание (необязательно)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Описание документа" 
                        className="resize-none" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fileUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL файла</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input placeholder="URL документа" {...field} />
                        <Button type="button" variant="outline" className="ml-2">
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="schoolId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Школа (необязательно)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите школу" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Не выбрано</SelectItem>
                          {schools.map((school) => (
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
                
                <FormField
                  control={form.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Класс (необязательно)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите класс" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Не выбрано</SelectItem>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id.toString()}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Предмет (необязательно)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите предмет" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Не выбрано</SelectItem>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={uploadDocumentMutation.isPending}>
                  {uploadDocumentMutation.isPending ? 'Загрузка...' : 'Загрузить документ'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
