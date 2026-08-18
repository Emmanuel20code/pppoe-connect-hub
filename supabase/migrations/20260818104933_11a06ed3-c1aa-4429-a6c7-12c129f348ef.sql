CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  company_name text NOT NULL DEFAULT 'My ISP',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.routers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  ip_address text NOT NULL,
  location text,
  status text NOT NULL DEFAULT 'online',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routers TO authenticated;
GRANT ALL ON public.routers TO service_role;
ALTER TABLE public.routers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own routers" ON public.routers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pppoe_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  rate_limit text NOT NULL DEFAULT '10M/10M',
  local_address text NOT NULL DEFAULT '10.0.0.1',
  remote_address text NOT NULL DEFAULT 'pppoe-pool',
  dns_server text NOT NULL DEFAULT '8.8.8.8',
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pppoe_profiles TO authenticated;
GRANT ALL ON public.pppoe_profiles TO service_role;
ALTER TABLE public.pppoe_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pppoe profiles" ON public.pppoe_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pppoe_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  router_id uuid REFERENCES public.routers(id) ON DELETE SET NULL,
  username text NOT NULL,
  password text NOT NULL,
  service text NOT NULL DEFAULT 'pppoe',
  profile_name text NOT NULL DEFAULT 'default',
  remote_address text,
  disabled boolean NOT NULL DEFAULT false,
  comment text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pppoe_secrets TO authenticated;
GRANT ALL ON public.pppoe_secrets TO service_role;
ALTER TABLE public.pppoe_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pppoe secrets" ON public.pppoe_secrets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE UNIQUE INDEX pppoe_secrets_user_username_idx ON public.pppoe_secrets (user_id, username);

CREATE TABLE public.pppoe_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  router_id uuid REFERENCES public.routers(id) ON DELETE CASCADE,
  username text NOT NULL,
  address text NOT NULL,
  caller_id text,
  started_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pppoe_sessions TO authenticated;
GRANT ALL ON public.pppoe_sessions TO service_role;
ALTER TABLE public.pppoe_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pppoe sessions" ON public.pppoe_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_router_id uuid;
BEGIN
  INSERT INTO public.profiles (id, email, company_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'company_name', 'My ISP'))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.routers (user_id, name, ip_address, location, status)
  VALUES (NEW.id, 'Core Fiber Router', '192.168.88.1', 'Head Office', 'online')
  RETURNING id INTO new_router_id;

  INSERT INTO public.pppoe_profiles (user_id, name, rate_limit, price)
  VALUES (NEW.id, 'home-10M', '10M/10M', 1500),
         (NEW.id, 'business-30M', '30M/30M', 4500);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();