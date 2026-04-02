import { describe, expect, it } from "vitest";
import {
  buildCollectionDetail,
  buildCollectionDetailItem,
  buildCurrentUser,
  buildEventRecord,
  buildPaginatedResponse,
} from "@/test/factories";

describe("[phase:6] [regression:always] Web test factories", () => {
  it("buildEventRecord applies nested overrides and preserves ISO strings", () => {
    const event = buildEventRecord({
      creator: {
        displayName: "Alex",
      },
      startAt: "2026-05-01T12:00:00.000Z",
    });

    expect(event.creator?.displayName).toBe("Alex");
    expect(event.startAt).toBe("2026-05-01T12:00:00.000Z");
  });

  it("buildCollectionDetail composes item fixtures cleanly", () => {
    const detail = buildCollectionDetail({
      items: [
        buildCollectionDetailItem({
          event: buildEventRecord({
            id: "evt_2",
            title: "Open Mic",
          }),
        }),
      ],
    });

    expect(detail.items[0]).toMatchObject({
      eventId: "evt_1",
      event: {
        id: "evt_2",
        title: "Open Mic",
      },
    });
  });

  it("buildPaginatedResponse defaults total to the item count", () => {
    const response = buildPaginatedResponse([
      buildCurrentUser(),
      buildCurrentUser({ id: "user_2", email: "friend@osu.edu" }),
    ]);

    expect(response.pagination).toEqual({
      total: 2,
      limit: 50,
      offset: 0,
    });
  });
});
