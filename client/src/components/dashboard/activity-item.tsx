import { LucideIcon } from "lucide-react";

interface ActivityItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  time: string;
}

export function ActivityItem({ icon: Icon, title, description, time }: ActivityItemProps) {
  return (
    <div className="flex items-start">
      <div className="bg-primary-50 p-2 rounded-full mr-3">
        <Icon className="h-4 w-4 text-primary-dark" />
      </div>
      <div>
        <p className="text-sm text-gray-800">
          {title} <span className="font-medium">{description}</span>
        </p>
        <p className="text-xs text-gray-500">{time}</p>
      </div>
    </div>
  );
}
