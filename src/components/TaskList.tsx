import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Edit, Trash2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

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

interface TaskListProps {
  tasks: Task[];
  onTaskUpdate: () => void;
  showActions: boolean;
}

const TaskList = ({ tasks, onTaskUpdate, showActions }: TaskListProps) => {
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [observation, setObservation] = useState('');
  const [showCloseDialog, setShowCloseDialog] = useState(false);

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

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4" />;
      case 'relatively_urgent':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  const handleCloseTask = async (status: 'delivered' | 'not_delivered') => {
    if (!selectedTask) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status,
          ceo_observation: observation || null
        })
        .eq('id', selectedTask.id);

      if (error) throw error;

      const statusMap: Record<string, string> = {
        delivered: 'concluída',
        not_delivered: 'não entregue'
      };

      toast({
        title: 'Tarefa Atualizada',
        description: `Tarefa marcada como ${statusMap[status]}.`,
      });

      setShowCloseDialog(false);
      setSelectedTask(null);
      setObservation('');
      onTaskUpdate();
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar o status da tarefa.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Tarefa Excluída',
        description: 'A tarefa foi excluída com sucesso.',
      });

      onTaskUpdate();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao excluir a tarefa.',
        variant: 'destructive'
      });
    }
  };

  const openCloseDialog = (task: Task) => {
    setSelectedTask(task);
    setObservation(task.ceo_observation || '');
    setShowCloseDialog(true);
  };

  if (tasks.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4">
        Nenhuma tarefa encontrada para este setor.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id} className={`transition-colors ${
            isOverdue(task.deadline) && task.status === 'pending' 
              ? 'border-urgent bg-urgent/5' 
              : ''
          }`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{task.title}</h3>
                    {getUrgencyIcon(task.urgency)}
                    {isOverdue(task.deadline) && task.status === 'pending' && (
                      <Badge variant="destructive" className="text-xs">
                        Atrasada
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {task.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Prazo: {format(new Date(task.deadline), 'dd/MM/yyyy HH:mm')}</span>
                    <span className="mx-2">•</span>
                    <span className="capitalize">{(() => {
                      const map: Record<string, string> = {
                        daily: 'Diária',
                        monthly: 'Mensal',
                        temporary: 'Temporária'
                      };
                      return map[task.type] || task.type;
                    })()}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  <Badge className={getUrgencyColor(task.urgency)}>
                    {(() => {
                      const map: Record<string, string> = {
                        urgent: 'Urgente',
                        relatively_urgent: 'Urgência Relativa',
                        not_urgent: 'Sem Urgência'
                      };
                      return map[task.urgency] || task.urgency.replace('_', ' ');
                    })()}
                  </Badge>
                  <Badge className={getStatusColor(task.status)}>
                    {(() => {
                      const map: Record<string, string> = {
                        delivered: 'Concluída',
                        not_delivered: 'Não Entregue',
                        pending: 'Pendente'
                      };
                      return map[task.status] || task.status.replace('_', ' ');
                    })()}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            {(showActions || task.ceo_observation) && (
              <CardContent className="pt-0">
                {task.ceo_observation && (
                  <div className="mb-3 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Observação do CEO:</p>
                    <p className="text-sm text-muted-foreground">{task.ceo_observation}</p>
                  </div>
                )}
                {showActions && task.status === 'pending' && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => openCloseDialog(task)}
                      className="bg-success hover:bg-success/90"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Encerrar Tarefa
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Close Task Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar Tarefa: {selectedTask?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Observação (Opcional)</label>
              <Textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Adicione observações sobre esta tarefa..."
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleCloseTask('delivered')}
                className="bg-success hover:bg-success/90"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar como Concluída
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleCloseTask('not_delivered')}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Marcar como Não Entregue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskList;