import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import NotificationSettings from '@/components/settings/NotificationSettings';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Customize your tiffin tracking experience
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <NotificationSettings />
        
        {/* Placeholder for future settings */}
        <Card className="border-border/50 shadow-[var(--shadow-soft)] opacity-50">
          <CardHeader>
            <CardTitle className="text-muted-foreground">
              More Settings Coming Soon
            </CardTitle>
            <CardDescription>
              Additional customization options will be added in future updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Theme preferences</p>
              <p>• Export data options</p>
              <p>• Account management</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
