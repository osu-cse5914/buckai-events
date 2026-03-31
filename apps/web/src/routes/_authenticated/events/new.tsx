import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { useApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";

export const Route = createFileRoute("/_authenticated/events/new")({
  component: EventCreationPage,
});

function EventCreationPage() {
  const api = useApiClient();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"EVENT" | "GIG">("EVENT");
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
    <section className="mx-auto max-w-2xl px-6 py-10">
      <Link
        to="/catalog"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to Catalog
      </Link>

      <h1 className="mt-6 text-2xl font-bold tracking-tight">
        Create Event
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as "EVENT" | "GIG")}>
            <SelectTrigger id="type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EVENT">Event</SelectItem>
              <SelectItem value="GIG">Gig</SelectItem>
            </SelectContent>
          </Select>
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

        {type === "GIG" && (
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
        )}

        {validationError && (
          <p className="text-sm text-destructive">{validationError}</p>
        )}

        {mutation.error && (
          <p className="text-sm text-destructive">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Failed to create event"}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Event"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/catalog">Cancel</Link>
          </Button>
        </div>
      </form>
    </section>
  );
}
