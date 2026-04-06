import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProfileEditor } from "@/components/profile-editor";
import { useApiClient } from "@/lib/api";
import { MessageBlock } from "@/components/state-block";
import { currentUserQueryOptions, queryKeys } from "@/lib/queries";
import { palette } from "@/lib/theme";
import type { ProfileUpdateInput } from "@/lib/types";

export function ProfileScreen() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const profileQuery = useQuery(currentUserQueryOptions(api));

  const mutation = useMutation({
    mutationFn: (input: ProfileUpdateInput) => api.updateCurrentUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });

  if (profileQuery.isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background, padding: 18 }}>
        <MessageBlock title="Loading profile..." />
      </View>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background, padding: 18 }}>
        <MessageBlock
          title="Could not load profile"
          detail={
            profileQuery.error instanceof Error
              ? profileQuery.error.message
              : "Please try again."
          }
          tone="danger"
        />
      </View>
    );
  }

  return (
    <ProfileEditor
      user={profileQuery.data}
      isSaving={mutation.isPending}
      saveError={mutation.error instanceof Error ? mutation.error.message : null}
      onSave={(input) => mutation.mutate(input)}
    />
  );
}
