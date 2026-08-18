import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Gauge, Router as RouterIcon, Users, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Emmatech PPPoE Manager" },
      {
        name: "description",
        content: "Network overview: routers, PPPoE subscribers, live sessions and plan profiles.",
      },
      { property: "og:title", content: "Dashboard — Emmatech PPPoE Manager" },
      {
        property: "og:description",
        content: "Network overview: routers, PPPoE subscribers, live sessions and plan profiles.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [profile, routers, secrets, sessions, profiles] = await Promise.all([
        supabase.from("profiles").select("company_name").maybeSingle(),
        supabase.from("routers").select("*").order("created_at"),
        supabase.from("pppoe_secrets").select("*").order("created_at", { ascending: false }),
        supabase.from("pppoe_sessions").select("*"),
        supabase.from("pppoe_profiles").select("*"),
      ]);
      return {
        company: profile.data?.company_name ?? "My ISP",
        routers: routers.data ?? [],
        secrets: secrets.data ?? [],
        sessions: sessions.data ?? [],
        profiles: profiles.data ?? [],
      };
    },
  });

  const stats = [
    { label: "Routers", value: data?.routers.length ?? 0, icon: RouterIcon },
    { label: "PPPoE subscribers", value: data?.secrets.length ?? 0, icon: Users },
    { label: "Live sessions", value: data?.sessions.length ?? 0, icon: Activity },
    {
      label: "Suspended",
      value: data?.secrets.filter((s) => s.disabled).length ?? 0,
      icon: WifiOff,
    },
  ];

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Tenant</p>
          <h1 className="text-3xl font-bold">{isLoading ? "…" : data?.company}</h1>
        </div>
        <Button asChild>
          <Link to="/pppoe">
            Open PPPoE Manager <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="panel p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="size-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-3xl font-semibold">
              {isLoading ? <Skeleton className="h-8 w-12" /> : s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold">Recent subscribers</h2>
          {isLoading ? (
            <Skeleton className="mt-4 h-32 w-full" />
          ) : data?.secrets.length ? (
            <ul className="mt-4 divide-y divide-border">
              {data.secrets.slice(0, 6).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-mono text-sm">{s.username}</p>
                    <p className="text-xs text-muted-foreground">{s.profile_name}</p>
                  </div>
                  <Badge variant={s.disabled ? "destructive" : "secondary"}>
                    {s.disabled ? "Suspended" : "Active"}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No subscribers yet — add your first PPPoE secret in the manager.
            </p>
          )}
        </div>

        <div className="panel p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Gauge className="size-4 text-primary" /> Plan profiles
          </h2>
          {isLoading ? (
            <Skeleton className="mt-4 h-32 w-full" />
          ) : (
            <ul className="mt-4 space-y-3">
              {data?.profiles.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{p.rate_limit}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
