import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Calendar, TrendingUp, UtensilsCrossed, Sun, Moon, Edit, Minus, Plus } from 'lucide-react';
import { format, parseISO, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface TiffinEntry {
  id: string;
  entry_date: string;
  afternoon_count: number;
  evening_count: number;
  total_count: number;
}

const TiffinHistory: React.FC = () => {
  const [entries, setEntries] = useState<TiffinEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TiffinEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const { toast } = useToast();

  useEffect(() => {
    loadEntries();
  }, [dateRange]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tiffin_entries')
        .select('*')
        .gte('entry_date', dateRange.start)
        .lte('entry_date', dateRange.end)
        .order('entry_date', { ascending: false });

      if (error) throw error;

      setEntries(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load tiffin history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const setQuickRange = (days: number) => {
    const end = format(new Date(), 'yyyy-MM-dd');
    const start = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');
    setDateRange({ start, end });
  };

  const handleEditEntry = (entry: TiffinEntry) => {
    setEditingEntry({ ...entry });
    setEditDialogOpen(true);
  };

  const updateEditCount = (meal: 'afternoon' | 'evening', increment: boolean) => {
    if (!editingEntry) return;
    
    const field = `${meal}_count` as keyof TiffinEntry;
    const currentValue = editingEntry[field] as number;
    const newValue = Math.max(0, Math.min(10, currentValue + (increment ? 1 : -1)));
    
    setEditingEntry(prev => prev ? ({
      ...prev,
      [field]: newValue
    }) : null);
  };

  const saveEditedEntry = async () => {
    if (!editingEntry) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tiffin_entries')
        .update({
          afternoon_count: editingEntry.afternoon_count,
          evening_count: editingEntry.evening_count,
        })
        .eq('id', editingEntry.id);

      if (error) throw error;

      // Refresh the entries list
      await loadEntries();
      
      setEditDialogOpen(false);
      setEditingEntry(null);
      
      toast({
        title: "Entry Updated!",
        description: `Updated tiffins for ${format(parseISO(editingEntry.entry_date), 'MMM d, yyyy')}.`,
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

  const deleteEntry = async () => {
    if (!editingEntry) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tiffin_entries')
        .delete()
        .eq('id', editingEntry.id);

      if (error) throw error;

      // Refresh the entries list
      await loadEntries();
      
      setEditDialogOpen(false);
      setEditingEntry(null);
      
      toast({
        title: "Entry Deleted!",
        description: `Deleted entry for ${format(parseISO(editingEntry.entry_date), 'MMM d, yyyy')}.`,
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

  const totalTiffins = entries.reduce((sum, entry) => sum + entry.total_count, 0);
  const totalAfternoon = entries.reduce((sum, entry) => sum + entry.afternoon_count, 0);
  const totalEvening = entries.reduce((sum, entry) => sum + entry.evening_count, 0);
  const avgPerDay = entries.length > 0 ? (totalTiffins / entries.length).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-[var(--shadow-soft)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Tiffin History
          </CardTitle>
          <CardDescription>
            View your tiffin consumption over time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range Filters */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickRange(7)}
                className="text-xs"
              >
                Last 7 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickRange(30)}
                className="text-xs"
              >
                Last 30 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
                  const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
                  setDateRange({ start, end });
                }}
                className="text-xs"
              >
                This month
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <div className="flex items-center space-x-2">
                <UtensilsCrossed className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-primary">{totalTiffins}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
              <div className="flex items-center space-x-2">
                <Sun className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold text-amber-600">{totalAfternoon}</p>
                  <p className="text-xs text-muted-foreground">Afternoon</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
              <div className="flex items-center space-x-2">
                <Moon className="h-4 w-4 text-indigo-500" />
                <div>
                  <p className="text-2xl font-bold text-indigo-600">{totalEvening}</p>
                  <p className="text-xs text-muted-foreground">Evening</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <div>
                  <p className="text-2xl font-bold text-success">{avgPerDay}</p>
                  <p className="text-xs text-muted-foreground">Avg/Day</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Entries List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Daily Entries</h3>
            
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading entries...</p>
            ) : entries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No entries found for the selected date range
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {entries.map((entry) => (
                  <Card key={entry.id} className="p-4 border-border/50 hover:shadow-[var(--shadow-card)] transition-[var(--transition-smooth)]">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {format(parseISO(entry.entry_date), 'EEEE, MMM d, yyyy')}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Sun className="h-3 w-3 text-amber-500" />
                            {entry.afternoon_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Moon className="h-3 w-3 text-indigo-500" />
                            {entry.evening_count}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">{entry.total_count}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.total_count === 1 ? 'tiffin' : 'tiffins'}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditEntry(entry)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tiffin Entry</DialogTitle>
            <DialogDescription>
              {editingEntry && `Update your tiffin count for ${format(parseISO(editingEntry.entry_date), 'EEEE, MMM d, yyyy')}`}
            </DialogDescription>
          </DialogHeader>
          
          {editingEntry && (
            <div className="space-y-6">
              {/* Afternoon Count */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-500" />
                  Afternoon Tiffins
                </Label>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateEditCount('afternoon', false)}
                    disabled={editingEntry.afternoon_count === 0}
                    className="h-10 w-10 rounded-full"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/10 to-amber-500/20 border-2 border-amber-500/20">
                    <span className="text-xl font-bold text-amber-600">{editingEntry.afternoon_count}</span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateEditCount('afternoon', true)}
                    disabled={editingEntry.afternoon_count >= 10}
                    className="h-10 w-10 rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Evening Count */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-indigo-500" />
                  Evening Tiffins
                </Label>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateEditCount('evening', false)}
                    disabled={editingEntry.evening_count === 0}
                    className="h-10 w-10 rounded-full"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/10 to-indigo-500/20 border-2 border-indigo-500/20">
                    <span className="text-xl font-bold text-indigo-600">{editingEntry.evening_count}</span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateEditCount('evening', true)}
                    disabled={editingEntry.evening_count >= 10}
                    className="h-10 w-10 rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Total Display */}
              <div className="text-center p-3 rounded-lg bg-gradient-to-r from-accent/50 to-accent/30 border border-accent/30">
                <p className="text-lg font-semibold text-accent-foreground">
                  Total: {editingEntry.afternoon_count + editingEntry.evening_count} {(editingEntry.afternoon_count + editingEntry.evening_count) === 1 ? 'tiffin' : 'tiffins'}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={deleteEntry}
              disabled={loading}
            >
              Delete Entry
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={saveEditedEntry}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TiffinHistory;