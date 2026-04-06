import { buildProfileUpdateInput } from "@/components/profile-editor";

describe("[phase:1] [regression:always] Mobile Profile", () => {
  it("TC-USER-006: submits updated display name and major values", () => {
    expect(
      buildProfileUpdateInput({
        displayName: "Scarlet",
        major: "ECE",
        gradYear: "2027",
        interestsInput: "music, tech, campus life",
      }),
    ).toEqual({
      displayName: "Scarlet",
      major: "ECE",
      gradYear: 2027,
      interests: ["music", "tech", "campus life"],
    });
  });
});
