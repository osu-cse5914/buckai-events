import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function FramedList({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn("overflow-hidden rounded-2xl border bg-background", className)}
      {...props}
    />
  );
}

export function FramedListItems({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("divide-y", className)} {...props} />;
}

export function FramedListItem({
  className,
  ...props
}: ComponentProps<"article">) {
  return <article className={cn("px-4 py-4 sm:px-5", className)} {...props} />;
}

export function FramedListInset({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("px-6 py-10 sm:px-8", className)} {...props} />;
}

export function FramedListFooter({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("border-t px-6 py-5 sm:px-8", className)} {...props} />;
}
