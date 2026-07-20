import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "yypay:animate-pulse yypay:rounded-md yypay:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
