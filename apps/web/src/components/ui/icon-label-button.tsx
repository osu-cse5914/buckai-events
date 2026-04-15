import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function IconLabelButton({
  icon,
  className,
  children,
  ...props
}: ComponentProps<typeof Button> & {
  icon: ReactNode;
}) {
  return (
    <Button className={cn("h-11 rounded-xl px-4", className)} {...props}>
      {icon}
      {children}
    </Button>
  );
}
