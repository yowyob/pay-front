import { cn } from "@/lib/utils";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      className={cn("yypay:flex yypay:flex-col yypay:gap-4", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "yypay:inline-flex yypay:h-10 yypay:w-full yypay:items-center yypay:justify-center yypay:rounded-lg yypay:bg-muted yypay:p-1",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "yypay:inline-flex yypay:flex-1 yypay:items-center yypay:justify-center yypay:rounded-md yypay:px-3 yypay:py-1.5 yypay:text-sm yypay:font-medium yypay:text-muted-foreground yypay:transition-all data-[state=active]:yypay:bg-primary data-[state=active]:yypay:text-primary-foreground data-[state=active]:yypay:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("yypay:flex yypay:flex-col yypay:gap-4", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };

