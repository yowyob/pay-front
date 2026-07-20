import { cn } from "@/lib/utils";
import * as React from "react";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "yypay:flex yypay:h-10 yypay:w-full yypay:rounded-lg yypay:border yypay:border-border yypay:bg-card yypay:px-3 yypay:py-2 yypay:text-sm yypay:text-foreground yypay:placeholder:text-muted-foreground/70 focus-visible:yypay:outline-none focus-visible:yypay:ring-2 focus-visible:yypay:ring-primary/30 disabled:yypay:cursor-not-allowed disabled:yypay:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
