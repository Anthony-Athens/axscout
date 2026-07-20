import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AccessTier = "free" | "premium" | "pro";
export type EntitledTier = Exclude<AccessTier, "free">;
export type FeatureKey =
  | "predictions_full"
  | "pitcher_explorer"
  | "matchups_interactive"
  | "scouting_report_export";

export type UserAccess = {
  isAuthenticated: boolean;
  tier: AccessTier;
  source?: string;
  activeEntitlements: string[];
  features: {
    predictionsFull: boolean;
    pitcherExplorer: boolean;
    matchupsInteractive: boolean;
    scoutingReportExport: boolean;
  };
};

type EntitlementRow = {
  tier: EntitledTier;
  source: string;
};

const TIER_LEVEL: Record<AccessTier, number> = {
  free: 0,
  premium: 1,
  pro: 2,
};

const FEATURE_TIER: Record<FeatureKey, EntitledTier> = {
  predictions_full: "premium",
  pitcher_explorer: "premium",
  matchups_interactive: "premium",
  scouting_report_export: "pro",
};

function createAccess(
  isAuthenticated: boolean,
  tier: AccessTier = "free",
  source?: string,
  activeEntitlements: string[] = []
): UserAccess {
  const hasPremium = TIER_LEVEL[tier] >= TIER_LEVEL.premium;
  const hasPro = TIER_LEVEL[tier] >= TIER_LEVEL.pro;

  return {
    isAuthenticated,
    tier,
    ...(source ? { source } : {}),
    activeEntitlements,
    features: {
      predictionsFull: hasPremium,
      pitcherExplorer: hasPremium,
      matchupsInteractive: hasPremium,
      scoutingReportExport: hasPro,
    },
  };
}

export async function getCurrentUserAccess(): Promise<UserAccess> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createAccess(false);
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("user_entitlements")
      .select("tier, source")
      .eq("user_id", user.id)
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${now}`);

    if (error || !data) {
      return createAccess(true);
    }

    const entitlements = (data as EntitlementRow[]).filter(
      (row) => row.tier === "premium" || row.tier === "pro"
    );
    const highest = entitlements.reduce<EntitlementRow | undefined>(
      (current, row) =>
        !current || TIER_LEVEL[row.tier] > TIER_LEVEL[current.tier]
          ? row
          : current,
      undefined
    );
    const activeEntitlements = [...new Set(entitlements.map((row) => row.tier))];

    return createAccess(
      true,
      highest?.tier ?? "free",
      highest?.source,
      activeEntitlements
    );
  } catch {
    return createAccess(false);
  }
}

export async function userHasTier(requiredTier: AccessTier): Promise<boolean> {
  const access = await getCurrentUserAccess();
  return TIER_LEVEL[access.tier] >= TIER_LEVEL[requiredTier];
}

export async function userHasFeature(featureKey: FeatureKey): Promise<boolean> {
  return userHasTier(FEATURE_TIER[featureKey]);
}
