import { cn } from "@/lib/utils";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as React from "react";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "yypay:shrink-0 yypay:bg-border",
        orientation === "horizontal"
          ? "yypay:h-px yypay:w-full"
          : "yypay:h-full yypay:w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
