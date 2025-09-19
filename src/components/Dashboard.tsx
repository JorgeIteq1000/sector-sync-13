import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Building2, LogOut, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'delivered' | 'not_delivered'>('pending');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: sectorsData } = await supabase.from('sectors').select('*').order('name');
      const { data: tasksData } = await supabase.from('tasks').select('*, sector:sectors(*)').order('deadline');
      setSectors(sectorsData || []);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast({ title: 'Erro', description: 'Falha ao buscar os dados.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (deadline: string) => new Date(deadline) < new Date();

  // Calculate stats
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const deliveredTasks = tasks.filter(t => t.status === 'delivered').length;
  const notDeliveredTasks = tasks.filter(t => t.status === 'not_delivered').length;
  const overdueTasks = tasks.filter(t => t.status === 'pending' && isOverdue(t.deadline)).length;

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({ title: 'Erro', description: 'Falha ao sair. Por favor, tente novamente.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Define a ordem de prioridade dos status para ordenação
  const statusOrder = {
    'pending': 1,
    'delivered': 2,
    'not_delivered': 3
  };

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
                {profile?.role === 'ceo' ? 'CEO' : 'Colaborador'}
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
              <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTasks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deliveredTasks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Não Entregues</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notDeliveredTasks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
              <AlertCircle className="h-4 w-4 text-urgent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overdueTasks}</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          {isCEO && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowTaskForm(true)} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
              <Button variant="outline" onClick={() => setShowSectorManagement(true)}>
                <Building2 className="h-4 w-4 mr-2" />
                Gerenciar Setores
              </Button>
            </div>
          )}
          <Tabs value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)} className="ml-auto">
            <TabsList>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="delivered">Concluídas</TabsTrigger>
              <TabsTrigger value="not_delivered">Não Entregues</TabsTrigger>
              <TabsTrigger value="all">Todas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tasks by Sector (Accordion) */}
        <Accordion type="multiple" defaultValue={sectors.map(s => s.id)} className="space-y-6">
          {sectors.map((sector) => {
            // Filtra e ordena as tarefas para este setor
            const filteredAndSortedTasks = tasks
              .filter(task => 
                task.sector_id === sector.id && 
                (filterStatus === 'all' || task.status === filterStatus)
              )
              .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

            return (
              <AccordionItem value={sector.id} key={sector.id} className="border-none">
                <Card>
                  <AccordionTrigger className="w-full">
                    <CardHeader className="flex-1 p-4">
                      <CardTitle className="flex items-center justify-between text-left">
                        <span>{sector.name}</span>
                        <Badge variant="secondary">
                          {filteredAndSortedTasks.length} tarefas
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent>
                      <TaskList
                        tasks={filteredAndSortedTasks}
                        onTaskUpdate={fetchData}
                        showActions={isCEO}
                      />
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* Modals */}
      {showTaskForm && <TaskForm sectors={sectors} onClose={() => setShowTaskForm(false)} onTaskCreated={fetchData} />}
      {showSectorManagement && <SectorManagement sectors={sectors} tasks={tasks} onClose={() => setShowSectorManagement(false)} onSectorUpdated={fetchData} />}
    </div>
  );
};

export default Dashboard;