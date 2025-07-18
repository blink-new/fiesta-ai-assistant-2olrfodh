import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Mail,
  Calendar,
  TrendingUp,
  Search,
  Wrench,
  DollarSign
} from 'lucide-react'
import { Task } from '@/types'

interface TaskListProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}

export function TaskList({ tasks, onTaskClick }: TaskListProps) {
  const getTaskIcon = (type: Task['type']) => {
    switch (type) {
      case 'kundeservice': return <Mail className="h-4 w-4" />
      case 'marketing': return <TrendingUp className="h-4 w-4" />
      case 'planlægning': return <Calendar className="h-4 w-4" />
      case 'SEO': return <Search className="h-4 w-4" />
      case 'drift': return <Wrench className="h-4 w-4" />
      case 'økonomi': return <DollarSign className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_progress': return <Clock className="h-4 w-4 text-yellow-500" />
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeColor = (type: Task['type']) => {
    switch (type) {
      case 'kundeservice': return 'bg-blue-100 text-blue-800'
      case 'marketing': return 'bg-purple-100 text-purple-800'
      case 'planlægning': return 'bg-green-100 text-green-800'
      case 'SEO': return 'bg-indigo-100 text-indigo-800'
      case 'drift': return 'bg-orange-100 text-orange-800'
      case 'økonomi': return 'bg-emerald-100 text-emerald-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Aktive Opgaver</span>
          <Badge variant="outline">{tasks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Ingen aktive opgaver</p>
              <p className="text-sm">Alle opgaver er fuldført! 🎉</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onTaskClick?.(task)}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex items-center space-x-2">
                    {getTaskIcon(task.type)}
                    {getStatusIcon(task.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {task.title}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {task.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getTypeColor(task.type)}`}
                  >
                    {task.type}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getPriorityColor(task.priority)}`}
                  >
                    {task.priority}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>

        {tasks.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" className="w-full" size="sm">
              Se alle opgaver
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}