import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase-browser";

type SubscriptionRow = {
  status: string | null;
  price_id: string | null;
  plan_interval: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

type ProAccessState = {
  loading: boolean;
  isAuthenticated: boolean;
  isPro: boolean;
  userId: string | null;
  email: string | null;
  subscription: SubscriptionRow | null;
  error: string | null;
};

const STATUS_RANK: Record<string, number> = {
  active: 0,
  trialing: 1,
  past_due: 2,
  unpaid: 3,
  canceled: 4,
  incomplete: 5,
  incomplete_expired: 6,
};

function pickBestSubscription(rows: SubscriptionRow[]): SubscriptionRow | null {
  if (rows.length === 0) {
    return null;
  }

  return [...rows].sort((a, b) => {
    const rankA = STATUS_RANK[a.status ?? ""] ?? 999;
    const rankB = STATUS_RANK[b.status ?? ""] ?? 999;

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const endA = a.current_period_end ? new Date(a.current_period_end).getTime() : 0;
    const endB = b.current_period_end ? new Date(b.current_period_end).getTime() : 0;

    return endB - endA;
  })[0];
}

export function useProAccess(): ProAccessState {
  const [state, setState] = useState<ProAccessState>({
    loading: true,
    isAuthenticated: false,
    isPro: false,
    userId: null,
    email: null,
    subscription: null,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (userError) {
        setState({
          loading: false,
          isAuthenticated: false,
          isPro: false,
          userId: null,
          email: null,
          subscription: null,
          error: userError.message,
        });
        return;
      }

      if (!user) {
        setState({
          loading: false,
          isAuthenticated: false,
          isPro: false,
          userId: null,
          email: null,
          subscription: null,
          error: null,
        });
        return;
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .select("status, price_id, plan_interval, current_period_end, cancel_at_period_end")
        .eq("user_id", user.id);

      if (!isMounted) {
        return;
      }

      if (error) {
        setState({
          loading: false,
          isAuthenticated: true,
          isPro: false,
          userId: user.id,
          email: user.email ?? null,
          subscription: null,
          error: error.message,
        });
        return;
      }

      const bestSubscription = pickBestSubscription((data ?? []) as SubscriptionRow[]);

      setState({
        loading: false,
        isAuthenticated: true,
        isPro: bestSubscription?.status === "active",
        userId: user.id,
        email: user.email ?? null,
        subscription: bestSubscription,
        error: null,
      });
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return useMemo(() => state, [state]);
}
