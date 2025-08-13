import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Minus, Plus, Save, Sun, Moon, Calendar } from 'lucide-react';
import { format, isAfter, startOfDay } from 'date-fns';

interface TiffinEntry {
  entry_date: string;
  afternoon_count: number;
  evening_count: number;
}

const TiffinLogger: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentEntry, setCurrentEntry] = useState<TiffinEntry>({
    entry_date: format(new Date(), 'yyyy-MM-dd'),
    afternoon_count: 0,
    evening_count: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadEntryForDate();
  }, [selectedDate]);

  const loadEntryForDate = async () => {
    try {
      const { data, error } = await supabase
        .from('tiffin_entries')
        .select('*')
        .eq('entry_date', selectedDate)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setCurrentEntry(data);
      } else {
        setCurrentEntry({
          entry_date: selectedDate,
          afternoon_count: 0,
          evening_count: 0
        });
      }
    } catch (error: any) {
      console.error('Error loading entry for date:', error);
    }
  };

  const updateCount = (meal: 'afternoon' | 'evening', increment: boolean) => {
    const field = `${meal}_count` as keyof TiffinEntry;
    const currentValue = currentEntry[field] as number;
    const newValue = Math.max(0, Math.min(10, currentValue + (increment ? 1 : -1)));
    
    setCurrentEntry(prev => ({
      ...prev,
      [field]: newValue
    }));
  };

  const handleDateChange = (date: string) => {
    // Prevent selecting future dates
    const selectedDateObj = new Date(date);
    const today = startOfDay(new Date());
    
    if (isAfter(selectedDateObj, today)) {
      toast({
        title: "Invalid Date",
        description: "You can only log tiffins for today or past dates.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedDate(date);
  };

  const saveEntry = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tiffin_entries')
        .upsert({
          entry_date: currentEntry.entry_date,
          afternoon_count: currentEntry.afternoon_count,
          evening_count: currentEntry.evening_count,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      const totalCount = currentEntry.afternoon_count + currentEntry.evening_count;
      const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
      const dateDescription = isToday ? 'today' : format(new Date(selectedDate), 'MMM d, yyyy');

      toast({
        title: "Entry saved!",
        description: `Logged ${totalCount} tiffins for ${dateDescription}.`,
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

  const totalCount = currentEntry.afternoon_count + currentEntry.evening_count;
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-[var(--shadow-soft)] bg-gradient-to-br from-card to-muted/30">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isToday ? "Today's Tiffins" : "Tiffin Log"}
          </CardTitle>
          <CardDescription>
            {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="date-picker" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Select Date
            </Label>
            <Input
              id="date-picker"
              type="date"
              value={selectedDate}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              You can only log tiffins for today or past dates
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CounterButton
              icon={<Sun className="h-5 w-5 text-amber-500" />}
              title="Afternoon"
              count={currentEntry.afternoon_count}
              onIncrement={() => updateCount('afternoon', true)}
              onDecrement={() => updateCount('afternoon', false)}
            />
            
            <CounterButton
              icon={<Moon className="h-5 w-5 text-indigo-500" />}
              title="Evening"
              count={currentEntry.evening_count}
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