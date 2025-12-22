import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { LiveIndicator } from "./LiveIndicator";

interface DataCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  live?: boolean;
  maxHeight?: string;
}

export function DataCard({ title, icon, children, className, live = true, maxHeight = "400px" }: DataCardProps) {
  return (
    <div className={cn(
      "border-gradient rounded-lg bg-card overflow-hidden",
      "transition-all duration-300 hover:border-primary/30",
      className
    )}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/30">
        <div className="flex items-center gap-2">
          {icon && <span className="text-primary">{icon}</span>}
          <h3 className="font-medium text-sm text-foreground">{title}</h3>
        </div>
        {live && <LiveIndicator />}
      </div>
      <div 
        className="p-3 overflow-y-auto scrollbar-thin"
        style={{ maxHeight }}
      >
        {children}
      </div>
    </div>
  );
}
