"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleFavoriteTeam(teamId: number, isFavorite: boolean) {
  if (!Number.isInteger(teamId) || teamId <= 0) {
    return { error: "That team could not be updated." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Log in to manage favorite teams." };
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .maybeSingle();

  if (!team) {
    return { error: "That team is not available." };
  }

  let error;

  if (isFavorite) {
    ({ error } = await supabase
      .from("user_favorite_teams")
      .delete()
      .eq("user_id", user.id)
      .eq("team_id", teamId));
  } else {
    ({ error } = await supabase
      .from("user_favorite_teams")
      .upsert(
        { user_id: user.id, team_id: teamId },
        { onConflict: "user_id,team_id" }
      ));
  }

  if (error) {
    return { error: "Your favorite teams could not be updated." };
  }

  revalidatePath("/dashboard");
  return { error: null };
}
