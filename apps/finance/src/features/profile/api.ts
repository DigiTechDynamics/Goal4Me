import { deviceTimeZone } from "@goal4me/app-kit/lib/format";
import { getSupabase } from "@goal4me/app-kit/lib/supabase";
import type { CountryCode, CurrencyCode } from "@goal4me/core";
import type { MoneySetupInput } from "@goal4me/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toCurrency } from "@/features/money/api";

/**
 * The part of the shared account profile Goal4Me Money uses. Body fields
 * (height, weight, age) belong to Goal4Me Fit and are never loaded here.
 */
export interface MoneyProfile {
  displayName: string | null;
  country: CountryCode | null;
  /** Null until the first-run setup is done; every screen past setup can rely on it. */
  currency: CurrencyCode | null;
  moneyGoal: string | null;
}

export const profileKeys = {
  profile: (userId: string) => ["money-profile", userId] as const,
};

async function fetchMoneyProfile(userId: string): Promise<MoneyProfile> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("display_name, country, currency, money_goal")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return {
    displayName: data.display_name,
    country: data.country,
    currency: data.currency ? toCurrency(data.currency) : null,
    moneyGoal: data.money_goal,
  };
}

export function useMoneyProfile(userId: string) {
  return useQuery({
    queryKey: profileKeys.profile(userId),
    queryFn: () => fetchMoneyProfile(userId),
    enabled: userId !== "",
  });
}

/** Saves the first-run setup (see complete_money_setup) and refreshes the profile. */
export function useCompleteMoneySetup(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: MoneySetupInput) => {
      const { error } = await getSupabase().rpc("complete_money_setup", {
        p_country: input.country,
        p_currency: input.currency,
        p_timezone: deviceTimeZone(),
        p_money_goal: input.moneyGoal,
      });
      if (error) throw error;
    },
    onSuccess: (_, input) => {
      // Write the answers into the cache before leaving setup: the profile
      // query may be inactive here, and the tabs would otherwise read the
      // cached "no currency" profile and send the user straight back.
      client.setQueryData<MoneyProfile>(profileKeys.profile(userId), (old) => ({
        displayName: old?.displayName ?? null,
        country: input.country,
        currency: input.currency,
        moneyGoal: input.moneyGoal,
      }));
      return client.invalidateQueries({ queryKey: profileKeys.profile(userId) });
    },
  });
}
