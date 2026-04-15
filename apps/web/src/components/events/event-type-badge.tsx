import type { ComponentProps } from "react";
import { TYPE_STYLES } from "@/lib/event-utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function readEventTypeLabel(type: string) {
  switch (type) {
    case "EVENT":
      return "Event";
    case "GIG":
      return "Gig";
    default:
      return type;
  }
}

export function EventTypeBadge({
  type,
  className,
  ...props
}: ComponentProps<typeof Badge> & {
  type: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(TYPE_STYLES[type] ?? "", className)}
      {...props}
    >
      {readEventTypeLabel(type)}
    </Badge>
  );
}
