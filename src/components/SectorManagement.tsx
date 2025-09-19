import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';

interface Sector {
  id: string;
  name: string;
  created_at: string;
}

interface Task {
  id: string;
  sector_id: string;
}

interface SectorManagementProps {
  sectors: Sector[];
  tasks: Task[];
  onClose: () => void;
  onSectorUpdated: () => void;
}

const SectorManagement = ({ sectors, tasks, onClose, onSectorUpdated }: SectorManagementProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [sectorName, setSectorName] = useState('');

  const getSectorTaskCount = (sectorId: string) => {
    return tasks.filter(task => task.sector_id === sectorId).length;
  };

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('sectors')
        .insert([{ name: sectorName }]);

      if (error) throw error;

      toast({
        title: 'Setor Criado',
        description: 'O novo setor foi criado com sucesso.',
      });

      setSectorName('');
      setShowCreateForm(false);
      onSectorUpdated();
    } catch (error) {
      console.error('Error creating sector:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar o setor. Por favor, tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSector) return;
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from('sectors')
        .update({ name: sectorName })
        .eq('id', editingSector.id);

      if (error) throw error;

      toast({
        title: 'Setor Atualizado',
        description: 'O nome do setor foi atualizado com sucesso.',
      });

      setSectorName('');
      setEditingSector(null);
      onSectorUpdated();
    } catch (error) {
      console.error('Error updating sector:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar o setor. Por favor, tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSector = async (sector: Sector) => {
    const taskCount = getSectorTaskCount(sector.id);
    
    if (taskCount > 0) {
      if (!confirm(`Este setor possui ${taskCount} tarefa(s). Tem certeza que deseja excluí-lo? Esta ação não pode ser desfeita.`)) {
        return;
      }
    } else {
      if (!confirm('Tem certeza que deseja excluir este setor?')) {
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('sectors')
        .delete()
        .eq('id', sector.id);

      if (error) throw error;

      toast({
        title: 'Setor Excluído',
        description: 'O setor foi excluído com sucesso.',
      });

      onSectorUpdated();
    } catch (error) {
      console.error('Error deleting sector:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao excluir o setor. Por favor, tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (sector: Sector) => {
    setEditingSector(sector);
    setSectorName(sector.name);
    setShowCreateForm(false);
  };

  const startCreate = () => {
    setShowCreateForm(true);
    setEditingSector(null);
    setSectorName('');
  };

  const cancelEdit = () => {
    setEditingSector(null);
    setShowCreateForm(false);
    setSectorName('');
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Gerenciamento de Setores
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create/Edit Form */}
          {(showCreateForm || editingSector) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {editingSector ? 'Editar Setor' : 'Criar Novo Setor'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={editingSector ? handleUpdateSector : handleCreateSector} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="sectorName">Nome do Setor</Label>
                    <Input
                      id="sectorName"
                      value={sectorName}
                      onChange={(e) => setSectorName(e.target.value)}
                      placeholder="Digite o nome do setor"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading} size="sm">
                      {loading ? 'Salvando...' : (editingSector ? 'Atualizar' : 'Criar')}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Create Button */}
          {!showCreateForm && !editingSector && (
            <Button onClick={startCreate} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Criar Novo Setor
            </Button>
          )}

          {/* Sectors List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sectors.map((sector) => (
              <Card key={sector.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-medium">{sector.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getSectorTaskCount(sector.id)} tarefa(s)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(sector)}
                      disabled={loading}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteSector(sector)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SectorManagement;