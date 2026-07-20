import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const buttonVariants = cva(
  "yypay:inline-flex yypay:items-center yypay:justify-center yypay:gap-2 yypay:whitespace-nowrap yypay:rounded-lg yypay:text-sm yypay:font-medium yypay:transition-colors yypay:disabled:pointer-events-none yypay:disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "yypay:bg-primary yypay:text-primary-foreground hover:yypay:bg-primary/90",
        secondary:
          "yypay:bg-muted yypay:text-foreground hover:yypay:bg-border",
        outline:
          "yypay:border yypay:border-primary yypay:bg-card yypay:text-primary hover:yypay:bg-accent",
        ghost: "hover:yypay:bg-muted yypay:text-foreground",
        navy: "yypay:bg-foreground yypay:text-background hover:yypay:opacity-90",
      },
      size: {
        default: "yypay:h-10 yypay:px-4 yypay:py-2",
        sm: "yypay:h-8 yypay:px-3 yypay:text-xs",
        lg: "yypay:h-12 yypay:px-6 yypay:text-base",
        icon: "yypay:h-10 yypay:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
