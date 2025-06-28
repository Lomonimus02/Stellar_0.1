import { ActivityItem } from "./activity-item";
import { UserPlusIcon, PencilIcon, RefreshCwIcon, LogInIcon } from "lucide-react";
import { Link } from "wouter";

export function RecentActivity() {
  const activities = [
    {
      icon: UserPlusIcon,
      title: "Добавлен новый пользователь",
      description: "Иванов И. И.",
      time: "2 часа назад"
    },
    {
      icon: PencilIcon,
      title: "Изменено расписание в",
      description: "Школа №1",
      time: "3 часа назад"
    },
    {
      icon: RefreshCwIcon,
      title: "Обновление системы до версии",
      description: "2.4.0",
      time: "5 часов назад"
    },
    {
      icon: LogInIcon,
      title: "Вход администратора",
      description: "Петров И. И.",
      time: "6 часов назад"
    }
  ];
  
  return (
    <div className="p-4 bg-slate-200/15 backdrop-filter backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),_0_15px_30px_-20px_rgba(0,0,0,0.12)] border border-white/20">
      <h3 className="text-xl font-semibold text-slate-700 mb-4">Последние действия</h3>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {activities.map((activity, index) => (
          <ActivityItem 
            key={index}
            icon={activity.icon}
            title={activity.title}
            description={activity.description}
            time={activity.time}
          />
        ))}
      </div>
      <div className="mt-4 text-center">
        <Link href="/system-logs" className="text-sm text-[rgb(2,191,122)] hover:text-[rgb(2,191,122)]/80 hover:underline">
          Все действия
        </Link>
      </div>
    </div>
  );
}

