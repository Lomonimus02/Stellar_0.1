import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, className }: StatCardProps) {
  return (
    <div className={cn("p-4 flex items-center bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20", className)}>
      <div className="bg-[rgb(2,191,122)]/20 p-3 rounded-full">
        <Icon className="h-5 w-5 text-[rgb(2,191,122)]" />
      </div>
      <div className="ml-4">
        <h3 className="text-sm font-medium text-slate-500">{title}</h3>
        <p className="text-xl font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}
