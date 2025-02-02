import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { TaskMatch } from '@/lib/types';

interface TaskSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTask: (taskId: string) => void;
  availableTasks: TaskMatch[];
  title?: string;
  isLoading?: boolean;
}

export function TaskSelectionModal({
  open,
  onOpenChange,
  onSelectTask,
  availableTasks,
  title = "Select Task",
  isLoading = false
}: TaskSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTasks = availableTasks.filter(task => 
    task.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-4 min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTasks.length > 0 ? (
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <div
                  key={task.taskId}
                  className="p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => onSelectTask(task.taskId)}
                >
                  <div className="font-medium">{task.taskName}</div>
                  <div className="text-sm text-muted-foreground">
                    Project: {task.projectName}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No tasks found
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 