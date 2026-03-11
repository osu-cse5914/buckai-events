import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/events/new")({
  component: EventCreationPage,
});

function EventCreationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"EVENT" | "GIG">("EVENT");
  const [locationName, setLocationName] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
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
      startAt: new Date(startAt).toISOString(),
    };

    if (endAt) {
      body.endAt = new Date(endAt).toISOString();
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
        to="/events"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to Events
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
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your event..."
            required
            maxLength={5000}
            rows={4}
            className="border-input bg-background ring-ring/10 ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as "EVENT" | "GIG")}
          >
            <option value="EVENT">Event</option>
            <option value="GIG">Gig</option>
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
            <Input
              id="startAt"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endAt">End Date</Label>
            <Input
              id="endAt"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
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
                id="compType"
                value={compType}
                onChange={(e) =>
                  setCompType(e.target.value as "FIXED" | "HOURLY")
                }
              >
                <option value="FIXED">Fixed</option>
                <option value="HOURLY">Hourly</option>
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
            <Link to="/events">Cancel</Link>
          </Button>
        </div>
      </form>
    </section>
  );
}
