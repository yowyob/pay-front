import { cn } from "@/lib/utils";
import * as React from "react";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "yypay:flex yypay:h-10 yypay:w-full yypay:rounded-lg yypay:border yypay:border-border yypay:bg-card yypay:px-3 yypay:py-2 yypay:text-sm yypay:text-foreground yypay:placeholder:text-muted-foreground/70 yypay:focus-visible:outline-none yypay:focus-visible:ring-2 yypay:focus-visible:ring-primary/30 yypay:disabled:cursor-not-allowed yypay:disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
