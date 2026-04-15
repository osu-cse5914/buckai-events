import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function YouSubpageHeader({
  title,
  description,
  action,
  showBackLink = true,
  backTo = "/you",
  backLabel = "Back to You",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  showBackLink?: boolean;
  backTo?: "/you" | "/you/collections";
  backLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-3">
        {showBackLink ? (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="-ml-3 w-fit px-3 text-muted-foreground"
          >
            <Link to={backTo}>
              <ArrowLeftIcon className="size-4" />
              {backLabel}
            </Link>
          </Button>
        ) : null}

        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function YouSubpageHeaderSkeleton({
  action,
}: {
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-3">
        <Skeleton className="h-8 w-28 rounded-md" />

        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
