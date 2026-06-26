"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleFavoriteTeam(teamId: number, isFavorite: boolean) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  if (isFavorite) {
    await supabase
      .from("user_favorite_teams")
      .delete()
      .eq("user_id", user.id)
      .eq("team_id", teamId);
  } else {
    await supabase.from("user_favorite_teams").insert({
      user_id: user.id,
      team_id: teamId,
    });
  }

  revalidatePath("/dashboard");
}