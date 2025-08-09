"use client";

import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: "primary" | "outline" | "secondary";
  size: "lg" | "sm";
}

export const Button = ({
  size,
  variant,
  className,
  children,
  ...props 
}: ButtonProps) => {
  return (
    <button
      className={`${className}
        ${variant === "primary" ? "bg-primary cursor-pointer" : variant == "secondary" ? "bg-secondary cursor-pointer text-secondary-foreground shadow-sm hover:bg-secondary/80" : "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground"}
        ${size === "lg" ? "px-4 py-2" : "px-2 py-1"}
        /* This line adds styling for the disabled state, making it visually clear. */
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      {...props}
    >
      {children}
    </button>
  );
};