import { cn } from "@/lib/utils";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "yypay:text-sm yypay:font-medium yypay:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
