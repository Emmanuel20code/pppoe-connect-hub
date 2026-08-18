import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Activity,
  Gauge,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/pppoe")({
  head: () => ({
    meta: [
      { title: "PPPoE Manager — Emmatech" },
      {
        name: "description",
        content:
          "Manage PPPoE secrets, live sessions and plan profiles for the selected MikroTik router.",
      },
      { property: "og:title", content: "PPPoE Manager — Emmatech" },
      {
        property: "og:description",
        content:
          "Manage PPPoE secrets, live sessions and plan profiles for the selected MikroTik router.",
      },
    ],
  }),
  component: PPPoEManager,
});

const emptySecret = {
  username: "",
  password: "",
  profile_name: "",
  service: "pppoe",
  remote_address: "",
  comment: "",
};

const emptyProfile = {
  name: "",
  rate_limit: "10M/10M",
  local_address: "10.0.0.1",
  remote_address: "pppoe-pool",
  dns_server: "8.8.8.8",
  price: 0,
};

function PPPoEManager() {
  const qc = useQueryClient();
  const [routerId, setRouterId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [secretOpen, setSecretOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState<string | null>(null);
  const [secretForm, setSecretForm] = useState(emptySecret);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState(emptyProfile);

  const routers = useQuery({
    queryKey: ["routers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("routers").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const activeRouterId = routerId || routers.data?.[0]?.id || "";

  const secrets = useQuery({
    queryKey: ["secrets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pppoe_secrets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pppoe_sessions")
        .select("*")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const profiles = useQuery({
    queryKey: ["profiles-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pppoe_profiles").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = (keys: string[]) =>
    keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const saveSecret = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const payload = {
        ...secretForm,
        profile_name: secretForm.profile_name || profiles.data?.[0]?.name || "default",
        router_id: activeRouterId || null,
        user_id: auth.user!.id,
      };
      if (editingSecret) {
        const { error } = await supabase
          .from("pppoe_secrets")
          .update(payload)
          .eq("id", editingSecret);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pppoe_secrets").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingSecret ? "Subscriber updated" : "Subscriber created");
      setSecretOpen(false);
      setEditingSecret(null);
      setSecretForm(emptySecret);
      invalidate(["secrets", "dashboard"]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleSecret = useMutation({
    mutationFn: async ({ id, disabled }: { id: string; disabled: boolean }) => {
      const { error } = await supabase.from("pppoe_secrets").update({ disabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(["secrets", "dashboard"]),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSecret = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pppoe_secrets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subscriber deleted");
      invalidate(["secrets", "dashboard"]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const connect = useMutation({
    mutationFn: async (username: string) => {
      const { data: auth } = await supabase.auth.getUser();
      const octet = Math.floor(Math.random() * 200) + 20;
      const { error } = await supabase.from("pppoe_sessions").insert({
        user_id: auth.user!.id,
        router_id: activeRouterId || null,
        username,
        address: `10.0.0.${octet}`,
        caller_id: `48:A9:8A:${octet.toString(16).padStart(2, "0").toUpperCase()}:11:02`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session established");
      invalidate(["sessions", "dashboard"]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pppoe_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session disconnected");
      invalidate(["sessions", "dashboard"]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const payload = { ...profileForm, price: Number(profileForm.price), user_id: auth.user!.id };
      if (editingProfile) {
        const { error } = await supabase
          .from("pppoe_profiles")
          .update(payload)
          .eq("id", editingProfile);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pppoe_profiles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingProfile ? "Plan profile updated" : "Plan profile created");
      setProfileOpen(false);
      setEditingProfile(null);
      setProfileForm(emptyProfile);
      invalidate(["profiles-plans", "dashboard"]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pppoe_profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan profile deleted");
      invalidate(["profiles-plans", "dashboard"]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const routerSecrets = useMemo(() => {
    const list = (secrets.data ?? []).filter(
      (s) => !activeRouterId || !s.router_id || s.router_id === activeRouterId,
    );
    if (!search) return list;
    return list.filter((s) => s.username.toLowerCase().includes(search.toLowerCase()));
  }, [secrets.data, activeRouterId, search]);

  const routerSessions = (sessions.data ?? []).filter(
    (s) => !activeRouterId || !s.router_id || s.router_id === activeRouterId,
  );

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground">
            <Link to="/dashboard">
              <ArrowLeft className="size-4" /> Back to dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">PPPoE Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Subscribers, live sessions and plan profiles per router.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={activeRouterId} onValueChange={setRouterId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select router" />
            </SelectTrigger>
            <SelectContent>
              {(routers.data ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} · {r.ip_address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Refresh"
            onClick={() => invalidate(["secrets", "sessions", "profiles-plans", "routers"])}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="secrets" className="mt-8">
        <TabsList>
          <TabsTrigger value="secrets">
            <Users className="size-4" /> Secrets
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Activity className="size-4" /> Sessions
          </TabsTrigger>
          <TabsTrigger value="profiles">
            <Gauge className="size-4" /> Profiles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="secrets" className="mt-4">
          <div className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative">
                <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input
                  className="w-64 pl-9"
                  placeholder="Search username"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                onClick={() => {
                  setEditingSecret(null);
                  setSecretForm(emptySecret);
                  setSecretOpen(true);
                }}
              >
                <Plus className="size-4" /> New secret
              </Button>
            </div>

            {secrets.isLoading ? (
              <Skeleton className="mt-5 h-40 w-full" />
            ) : routerSecrets.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                No PPPoE secrets yet. Create one to provision a subscriber.
              </p>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="pb-3">Username</th>
                      <th className="pb-3">Profile</th>
                      <th className="pb-3">Service</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {routerSecrets.map((s) => (
                      <tr key={s.id}>
                        <td className="py-3 font-mono">{s.username}</td>
                        <td className="py-3">{s.profile_name}</td>
                        <td className="py-3 text-muted-foreground">{s.service}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={!s.disabled}
                              onCheckedChange={(on) =>
                                toggleSecret.mutate({ id: s.id, disabled: !on })
                              }
                              aria-label="Toggle subscriber"
                            />
                            <Badge variant={s.disabled ? "destructive" : "secondary"}>
                              {s.disabled ? "Suspended" : "Active"}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={s.disabled}
                              onClick={() => connect.mutate(s.username)}
                            >
                              <Power className="size-4" /> Connect
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingSecret(s.id);
                                setSecretForm({
                                  username: s.username,
                                  password: s.password,
                                  profile_name: s.profile_name,
                                  service: s.service,
                                  remote_address: s.remote_address ?? "",
                                  comment: s.comment ?? "",
                                });
                                setSecretOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete subscriber"
                              onClick={() => deleteSecret.mutate(s.id)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <div className="panel p-5">
            <h2 className="text-lg font-semibold">Active sessions</h2>
            {sessions.isLoading ? (
              <Skeleton className="mt-5 h-32 w-full" />
            ) : routerSessions.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Nobody online right now. Use Connect on a subscriber to bring one up.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {routerSessions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-mono text-sm">{s.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.address} · {s.caller_id} · since{" "}
                        {new Date(s.started_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => disconnect.mutate(s.id)}>
                      Disconnect
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="profiles" className="mt-4">
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Plan profiles</h2>
              <Button
                onClick={() => {
                  setEditingProfile(null);
                  setProfileForm(emptyProfile);
                  setProfileOpen(true);
                }}
              >
                <Plus className="size-4" /> New profile
              </Button>
            </div>
            {profiles.isLoading ? (
              <Skeleton className="mt-5 h-32 w-full" />
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {(profiles.data ?? []).map((p) => (
                  <div key={p.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{p.rate_limit}</p>
                      </div>
                      <Badge variant="secondary">KES {Number(p.price).toLocaleString()}</Badge>
                    </div>
                    <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <dt>Pool</dt>
                        <dd className="font-mono">{p.remote_address}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>DNS</dt>
                        <dd className="font-mono">{p.dns_server}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setEditingProfile(p.id);
                          setProfileForm({
                            name: p.name,
                            rate_limit: p.rate_limit,
                            local_address: p.local_address,
                            remote_address: p.remote_address,
                            dns_server: p.dns_server,
                            price: Number(p.price),
                          });
                          setProfileOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete profile"
                        onClick={() => deleteProfile.mutate(p.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={secretOpen} onOpenChange={setSecretOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSecret ? "Edit subscriber" : "New PPPoE secret"}</DialogTitle>
            <DialogDescription>
              Credentials are provisioned against the selected router.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={secretForm.username}
                onChange={(e) => setSecretForm({ ...secretForm, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                value={secretForm.password}
                onChange={(e) => setSecretForm({ ...secretForm, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile">Plan profile</Label>
              <Select
                value={secretForm.profile_name || undefined}
                onValueChange={(v) => setSecretForm({ ...secretForm, profile_name: v })}
              >
                <SelectTrigger id="profile">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {(profiles.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service">Service</Label>
              <Input
                id="service"
                value={secretForm.service}
                onChange={(e) => setSecretForm({ ...secretForm, service: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="comment">Comment</Label>
              <Input
                id="comment"
                value={secretForm.comment}
                onChange={(e) => setSecretForm({ ...secretForm, comment: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSecretOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveSecret.mutate()}
              disabled={!secretForm.username || !secretForm.password || saveSecret.isPending}
            >
              {editingSecret ? "Save changes" : "Create secret"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProfile ? "Edit plan profile" : "New plan profile"}</DialogTitle>
            <DialogDescription>Rate limit format: upload/download, e.g. 20M/20M.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pname">Name</Label>
              <Input
                id="pname"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Rate limit</Label>
              <Input
                id="rate"
                value={profileForm.rate_limit}
                onChange={(e) => setProfileForm({ ...profileForm, rate_limit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pool">Address pool</Label>
              <Input
                id="pool"
                value={profileForm.remote_address}
                onChange={(e) => setProfileForm({ ...profileForm, remote_address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dns">DNS server</Label>
              <Input
                id="dns"
                value={profileForm.dns_server}
                onChange={(e) => setProfileForm({ ...profileForm, dns_server: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="price">Monthly price</Label>
              <Input
                id="price"
                type="number"
                value={profileForm.price}
                onChange={(e) => setProfileForm({ ...profileForm, price: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setProfileOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveProfile.mutate()}
              disabled={!profileForm.name || saveProfile.isPending}
            >
              {editingProfile ? "Save changes" : "Create profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
