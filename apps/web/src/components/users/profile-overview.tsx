import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FramedList, FramedListInset, FramedListItems } from "@/components/ui/framed-list";
import { STANDARD_PAGE_WIDTH } from "@/lib/page-layout";
import { cn } from "@/lib/utils";

type ProfileOverviewField = {
  label: string;
  value: ReactNode;
  className?: string;
};

export function ProfileOverview({
  title,
  metaLine,
  action,
  imageUrl,
  avatarFallback,
  detailFields,
  detailFooter,
  extraSection,
}: {
  title: string;
  metaLine?: ReactNode;
  action?: ReactNode;
  imageUrl?: string | null;
  avatarFallback: string;
  detailFields: ProfileOverviewField[];
  detailFooter?: ReactNode;
  extraSection?: ReactNode;
}) {
  return (
    <section className={cn(STANDARD_PAGE_WIDTH, "flex flex-col gap-6 py-10")}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-4">
          <Avatar size="lg" className="size-20">
            {imageUrl ? <AvatarImage src={imageUrl} alt={title} /> : null}
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {metaLine ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                {metaLine}
              </div>
            ) : null}
          </div>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <FramedList>
        <FramedListItems>
          {detailFields.map((field) => (
            <ProfileOverviewFieldBlock
              key={field.label}
              label={field.label}
              value={field.value}
              className={field.className}
            />
          ))}
        </FramedListItems>
        {detailFooter ? (
          <FramedListInset className="border-t py-6">{detailFooter}</FramedListInset>
        ) : null}
      </FramedList>

      {extraSection}
    </section>
  );
}

function ProfileOverviewFieldBlock({ label, value, className }: ProfileOverviewField) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="text-sm sm:max-w-[65%] sm:text-right sm:text-base">{value}</div>
      </div>
    </div>
  );
}
