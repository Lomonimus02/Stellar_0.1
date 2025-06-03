import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { MainLayout } from '@/components/layout/main-layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, ArrowLeft } from 'lucide-react';
import { UserRoleEnum } from '@shared/schema';
import UserRolesManager from '@/components/dashboard/user-roles-manager';

type User = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRoleEnum;
  schoolId: number | null;
};

const UserRolesPage: React.FC = () => {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Fetch users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Filter users by search term
  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get role label
  const getRoleLabel = (role: UserRoleEnum) => {
    const roleLabels: Record<UserRoleEnum, string> = {
      [UserRoleEnum.SUPER_ADMIN]: 'Суперадминистратор',
      [UserRoleEnum.SCHOOL_ADMIN]: 'Администратор школы',
      [UserRoleEnum.TEACHER]: 'Учитель',
      [UserRoleEnum.STUDENT]: 'Ученик',
      [UserRoleEnum.PARENT]: 'Родитель',
      [UserRoleEnum.PRINCIPAL]: 'Директор',
      [UserRoleEnum.VICE_PRINCIPAL]: 'Завуч',
    };
    return roleLabels[role] || role;
  };

  // Get role badge variant
  const getRoleBadgeVariant = (role: UserRoleEnum) => {
    const roleBadgeVariants: Record<UserRoleEnum, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      [UserRoleEnum.SUPER_ADMIN]: 'destructive',
      [UserRoleEnum.SCHOOL_ADMIN]: 'destructive',
      [UserRoleEnum.TEACHER]: 'default',
      [UserRoleEnum.STUDENT]: 'secondary',
      [UserRoleEnum.PARENT]: 'secondary',
      [UserRoleEnum.PRINCIPAL]: 'default',
      [UserRoleEnum.VICE_PRINCIPAL]: 'default',
    };
    return roleBadgeVariants[role] || 'default';
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Управление ролями пользователей</h1>
          <Button variant="outline" onClick={() => setLocation('/users')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Вернуться к пользователям
          </Button>
        </div>

        {selectedUserId ? (
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => setSelectedUserId(null)}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Вернуться к списку пользователей
            </Button>
            <UserRolesManager userId={selectedUserId} />
          </div>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Поиск пользователей</CardTitle>
                <CardDescription>
                  Найдите пользователей для управления их ролями
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Поиск по имени, фамилии, логину или email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Пользователи</CardTitle>
                <CardDescription>
                  Выберите пользователя для управления его ролями
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">Пользователи не найдены</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Имя пользователя</TableHead>
                        <TableHead>ФИО</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Основная роль</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {getRoleLabel(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedUserId(user.id)}
                            >
                              <UserPlus className="mr-2 h-4 w-4" />
                              Управление ролями
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default UserRolesPage;