// client/src/components/subjects-management/class-card.tsx
import React, { useEffect, useState } from "react"; // Import React, useEffect, useState
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Class } from "@shared/schema";
import { Home, Users } from "lucide-react";

interface ClassCardProps {
  classData: Class;
  onClick: (classData: Class) => void;
}

// Wrapped with React.memo for performance optimization
export const ClassCard = React.memo(({ classData, onClick }: ClassCardProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50); // Adjust delay for staggered effect if needed, or 0 for immediate
    return () => clearTimeout(timer);
  }, []);

  // If studentCount were derived from classData or another prop, useMemo might be beneficial.
  // For now, it's a static placeholder.
  const studentCount = 0; // Placeholder for student count

  return (
    <div
      className={`cursor-pointer h-full group transition-all duration-500 ease-out 
                 ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-5 scale-95'} 
                 [perspective:1000px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 rounded-2xl`}
      onClick={() => onClick(classData)}
      tabIndex={0} // Делаем div фокусируемым для доступности
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(classData) }}
    >
      <Card className="flex flex-col h-full justify-between transition-all duration-300 ease-in-out 
                     p-6 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl 
                     shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] 
                     border border-white/20 
                     group-hover:border-blue-400/50 group-hover:rotate-x-1 group-hover:-rotate-y-1 group-hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.22),_0_18px_36px_-18px_rgba(0,0,0,0.18)]">
        <CardHeader className="p-0 relative z-10 mb-3"> {/* Adjusted padding & margin */}
          <CardTitle className="text-lg font-semibold flex items-center gap-2.5 text-slate-800">
            <Home className="h-7 w-7 text-green-600 flex-shrink-0 [filter:drop-shadow(0_1px_1.5px_rgba(0,0,0,0.15))]" strokeWidth={1.75} />
            <span className="truncate" title={classData.name}>{classData.name}</span>
          </CardTitle>
          <CardDescription className="text-sm text-slate-600 mt-0.5">
            {classData.gradeLevel} класс • {classData.academicYear}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex-grow"> {/* Adjusted padding */}
          <div className="flex items-center text-sm text-slate-700">
            <Users className="h-4 w-4 mr-1.5 text-slate-500 flex-shrink-0" strokeWidth={1.75} />
            <span>Учеников: {studentCount}</span> {/* Displaying student count */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});