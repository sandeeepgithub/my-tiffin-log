-- Create notification_preferences table
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

-- Enable RLS on notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for notification_preferences
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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at on notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at 
  BEFORE UPDATE ON public.notification_preferences 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get users who need notifications
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
