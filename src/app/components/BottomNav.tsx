import type { ReactNode } from "react";
import { BookOpen, Home, ListChecks, Plus, Trees } from "lucide-react";
import type { Tab } from "../navigation";

export interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  homeCount: number;
  gardenCount: number;
}

export function BottomNav({ active, onChange, homeCount, gardenCount }: BottomNavProps) {
  const tabs: { id: Tab; icon: ReactNode; label: string; badge?: number }[] = [
    { id: "home",      icon: <Home size={20} />,      label: "Дом",      badge: homeCount },
    { id: "garden",    icon: <Trees size={20} />,     label: "Сад",      badge: gardenCount },
    { id: "catalog",   icon: <BookOpen size={20} />,  label: "Каталог" },
    { id: "checklist", icon: <ListChecks size={20} />,label: "Чек-лист" },
    { id: "add",       icon: <Plus size={22} />,      label: "Добавить" },
  ];

  return (
    <nav className="bottom-nav fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border z-30 flex">
      {tabs.map(tab => (
        <button
          key={tab.id} onClick={() => onChange(tab.id)}
          className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors ${
            active === tab.id ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {tab.id === "add" ? (
            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              active === "add" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
            }`}>
              {tab.icon}
            </div>
          ) : (
            <div className="relative">
              {tab.icon}
              {tab.badge != null && tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </div>
          )}
          <span className="text-[9px] font-medium leading-none mt-0.5">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
