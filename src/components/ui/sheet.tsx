import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";

function Sheet({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />;
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger {...props} />;
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close {...props} />;
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "yypay:fixed yypay:inset-0 yypay:z-50 yypay:bg-black/50",
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        className={cn(
          "yypay:fixed yypay:z-50 yypay:flex yypay:flex-col yypay:bg-card yypay:shadow-lg yypay:transition yypay:ease-in-out",
          side === "right" &&
            "yypay:inset-y-0 yypay:right-0 yypay:h-full yypay:w-full yypay:max-w-md yypay:border-l yypay:border-border sm:yypay:max-w-lg",
          side === "bottom" &&
            "yypay:inset-x-0 yypay:bottom-0 yypay:h-auto yypay:max-h-[85vh] yypay:rounded-t-xl yypay:border-t yypay:border-border md:yypay:hidden",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="yypay:absolute yypay:right-4 yypay:top-4 yypay:rounded-sm yypay:text-secondary hover:yypay:text-foreground">
          <X className="yypay:h-4 yypay:w-4" />
          <span className="yypay:sr-only">Fermer</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "yypay:flex yypay:flex-col yypay:gap-2 yypay:p-6 yypay:pb-0",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("yypay:text-lg yypay:font-semibold yypay:text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("yypay:text-sm yypay:text-muted-foreground", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "yypay:mt-auto yypay:flex yypay:flex-col yypay:gap-4 yypay:p-6 yypay:pt-6",
        className,
      )}
      {...props}
    />
  );
}

export {
    Sheet, SheetClose,
    SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger
};
