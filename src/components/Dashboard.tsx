import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, AlertCircle, CheckCircle, XCircle, Building2, Clock, LogOut } from 'lucide-react';
import TaskForm from './TaskForm';
import SectorManagement from './SectorManagement';
import TaskList from './TaskList';

interface Sector {
  id: string;
  name: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: 'daily' | 'monthly' | 'temporary';
  sector_id: string;
  deadline: string;
  urgency: 'not_urgent' | 'relatively_urgent' | 'urgent';
  status: 'pending' | 'delivered' | 'not_delivered';
  ceo_observation: string | null;
  created_at: string;
  updated_at: string;
  sector?: Sector;
}

const Dashboard = () => {
  const { profile, isCEO, signOut } = useAuth();
  const { toast } = useToast();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showSectorManagement, setShowSectorManagement] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch sectors
      const { data: sectorsData } = await supabase
        .from('sectors')
        .select('*')
        .order('name');

      // Fetch tasks with sectors
      const { data: tasksData } = await supabase
        .from('tasks')
        .select(`
          *,
          sector:sectors(*)
        `)
        .order('deadline');

      setSectors(sectorsData || []);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'bg-urgent text-urgent-foreground';
      case 'relatively_urgent':
        return 'bg-relatively-urgent text-relatively-urgent-foreground';
      case 'not_urgent':
        return 'bg-not-urgent text-not-urgent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-success text-success-foreground';
      case 'not_delivered':
        return 'bg-destructive text-destructive-foreground';
      case 'pending':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  // Calculate stats
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const deliveredTasks = tasks.filter(t => t.status === 'delivered').length;
  const notDeliveredTasks = tasks.filter(t => t.status === 'not_delivered').length;
  const overdueTasks = tasks.filter(t => t.status === 'pending' && isOverdue(t.deadline)).length;

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to log out. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">TaskSync</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-sm">
                {profile?.role === 'ceo' ? 'CEO' : 'Collaborator'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {profile?.full_name}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTasks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deliveredTasks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Not Delivered</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notDeliveredTasks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-urgent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overdueTasks}</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        {isCEO && (
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              onClick={() => setShowTaskForm(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowSectorManagement(true)}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Manage Sectors
            </Button>
          </div>
        )}

        {/* Tasks by Sector */}
        <div className="space-y-6">
          {sectors.map((sector) => (
            <Card key={sector.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{sector.name}</span>
                  <Badge variant="secondary">
                    {tasks.filter(t => t.sector_id === sector.id).length} tasks
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TaskList
                  tasks={tasks.filter(t => t.sector_id === sector.id)}
                  onTaskUpdate={fetchData}
                  showActions={isCEO}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showTaskForm && (
        <TaskForm
          sectors={sectors}
          onClose={() => setShowTaskForm(false)}
          onTaskCreated={fetchData}
        />
      )}

      {showSectorManagement && (
        <SectorManagement
          sectors={sectors}
          tasks={tasks}
          onClose={() => setShowSectorManagement(false)}
          onSectorUpdated={fetchData}
        />
      )}
    </div>
  );
};

export default Dashboard;