// client/src/components/subjects-management/subject-subgroup-card.tsx
import React, { useMemo, useEffect, useState } from "react"; // Import React, useEffect, useState
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Subject, Subgroup, Class } from "@shared/schema";
import { BookOpen, Users, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
// Badge is imported but not used, consider removing if not planned for future use. For now, let's keep it.
import { Badge } from "@/components/ui/badge";


// Добавляем тип для элемента списка (Type for the list item)
export type SubjectSubgroupItem = Subject | (Subgroup & { isSubgroup: boolean });

interface SubjectSubgroupCardProps {
  item: SubjectSubgroupItem;
  classes: Class[];
  subjects: Subject[];
  onClick: (item: SubjectSubgroupItem) => void; // Обработчик клика по карточке
  onEdit: (item: SubjectSubgroupItem) => void; // Обработчик редактирования
  onDelete: (item: SubjectSubgroupItem) => void; // Handler for deletion
}

// Wrapped with React.memo for performance optimization
export const SubjectSubgroupCard = React.memo(({ item, classes, subjects, onClick, onEdit, onDelete }: SubjectSubgroupCardProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Slight delay to allow the card to be in the DOM before starting the transition
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50); // Adjust delay as needed, or set to 0 for immediate transition on next tick
    return () => clearTimeout(timer);
  }, []);

  const isSubgroup = 'isSubgroup' in item;

  const className = useMemo(() => {
    if (isSubgroup) {
      const cls = classes.find(c => c.id === item.classId);
      return cls ? cls.name : `Класс ${item.classId}`;
    }
    return null;
  }, [item, classes, isSubgroup]);

  // Обернем Card в div с onClick
  return (
    <div
      className={`cursor-pointer h-full group transition-all duration-500 ease-out 
                 ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-5 scale-95'} 
                 [perspective:1000px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(2,191,122)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 rounded-2xl`}
      onClick={() => onClick(item)}
      tabIndex={0} // Делаем div фокусируемым для доступности
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(item) }}
    >
      <Card className="flex flex-col h-full transition-all duration-300 ease-in-out 
                     p-6 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl 
                     shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] 
                     border border-white/20 
                     group-hover:border-[rgb(2,191,122)]/50 group-hover:rotate-x-1 group-hover:-rotate-y-1 group-hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.22),_0_18px_36px_-18px_rgba(0,0,0,0.18)]">
                     {/* Removed border-t-white/60 as new border is sufficient. Adjusted hover shadow. */}
        <CardHeader className="p-0 mb-3 relative z-10"> {/* Adjusted padding as p-6 is on Card */}
          <CardTitle className="text-lg font-semibold flex items-center gap-2.5 text-slate-800"> {/* Adjusted size and gap */}
            {isSubgroup 
              ? <Users className="h-7 w-7 text-purple-600 flex-shrink-0 [filter:drop-shadow(0_1px_1.5px_rgba(0,0,0,0.15))]" strokeWidth={1.75} /> 
              : <BookOpen className="h-7 w-7 text-[rgb(2,191,122)] flex-shrink-0 [filter:drop-shadow(0_1px_1.5px_rgba(0,0,0,0.15))]" strokeWidth={1.75} />}
            <span className="truncate" title={item.name}>{item.name}</span>
          </CardTitle>
          <CardDescription className="text-sm text-slate-600 mt-0.5"> {/* Added small margin-top */}
            {isSubgroup ? `Подгруппа класса ${className}` : "Предмет"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow p-0 mb-3"> {/* Adjusted padding */}
          <p className="text-sm text-slate-700 line-clamp-3">
            {item.description || (isSubgroup ? "Нет описания подгруппы" : "Нет описания предмета")}
          </p>
        </CardContent>
        <CardFooter className="p-0 flex justify-end gap-1.5 items-center"> {/* Adjusted padding and gap */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full p-1.5 bg-black/5 hover:bg-black/10 backdrop-filter backdrop-blur-sm hover:backdrop-blur-md border border-white/10 text-slate-700 hover:text-[rgb(2,191,122)] focus-visible:bg-black/10 focus-visible:text-[rgb(2,191,122)] focus-visible:ring-2 focus-visible:ring-[rgb(2,191,122)]/70 focus-visible:ring-offset-0 focus-visible:outline-none transition-all duration-150 ease-in-out"
            aria-label="Редактировать" 
            title="Редактировать"
            onClick={(e) => {
              e.stopPropagation(); 
              onEdit(item);
            }}
          >
            <Pencil className="h-4 w-4" strokeWidth={2} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full p-1.5 bg-black/5 hover:bg-black/10 backdrop-filter backdrop-blur-sm hover:backdrop-blur-md border border-white/10 text-slate-700 hover:text-red-600 focus-visible:bg-black/10 focus-visible:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500/70 focus-visible:ring-offset-0 focus-visible:outline-none transition-all duration-150 ease-in-out"
            aria-label="Удалить"
            title="Удалить"
            onClick={(e) => {
              e.stopPropagation(); 
              onDelete(item);
            }}
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
});