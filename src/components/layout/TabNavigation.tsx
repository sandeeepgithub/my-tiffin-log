import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, History, Settings } from 'lucide-react';

interface TabNavigationProps {
  activeTab: 'logger' | 'history' | 'settings';
  onTabChange: (tab: 'logger' | 'history' | 'settings') => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex justify-center mb-6">
      <div className="inline-flex rounded-lg border border-border/50 bg-muted/30 p-1 shadow-[var(--shadow-soft)]">
        <Button
          variant={activeTab === 'logger' ? 'default' : 'ghost'}
          onClick={() => onTabChange('logger')}
          className={`flex items-center gap-2 transition-[var(--transition-smooth)] ${
            activeTab === 'logger' 
              ? 'bg-gradient-to-r from-primary to-primary-hover shadow-[var(--shadow-warm)]' 
              : 'hover:bg-muted'
          }`}
        >
          <PlusCircle className="h-4 w-4" />
          Log Tiffins
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          onClick={() => onTabChange('history')}
          className={`flex items-center gap-2 transition-[var(--transition-smooth)] ${
            activeTab === 'history' 
              ? 'bg-gradient-to-r from-primary to-primary-hover shadow-[var(--shadow-warm)]' 
              : 'hover:bg-muted'
          }`}
        >
          <History className="h-4 w-4" />
          View History
        </Button>
        <Button
          variant={activeTab === 'settings' ? 'default' : 'ghost'}
          onClick={() => onTabChange('settings')}
          className={`flex items-center gap-2 transition-[var(--transition-smooth)] ${
            activeTab === 'settings' 
              ? 'bg-gradient-to-r from-primary to-primary-hover shadow-[var(--shadow-warm)]' 
              : 'hover:bg-muted'
          }`}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>
    </div>
  );
};

export default TabNavigation;