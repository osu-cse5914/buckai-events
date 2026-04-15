import { Skeleton } from "@/components/ui/skeleton";
import { FramedList, FramedListItem, FramedListItems } from "@/components/ui/framed-list";

export function ApplicationsListSkeleton({
  count = 3,
  showActions = false,
}: {
  count?: number;
  showActions?: boolean;
}) {
  return (
    <div className="mt-8">
      <FramedList>
        <FramedListItems>
          {Array.from({ length: count }).map((_, index) => (
            <FramedListItem key={index}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              {showActions ? (
                <div className="mt-4 flex gap-2 border-t pt-4">
                  <Skeleton className="h-9 w-20 rounded-md" />
                  <Skeleton className="h-9 w-20 rounded-md" />
                </div>
              ) : null}
            </FramedListItem>
          ))}
        </FramedListItems>
      </FramedList>
    </div>
  );
}
