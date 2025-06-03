import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useQuery } from "@tanstack/react-query";
import { SystemLog } from "@shared/schema";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileDown, Filter } from "lucide-react";

export default function SystemLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  // Fetch system logs
  const { data: logs = [], isLoading } = useQuery<SystemLog[]>({
    queryKey: ["/api/system-logs"],
  });

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.userId.toString().includes(searchQuery);
    
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  // Get unique actions for filter 
  const actionsSet = new Set<string>();
  logs.forEach(log => {
    if (log.action) {
      actionsSet.add(log.action);
    }
  });
  const uniqueActions = Array.from(actionsSet);

  // Format date
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return format(date, 'dd.MM.yyyy HH:mm:ss');
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Журнал системных действий</h1>
          <Button 
            variant="outline"
            onClick={() => {
              // Создаем CSV содержимое
              let csvContent = "Дата и время,Пользователь ID,Действие,IP адрес,Детали\n";
              
              filteredLogs.forEach(log => {
                const date = formatDate(log.createdAt);
                const userId = log.userId;
                const action = log.action?.replace(/,/g, ';');
                const ip = log.ipAddress || '-';
                const details = log.details?.replace(/,/g, ';') || '-';
                
                csvContent += `${date},${userId},${action},${ip},${details}\n`;
              });
              
              // Создаем блоб и ссылку для скачивания
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              
              // Устанавливаем атрибуты ссылки
              const fileName = `system-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
              link.setAttribute('href', url);
              link.setAttribute('download', fileName);
              link.style.visibility = 'hidden';
              
              // Добавляем ссылку в DOM, кликаем по ней и удаляем
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Экспорт
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Поиск в журнале..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="w-full md:w-64">
            <Select
              value={actionFilter}
              onValueChange={(value) => setActionFilter(value)}
            >
              <SelectTrigger>
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Фильтр по действию" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все действия</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата и время</TableHead>
                <TableHead>Пользователь ID</TableHead>
                <TableHead>Действие</TableHead>
                <TableHead>IP адрес</TableHead>
                <TableHead>Детали</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    Загрузка...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    {searchQuery || actionFilter !== "all" ? "Записи не найдены" : "Нет записей в журнале"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDate(log.createdAt)}</TableCell>
                    <TableCell>{log.userId}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.ipAddress || '-'}</TableCell>
                    <TableCell>{log.details || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}