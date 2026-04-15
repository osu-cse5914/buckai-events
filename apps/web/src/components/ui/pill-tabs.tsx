import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PillTabs({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap gap-2", className)} {...props} />;
}

export function PillTabButton({
  active = false,
  className,
  ...props
}: ComponentProps<typeof Button> & {
  active?: boolean;
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      className={cn("rounded-full px-4", active && "pointer-events-none", className)}
      {...props}
    />
  );
}
