import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import AuthForm from '@/components/auth/AuthForm';
import AppHeader from '@/components/layout/AppHeader';
import TabNavigation from '@/components/layout/TabNavigation';
import TiffinLogger from '@/components/tiffin/TiffinLogger';
import TiffinHistory from '@/components/tiffin/TiffinHistory';
import Settings from './Settings';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'logger' | 'history' | 'settings'>('logger');

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    // Auth state will be updated by the listener
  };

  const handleSignOut = () => {
    setUser(null);
    setSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <AppHeader userEmail={user.email} onSignOut={handleSignOut} />
      
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        {activeTab === 'logger' && <TiffinLogger />}
        {activeTab === 'history' && <TiffinHistory />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  );
};

export default Index;
