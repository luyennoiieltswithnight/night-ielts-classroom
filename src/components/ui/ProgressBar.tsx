import React from "react";
import { cn } from "../../lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  color?: string;
}

export const ProgressBar = React.memo(({ value, max, className, color = "bg-pastel-green-500" }: ProgressBarProps) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("h-3 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner", className)}>
      <div
        className={cn("h-full transition-all duration-700 ease-out rounded-full", color)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
});
