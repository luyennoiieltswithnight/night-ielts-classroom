import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md active:scale-95',
      secondary: 'bg-white text-gray-900 border border-gray-100 hover:bg-gray-50 shadow-sm hover:shadow-md active:scale-95',
      outline: 'bg-transparent text-indigo-600 border-2 border-indigo-100 hover:bg-indigo-50 active:scale-95',
      ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:scale-95',
      danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-md active:scale-95',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-5 py-2.5',
      lg: 'px-8 py-4 text-lg',
      icon: 'p-2.5',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-2xl font-bold tracking-tight transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
