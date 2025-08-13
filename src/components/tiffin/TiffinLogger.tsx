import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Minus, Plus, Save, Sun, Moon } from 'lucide-react';
import { format } from 'date-fns';

interface TiffinEntry {
  entry_date: string;
  afternoon_count: number;
  evening_count: number;
}

const TiffinLogger: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [todayEntry, setTodayEntry] = useState<TiffinEntry>({
    entry_date: format(new Date(), 'yyyy-MM-dd'),
    afternoon_count: 0,
    evening_count: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTodayEntry();
  }, []);

  const loadTodayEntry = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('tiffin_entries')
        .select('*')
        .eq('entry_date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setTodayEntry(data);
      } else {
        setTodayEntry({
          entry_date: today,
          afternoon_count: 0,
          evening_count: 0
        });
      }
    } catch (error: any) {
      console.error('Error loading today entry:', error);
    }
  };

  const updateCount = (meal: 'afternoon' | 'evening', increment: boolean) => {
    const field = `${meal}_count` as keyof TiffinEntry;
    const currentValue = todayEntry[field] as number;
    const newValue = Math.max(0, Math.min(10, currentValue + (increment ? 1 : -1)));
    
    setTodayEntry(prev => ({
      ...prev,
      [field]: newValue
    }));
  };

  const saveEntry = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tiffin_entries')
        .upsert({
          entry_date: todayEntry.entry_date,
          afternoon_count: todayEntry.afternoon_count,
          evening_count: todayEntry.evening_count,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Entry saved!",
        description: `Logged ${todayEntry.afternoon_count + todayEntry.evening_count} tiffins for today.`,
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

  const CounterButton: React.FC<{
    icon: React.ReactNode;
    title: string;
    count: number;
    onIncrement: () => void;
    onDecrement: () => void;
  }> = ({ icon, title, count, onIncrement, onDecrement }) => (
    <Card className="border-border/50 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-soft)] transition-[var(--transition-smooth)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={onDecrement}
            disabled={count === 0}
            className="h-12 w-12 rounded-full border-2 hover:border-primary hover:bg-primary/10"
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 border-2 border-primary/20">
            <span className="text-2xl font-bold text-primary">{count}</span>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={onIncrement}
            disabled={count >= 10}
            className="h-12 w-12 rounded-full border-2 hover:border-primary hover:bg-primary/10"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {count === 0 ? 'No tiffins' : count === 1 ? '1 tiffin' : `${count} tiffins`}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const totalCount = todayEntry.afternoon_count + todayEntry.evening_count;

  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-[var(--shadow-soft)] bg-gradient-to-br from-card to-muted/30">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Today's Tiffins</CardTitle>
          <CardDescription>
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CounterButton
              icon={<Sun className="h-5 w-5 text-amber-500" />}
              title="Afternoon"
              count={todayEntry.afternoon_count}
              onIncrement={() => updateCount('afternoon', true)}
              onDecrement={() => updateCount('afternoon', false)}
            />
            
            <CounterButton
              icon={<Moon className="h-5 w-5 text-indigo-500" />}
              title="Evening"
              count={todayEntry.evening_count}
              onIncrement={() => updateCount('evening', true)}
              onDecrement={() => updateCount('evening', false)}
            />
          </div>

          <div className="text-center space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-r from-accent/50 to-accent/30 border border-accent/30">
              <p className="text-lg font-semibold text-accent-foreground">
                Total: {totalCount} {totalCount === 1 ? 'tiffin' : 'tiffins'}
              </p>
            </div>
            
            <Button
              onClick={saveEntry}
              disabled={loading}
              className="w-full bg-gradient-to-r from-success to-success/90 hover:shadow-[var(--shadow-warm)] transition-[var(--transition-smooth)]"
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TiffinLogger;