import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { useApiClient } from "@/lib/api";
import { validateCreateEventSearch } from "@/lib/event-route-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { browsePathForEventType } from "@/lib/event-utils";

export const Route = createFileRoute("/_authenticated/events/new")({
  validateSearch: validateCreateEventSearch,
  component: EventCreationPage,
});

function EventCreationPage() {
  const api = useApiClient();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const type: "EVENT" | "GIG" = search.type ?? "EVENT";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [startAt, setStartAt] = useState<Date | undefined>(undefined);
  const [endAt, setEndAt] = useState<Date | undefined>(undefined);
  const [compAmount, setCompAmount] = useState("");
  const [compType, setCompType] = useState<"FIXED" | "HOURLY">("FIXED");
  const [validationError, setValidationError] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.api.v1.events.$post({ json: data });
      if (!res.ok) throw new Error("Failed to create event");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      navigate({
        to: "/events/$eventId",
        params: { eventId: (data as { id: string }).id },
      });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError("");

    if (!title.trim() || !description.trim() || !locationName.trim() || !startAt) {
      setValidationError("Please fill in all required fields.");
      return;
    }

    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      type,
      location: { name: locationName.trim() },
      startAt: startAt.toISOString(),
    };

    if (endAt) {
      body.endAt = endAt.toISOString();
    }

    if (type === "GIG" && compAmount) {
      body.compensation = {
        amount: parseFloat(compAmount),
        currency: "USD",
        type: compType,
      };
    }

    mutation.mutate(body);
  }

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
      <Link
        to={browsePathForEventType(type)}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to {type === "GIG" ? "Gigs" : "Events"}
      </Link>

      <div className="space-y-2">
        <Badge variant="outline" className="w-fit">
          {type === "GIG" ? "Gig" : "Event"}
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight">
          Create {type === "GIG" ? "Gig" : "Event"}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Add the essentials for your listing so people can discover it, understand the timing, and know how to show up.
        </p>
      </div>

      <Card className="gap-0 overflow-hidden rounded-2xl border bg-background py-0">
        <CardHeader className="border-b px-6 py-6 sm:px-8">
          <CardTitle>Listing details</CardTitle>
          <CardDescription>
            Fill in the basics first, then add schedule details and compensation if this is a gig.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-0 py-0">
          <form onSubmit={handleSubmit} className="space-y-0">
            <div className="space-y-5 px-6 py-6 sm:px-8">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Hackathon"
                  required
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your event..."
                  required
                  maxLength={5000}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Ohio Union"
                  required
                  maxLength={500}
                />
              </div>
            </div>

            <div className="border-t px-6 py-6 sm:px-8">
              <div className="mb-5 space-y-1">
                <h2 className="text-base font-semibold">Schedule</h2>
                <p className="text-sm text-muted-foreground">
                  Pick the start time, and add an end time if attendees should know when it wraps up.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startAt">Start Date</Label>
                  <DateTimePicker
                    id="startAt"
                    value={startAt}
                    onChange={setStartAt}
                    placeholder="Pick start date & time"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endAt">End Date</Label>
                  <DateTimePicker
                    id="endAt"
                    value={endAt}
                    onChange={setEndAt}
                    placeholder="Pick end date & time"
                  />
                </div>
              </div>
            </div>

            {type === "GIG" ? (
              <div className="border-t px-6 py-6 sm:px-8">
                <div className="mb-5 space-y-1">
                  <h2 className="text-base font-semibold">Compensation</h2>
                  <p className="text-sm text-muted-foreground">
                    Add pay details if this gig includes a fixed amount or hourly rate.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="compAmount">Amount ($)</Label>
                    <Input
                      id="compAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={compAmount}
                      onChange={(e) => setCompAmount(e.target.value)}
                      placeholder="e.g. 25"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="compType">Compensation Type</Label>
                    <Select
                      value={compType}
                      onValueChange={(v) => setCompType(v as "FIXED" | "HOURLY")}
                    >
                      <SelectTrigger id="compType" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIXED">Fixed</SelectItem>
                        <SelectItem value="HOURLY">Hourly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-4 border-t px-6 py-6 sm:px-8">
              {validationError ? (
                <p className="text-sm text-destructive">{validationError}</p>
              ) : null}

              {mutation.error ? (
                <p className="text-sm text-destructive">
                  {mutation.error instanceof Error
                    ? mutation.error.message
                    : "Failed to create event"}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending
                    ? "Creating..."
                    : `Create ${type === "GIG" ? "Gig" : "Event"}`}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link to={browsePathForEventType(type)}>Cancel</Link>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
