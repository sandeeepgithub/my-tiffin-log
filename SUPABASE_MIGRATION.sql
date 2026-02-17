-- =====================================================
-- SUPABASE DATABASE MIGRATION
-- Project: lhscrwzcmncfctbuoawu
-- Run all SQL below in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. NOTIFICATION PREFERENCES TABLE
-- =====================================================

CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  notification_time TIME NOT NULL DEFAULT '18:00:00',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  push_subscription JSONB,
  last_notification_sent DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification preferences" 
ON public.notification_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" 
ON public.notification_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" 
ON public.notification_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- =====================================================
-- 2. PROFILES TABLE
-- =====================================================

CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 3. TIFFIN ENTRIES TABLE
-- =====================================================

CREATE TABLE public.tiffin_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  afternoon_count INTEGER NOT NULL DEFAULT 0 CHECK (afternoon_count >= 0 AND afternoon_count <= 10),
  evening_count INTEGER NOT NULL DEFAULT 0 CHECK (evening_count >= 0 AND evening_count <= 10),
  total_count INTEGER GENERATED ALWAYS AS (afternoon_count + evening_count) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

ALTER TABLE public.tiffin_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tiffin entries" 
ON public.tiffin_entries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tiffin entries" 
ON public.tiffin_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tiffin entries" 
ON public.tiffin_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tiffin entries" 
ON public.tiffin_entries 
FOR DELETE 
USING (auth.uid() = user_id);

-- =====================================================
-- 4. TRIGGERS AND FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_preferences_updated_at 
  BEFORE UPDATE ON public.notification_preferences 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tiffin_entries_updated_at
  BEFORE UPDATE ON public.tiffin_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. USER REGISTRATION HANDLER
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 6. NOTIFICATION HELPER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_users_for_notifications(target_time TIME, target_timezone TEXT DEFAULT 'UTC')
RETURNS TABLE (
  user_id UUID,
  notification_time TIME,
  timezone TEXT,
  push_subscription JSONB,
  has_entry_today BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    np.user_id,
    np.notification_time,
    np.timezone,
    np.push_subscription,
    EXISTS(
      SELECT 1 FROM public.tiffin_entries te 
      WHERE te.user_id = np.user_id 
      AND te.entry_date = CURRENT_DATE
    ) as has_entry_today
  FROM public.notification_preferences np
  WHERE np.enabled = true
    AND np.notification_time = target_time
    AND np.timezone = target_timezone
    AND np.push_subscription IS NOT NULL
    AND (np.last_notification_sent IS NULL OR np.last_notification_sent < CURRENT_DATE);
END;
$$;

-- =====================================================
-- DONE!
-- All tables, policies, and functions have been created
-- =====================================================
