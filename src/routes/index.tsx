import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Gauge, Router as RouterIcon, ShieldCheck, Users, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Emmatech PPPoE Manager — ISP subscriber control" },
      {
        name: "description",
        content:
          "Run PPPoE secrets, live sessions and plan profiles across your MikroTik routers from one multi-tenant console.",
      },
      { property: "og:title", content: "Emmatech PPPoE Manager — ISP subscriber control" },
      {
        property: "og:description",
        content:
          "Run PPPoE secrets, live sessions and plan profiles across your MikroTik routers from one multi-tenant console.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Users,
    title: "PPPoE secrets",
    body: "Create, enable, disable and delete subscriber credentials in seconds.",
  },
  {
    icon: Activity,
    title: "Live sessions",
    body: "See who is online, on which address, and disconnect stale sessions.",
  },
  {
    icon: Gauge,
    title: "Plan profiles",
    body: "Rate limits, pools and DNS per package — reused across every router.",
  },
  {
    icon: RouterIcon,
    title: "Multi-router",
    body: "Switch between routers per tenant without leaving the manager.",
  },
];

function Landing() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="signal-gradient flex size-9 items-center justify-center rounded-lg">
            <Wifi className="size-5 text-primary-foreground" />
          </span>
          <span className="font-display text-lg font-semibold">Emmatech</span>
        </div>
        <Button asChild variant="outline">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="flex flex-1 flex-col justify-center py-20">
        <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          Multi-tenant · RLS isolated per ISP
        </p>
        <h1 className="max-w-3xl text-5xl leading-tight font-bold md:text-6xl">
          The PPPoE manager your{" "}
          <span className="bg-[image:var(--gradient-signal)] bg-clip-text text-transparent">
            network operations
          </span>{" "}
          team actually uses.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Provision subscribers, watch live sessions and manage plan profiles across all your
          routers — from one dashboard, isolated per tenant.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Get started free</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/auth">I already have an account</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="panel p-5">
            <f.icon className="size-5 text-primary" />
            <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
