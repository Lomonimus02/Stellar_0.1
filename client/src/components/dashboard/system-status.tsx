import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export function SystemStatus() {
  return (
    <div className="p-4 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20">
      <h3 className="text-xl font-semibold text-slate-700 mb-4">Системная информация</h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-slate-600">CPU</span>
            <span className="text-sm font-medium text-slate-600">24%</span>
          </div>
          <Progress value={24} className="h-2 bg-slate-500/30" indicatorClassName="bg-[rgb(2,191,122)]" />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-slate-600">Память</span>
            <span className="text-sm font-medium text-slate-600">42%</span>
          </div>
          <Progress value={42} className="h-2 bg-slate-500/30" indicatorClassName="bg-[rgb(2,191,122)]" />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-slate-600">Диск</span>
            <span className="text-sm font-medium text-slate-600">68%</span>
          </div>
          <Progress value={68} className="h-2 bg-slate-500/30" indicatorClassName="bg-[rgb(2,191,122)]" />
        </div>
        <div className="pt-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600">Последнее резервное копирование</span>
            <Badge variant="outline" className="bg-[rgb(2,191,122)]/10 text-[rgb(2,191,122)] border border-[rgb(2,191,122)]/30 rounded-full px-3 py-1 text-xs">
              Сегодня 08:45
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
