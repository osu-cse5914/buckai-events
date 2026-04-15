import { describe, expect, it } from "vitest";
import { buildApplicationWithApplicant, buildConversation, buildEvent } from "./index";

describe("[phase:6] [regression:always] Backend test factories", () => {
  it("buildEvent applies nested and top-level overrides without mutating defaults", () => {
    const baseEvent = buildEvent();
    const customizedEvent = buildEvent({
      id: "evt_custom",
      locationName: "Thompson Library",
      tags: ["featured"],
    });

    expect(baseEvent.id).toBe("evt_1");
    expect(baseEvent.locationName).toBe("Ohio Union");
    expect(customizedEvent).toMatchObject({
      id: "evt_custom",
      locationName: "Thompson Library",
      tags: ["featured"],
    });
    expect(customizedEvent.startAt).toBeInstanceOf(Date);
  });

  it("buildApplicationWithApplicant supports nested relation overrides", () => {
    const application = buildApplicationWithApplicant({
      applicant: {
        id: "user_owner",
        displayName: "Owner",
      },
      status: "ACCEPTED",
    });

    expect(application).toMatchObject({
      status: "ACCEPTED",
      applicant: {
        id: "user_owner",
        displayName: "Owner",
        email: "student@osu.edu",
      },
    });
  });

  it("buildConversation preserves nullable JSON defaults until overridden", () => {
    const conversation = buildConversation();

    expect(conversation.pendingAction).toBeNull();
    expect(conversation.pendingActionCreatedAt).toBeNull();
  });
});
