import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function IconCircleButton({
  icon,
  className,
  children,
  ...props
}: ComponentProps<typeof Button> & {
  icon: ReactNode;
}) {
  return (
    <Button size="icon" className={cn("size-9 rounded-full", className)} {...props}>
      {props.asChild ? (
        children
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </Button>
  );
}
