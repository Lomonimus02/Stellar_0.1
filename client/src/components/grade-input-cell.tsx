import React, { useState } from 'react';
import { PlusCircle, X } from 'lucide-react';
import { Grade } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface GradeInputCellProps {
  studentId: number;
  scheduleId: number;
  assignmentId: number;
  existingGrade?: Grade;
  assignmentType: string;
  maxScore: number;
  canEdit: boolean;
  onSave: (studentId: number, scheduleId: number, assignmentId: number, value: string) => void;
  onDelete?: (gradeId: number) => void;
  bgColor?: string;
}

export const GradeInputCell: React.FC<GradeInputCellProps> = ({
  studentId,
  scheduleId,
  assignmentId,
  existingGrade,
  assignmentType,
  maxScore,
  canEdit,
  onSave,
  onDelete,
  bgColor = 'bg-white/80',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(existingGrade ? existingGrade.grade.toString() : '');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const validateGrade = (value: string): boolean => {
    // Преобразуем значение в число
    const gradeValue = parseFloat(value);
    
    // Проверяем, что это число
    if (isNaN(gradeValue)) {
      setError('Оценка должна быть числом');
      return false;
    }
    
    // Проверяем, что оценка не меньше 0
    if (gradeValue < 0) {
      setError('Оценка не может быть отрицательной');
      return false;
    }
    
    // Проверяем, что оценка не больше максимального балла
    if (gradeValue > maxScore) {
      const errorMessage = `Оценка не может быть больше ${maxScore} баллов`;
      setError(errorMessage);
      toast({
        title: "Ошибка при сохранении",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    }
    
    // Сбрасываем ошибку, если проверка прошла успешно
    setError(null);
    return true;
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      // Валидируем оценку перед сохранением
      if (validateGrade(inputValue)) {
        onSave(studentId, scheduleId, assignmentId, inputValue);
        setIsEditing(false);
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setInputValue(existingGrade ? existingGrade.grade.toString() : '');
      setError(null);
      setIsEditing(false);
    }
  };

  if (!canEdit && !existingGrade) {
    return <div className="h-7"></div>;
  }

  if (isEditing || (!existingGrade && canEdit)) {
    return (
      <div className="flex flex-col items-center justify-center">
        <input
          type="text"
          className={`w-10 h-7 text-center border rounded focus:outline-none focus:ring-1 ${error ? 'border-red-500 focus:ring-red-500' : 'focus:ring-primary'} ${existingGrade ? '' : 'border-dashed bg-transparent'}`}
          value={inputValue}
          placeholder={existingGrade ? existingGrade.grade.toString() : `/${maxScore}`}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          title={`Введите оценку (до ${maxScore} баллов)`}
          autoFocus
        />
        {error && (
          <span className="text-xs text-red-500 absolute mt-8">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative group flex items-center justify-center">
      {existingGrade ? (
        <>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-pointer ${bgColor}`}
            title={`Оценка ${existingGrade.grade} из ${maxScore}. Нажмите для редактирования.`}
            onClick={() => canEdit && setIsEditing(true)}
          >
            {existingGrade.grade}
          </span>

          {canEdit && onDelete && (
            <button
              className="text-red-500 hover:text-red-700 ml-1 focus:outline-none invisible group-hover:visible"
              onClick={() => {
                if (window.confirm("Вы уверены, что хотите удалить эту оценку?")) {
                  onDelete(existingGrade.id);
                }
              }}
              title="Удалить оценку"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </>
      ) : canEdit ? (
        // Для пустой ячейки показываем просто текстовое поле для ввода
        <div 
          className="w-10 h-7 border border-dashed rounded flex items-center justify-center text-gray-400 cursor-pointer hover:border-primary hover:text-primary transition-colors"
          onClick={() => setIsEditing(true)}
          title="Нажмите для добавления оценки"
        >
          {`/${maxScore}`}
        </div>
      ) : null}
    </div>
  );
};