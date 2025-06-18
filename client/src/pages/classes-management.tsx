// client/src/pages/classes-management.tsx
import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useRoleCheck } from "@/hooks/use-role-check";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ClassWithStudentCount } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { School, Users, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function ClassesManagementPage() {
  const { user } = useAuth();
  const { isPrincipal, isVicePrincipal, isSchoolAdmin } = useRoleCheck();
  const [, navigate] = useLocation();

  // State for filters
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");

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

  // School ID
  const schoolId = user?.schoolId || null;

  // Data fetching queries
  const { data: classes = [], isLoading: classesLoading } = useQuery<ClassWithStudentCount[]>({
    queryKey: ["/api/classes", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const res = await apiRequest(`/api/classes`);
      const data = await res.json();
      return data;
    },
    enabled: !!schoolId && hasAccess,
  });



  // Filtered classes based on search and grade filter
  const filteredClasses = useMemo(() => {
    return classes.filter(classItem => {
      const matchesSearch = classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           classItem.gradeLevel.toString().includes(searchTerm);
      const matchesGrade = gradeFilter === "all" || classItem.gradeLevel.toString() === gradeFilter;
      return matchesSearch && matchesGrade;
    });
  }, [classes, searchTerm, gradeFilter]);

  // Get unique grade levels for filter
  const gradeOptions = useMemo(() => {
    const grades = [...new Set(classes.map(c => c.gradeLevel))].sort((a, b) => a - b);
    return grades.map(grade => ({ value: grade.toString(), label: `${grade} класс` }));
  }, [classes]);

  // Event handlers
  const handleClassClick = useCallback((classItem: ClassWithStudentCount) => {
    navigate(`/classes-management/${classItem.id}`);
  }, [navigate]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Управление классами</h1>
              <p className="text-gray-600">
                Просмотр и управление классами школы
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск классов..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Фильтр по классу" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все классы</SelectItem>
              {gradeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {classesLoading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))
          ) : filteredClasses.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <School className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Классы не найдены</h3>
              <p className="text-gray-600">
                {searchTerm || gradeFilter !== "all" 
                  ? "Попробуйте изменить параметры поиска" 
                  : "В вашей школе пока нет классов"}
              </p>
            </div>
          ) : (
            filteredClasses.map((classItem) => (
              <ClassCard
                key={classItem.id}
                classData={classItem}
                onClick={handleClassClick}
              />
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}

// ClassCard Component
interface ClassCardProps {
  classData: ClassWithStudentCount;
  onClick: (classData: ClassWithStudentCount) => void;
}

const ClassCard = ({ classData, onClick }: ClassCardProps) => {
  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
      onClick={() => onClick(classData)}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <School className="h-5 w-5 text-blue-600" />
          {classData.name}
        </CardTitle>
        <CardDescription>
          {classData.gradeLevel} класс • {classData.academicYear}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>Учеников: {classData.studentCount || 0}</span>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            {classData.gradingSystem === 'five_point' ? '5-балльная' : 'Накопительная'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
