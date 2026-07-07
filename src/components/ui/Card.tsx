import { HTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[2rem] border border-gray-100/50 bg-white text-gray-900 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden",
        className
      )}
      {...props}
    />
  )
);

Card.displayName = "Card";

export { Card };
