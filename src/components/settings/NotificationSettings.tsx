import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Bell, Clock, Globe } from 'lucide-react';

interface NotificationPreferences {
  id?: string;
  enabled: boolean;
  notification_time: string;
  timezone: string;
  push_subscription?: any;
}

const NotificationSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: false,
    notification_time: '18:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  });
  const { toast } = useToast();

  useEffect(() => {
    loadNotificationPreferences();
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setPermissionState(Notification.permission);
    }
  };

  const loadNotificationPreferences = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          id: data.id,
          enabled: data.enabled,
          notification_time: data.notification_time.substring(0, 5), // Convert from HH:MM:SS to HH:MM
          timezone: data.timezone,
          push_subscription: data.push_subscription
        });
      }
    } catch (error: any) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support notifications.",
        variant: "destructive",
      });
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    setPermissionState(permission);

    if (permission === 'granted') {
      await subscribeToPushNotifications();
      return true;
    } else {
      toast({
        title: "Permission Denied",
        description: "Please enable notifications in your browser settings to receive reminders.",
        variant: "destructive",
      });
      return false;
    }
  };

  const subscribeToPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if push is supported
      if (!('PushManager' in window)) {
        throw new Error('Push messaging is not supported');
      }

      // Use VAPID public key from environment 
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured. Please set VITE_VAPID_PUBLIC_KEY environment variable.');
      }
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Store subscription in preferences
      setPreferences(prev => ({
        ...prev,
        push_subscription: subscription.toJSON()
      }));

      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast({
        title: "Subscription Failed",
        description: "Failed to set up push notifications. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const savePreferences = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // If enabling notifications, request permission first
      if (preferences.enabled && permissionState !== 'granted') {
        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
          setPreferences(prev => ({ ...prev, enabled: false }));
          setLoading(false);
          return;
        }
      }

      const preferencesData = {
        user_id: user.user.id,
        enabled: preferences.enabled,
        notification_time: `${preferences.notification_time}:00`, // Convert HH:MM to HH:MM:SS
        timezone: preferences.timezone,
        push_subscription: preferences.push_subscription
      };

      // Don't include ID in upsert data - let it be auto-generated or use existing
      // Use explicit upsert with conflict resolution on user_id
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(preferencesData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: preferences.enabled 
          ? `Notifications enabled for ${preferences.notification_time} ${preferences.timezone}`
          : "Notifications disabled",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async () => {
    const debugInfo = {
      permission: Notification.permission,
      serviceWorkerSupported: 'serviceWorker' in navigator,
      notificationSupported: 'Notification' in window,
      pushManagerSupported: 'PushManager' in window,
      hasVapidKey: !!import.meta.env.VITE_VAPID_PUBLIC_KEY,
      hasPushSubscription: !!preferences.push_subscription
    };
    
    console.log('Testing notification...', debugInfo);

    // Check browser support
    if (!('Notification' in window)) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support notifications.",
        variant: "destructive",
      });
      return;
    }

    // Check service worker support
    if (!('serviceWorker' in navigator)) {
      toast({
        title: "Service Worker Not Supported",
        description: "Your browser doesn't support service workers required for push notifications.",
        variant: "destructive",
      });
      return;
    }

    // Check permission
    if (Notification.permission !== 'granted') {
      toast({
        title: "Permission Required",
        description: `Notification permission is "${Notification.permission}". Please enable notifications first.`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Test 1: Simple browser notification
      const notification = new Notification('🍱 Tiffin Tracker Test', {
        body: "Test notification is working! This confirms browser notifications are enabled.",
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'test-notification',
        requireInteraction: false,
        silent: false
      });

      notification.onclick = () => {
        console.log('Test notification clicked');
        notification.close();
        window.focus();
      };

      notification.onerror = (error) => {
        console.error('Test notification error:', error);
      };

      // Test 2: Service Worker notification (simulating push)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        // Send a message to service worker to show a notification
        registration.showNotification('🍱 Tiffin Tracker Service Worker Test', {
          body: "This tests the service worker notification system used for push notifications.",
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'test-sw-notification',
          data: {
            url: '/',
            test: true
          }
        });
      }

      toast({
        title: "Test Notifications Sent!",
        description: "You should see two test notifications. Check the console for debug info.",
      });

    } catch (error: any) {
      console.error('Error creating test notification:', error);
      
      let errorMessage = error.message;
      if (error.message.includes('VAPID')) {
        errorMessage = "VAPID configuration issue. Check environment variables.";
      }
      
      toast({
        title: "Notification Test Failed",
        description: `Error: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  // Common timezones for selection
  const commonTimezones = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'America/Chicago',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Kolkata',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];

  return (
    <Card className="border-border/50 shadow-[var(--shadow-soft)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Set up daily reminders to log your tiffin entries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <p className="font-medium">Notification Permission</p>
            <p className="text-sm text-muted-foreground">
              Status: {permissionState === 'granted' ? 'Granted' : permissionState === 'denied' ? 'Denied' : 'Not requested'}
            </p>
          </div>
          {permissionState !== 'granted' && (
            <Button
              variant="outline"
              size="sm"
              onClick={requestNotificationPermission}
            >
              Enable
            </Button>
          )}
        </div>

        {/* Enable/Disable Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="notifications-enabled" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Daily Reminders
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive daily notifications to log your tiffin entries
            </p>
          </div>
          <Switch
            id="notifications-enabled"
            checked={preferences.enabled}
            onCheckedChange={(enabled) => setPreferences(prev => ({ ...prev, enabled }))}
            disabled={permissionState === 'denied'}
          />
        </div>

        {/* Notification Time */}
        <div className="space-y-2">
          <Label htmlFor="notification-time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Reminder Time
          </Label>
          <Input
            id="notification-time"
            type="time"
            value={preferences.notification_time}
            onChange={(e) => setPreferences(prev => ({ ...prev, notification_time: e.target.value }))}
            disabled={!preferences.enabled}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Choose when you'd like to receive daily reminders
          </p>
        </div>

        {/* Timezone Selection */}
        <div className="space-y-2">
          <Label htmlFor="timezone" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Timezone
          </Label>
          <Select
            value={preferences.timezone}
            onValueChange={(timezone) => setPreferences(prev => ({ ...prev, timezone }))}
            disabled={!preferences.enabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {commonTimezones.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Notifications will be sent at the specified time in this timezone
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={savePreferences}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
          
          {preferences.enabled && permissionState === 'granted' && (
            <Button
              variant="outline"
              onClick={testNotification}
              className="flex-1"
            >
              Test Notification
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>How it works:</strong> You'll receive a notification at your chosen time each day, 
            but only if you haven't logged any tiffins for that day yet.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
