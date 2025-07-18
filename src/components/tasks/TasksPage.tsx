import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { 
  CheckSquare, 
  Plus, 
  Filter,
  Search,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  User,
  Tag,
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Target,
  TrendingUp,
  Flame
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Task } from '@/types'
import blink from '@/blink/client'

export function TasksPage() {
  const [user, setUser] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    type: 'kundeservice' as Task['type'],
    priority: 'medium' as Task['priority'],
    dueDate: ''
  })

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged(async (state) => {
      setUser(state.user)
      if (state.user) {
        await loadTasks(state.user.id)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const loadTasks = async (userId: string) => {
    try {
      const taskData = await blink.db.tasks.list({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        limit: 100
      })

      setTasks(taskData.map(task => ({
        id: task.id,
        type: task.type as Task['type'],
        title: task.title,
        description: task.description || '',
        status: task.status as Task['status'],
        priority: task.priority as Task['priority'],
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        userId: task.userId,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        assignedTo: task.assignedTo,
        tags: task.tags ? JSON.parse(task.tags) : []
      })))
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

  const createTask = async () => {
    if (!user?.id || !newTask.title.trim()) return

    try {
      const task = {
        id: `task_${Date.now()}`,
        userId: user.id,
        ...newTask,
        status: 'pending' as Task['status'],
        dueDate: newTask.dueDate || null,
        tags: JSON.stringify([])
      }

      await blink.db.tasks.create(task)
      await loadTasks(user.id)
      
      setNewTask({
        title: '',
        description: '',
        type: 'kundeservice',
        priority: 'medium',
        dueDate: ''
      })
      setShowCreateDialog(false)
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!user?.id) return

    try {
      const updateData: any = { ...updates }
      if (updateData.tags) {
        updateData.tags = JSON.stringify(updateData.tags)
      }
      if (updateData.dueDate) {
        updateData.dueDate = updateData.dueDate.toISOString()
      }
      
      await blink.db.tasks.update(taskId, updateData)
      await loadTasks(user.id)
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!user?.id) return

    try {
      await blink.db.tasks.delete(taskId)
      await loadTasks(user.id)
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !task.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (filterStatus !== 'all' && task.status !== filterStatus) {
      return false
    }
    if (filterType !== 'all' && task.type !== filterType) {
      return false
    }
    if (filterPriority !== 'all' && task.priority !== filterPriority) {
      return false
    }
    return true
  })

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_progress': return <Play className="h-4 w-4 text-yellow-500" />
      case 'pending': return <AlertCircle className="h-4 w-4 text-orange-500" />
      case 'cancelled': return <Pause className="h-4 w-4 text-red-500" />
      default: return <CheckSquare className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getTypeColor = (type: Task['type']) => {
    switch (type) {
      case 'kundeservice': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'marketing': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'planlægning': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'økonomi': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'drift': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'SEO': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusProgress = () => {
    const total = tasks.length
    if (total === 0) return 0
    const completed = tasks.filter(t => t.status === 'completed').length
    return Math.round((completed / total) * 100)
  }

  const getOverdueTasks = () => {
    const now = new Date()
    return tasks.filter(task => 
      task.dueDate && 
      task.dueDate < now && 
      task.status !== 'completed' && 
      task.status !== 'cancelled'
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <CheckSquare className="h-8 w-8 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground">Indlæser opgaver...</p>
        </div>
      </div>
    )
  }

  const overdueTasks = getOverdueTasks()
  const completionRate = getStatusProgress()

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-2">
              <CheckSquare className="h-8 w-8 text-primary" />
              <span>Opgaver</span>
            </h1>
            <p className="text-muted-foreground">
              Administrer dine opgaver og følg fremskridt
            </p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                <Plus className="h-4 w-4 mr-2" />
                Ny Opgave
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Opret Ny Opgave</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Titel</label>
                  <Input
                    value={newTask.title}
                    onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Opgave titel..."
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Beskrivelse</label>
                  <Textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Opgave beskrivelse..."
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <Select value={newTask.type} onValueChange={(value) => setNewTask(prev => ({ ...prev, type: value as Task['type'] }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kundeservice">Kundeservice</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="planlægning">Planlægning</SelectItem>
                        <SelectItem value="økonomi">Økonomi</SelectItem>
                        <SelectItem value="drift">Drift</SelectItem>
                        <SelectItem value="SEO">SEO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Prioritet</label>
                    <Select value={newTask.priority} onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value as Task['priority'] }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Lav</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">Høj</SelectItem>
                        <SelectItem value="urgent">Akut</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Deadline (valgfri)</label>
                  <Input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Annuller
                  </Button>
                  <Button onClick={createTask} disabled={!newTask.title.trim()}>
                    Opret Opgave
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Færdighedsgrad</p>
                  <p className="text-2xl font-bold">{completionRate}%</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
              </div>
              <Progress value={completionRate} className="mt-3" />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ventende</p>
                  <p className="text-2xl font-bold">{tasks.filter(t => t.status === 'pending').length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">I gang</p>
                  <p className="text-2xl font-bold">{tasks.filter(t => t.status === 'in_progress').length}</p>
                </div>
                <Play className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className={overdueTasks.length > 0 ? "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overskredet</p>
                  <p className={`text-2xl font-bold ${overdueTasks.length > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {overdueTasks.length}
                  </p>
                </div>
                <Clock className={`h-8 w-8 ${overdueTasks.length > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Søg i opgaver..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle status</SelectItem>
                    <SelectItem value="pending">Ventende</SelectItem>
                    <SelectItem value="in_progress">I gang</SelectItem>
                    <SelectItem value="completed">Færdig</SelectItem>
                    <SelectItem value="cancelled">Annulleret</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle typer</SelectItem>
                    <SelectItem value="kundeservice">Kundeservice</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="planlægning">Planlægning</SelectItem>
                    <SelectItem value="økonomi">Økonomi</SelectItem>
                    <SelectItem value="drift">Drift</SelectItem>
                    <SelectItem value="SEO">SEO</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Prioritet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle prioriteter</SelectItem>
                    <SelectItem value="urgent">Akut</SelectItem>
                    <SelectItem value="high">Høj</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Lav</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Opgaver ({filteredTasks.length})</span>
              {filteredTasks.length > 0 && (
                <Badge variant="outline">
                  {tasks.filter(t => t.status === 'completed').length} / {tasks.length} færdige
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {filteredTasks.map(task => {
                  const isOverdue = task.dueDate && task.dueDate < new Date() && task.status !== 'completed' && task.status !== 'cancelled'
                  
                  return (
                    <Card key={task.id} className={`p-4 transition-all hover:shadow-md ${
                      isOverdue ? 'border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800' : ''
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="mt-1">
                            {getStatusIcon(task.status)}
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-2">
                              <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                {task.title}
                              </h3>
                              <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                              {isOverdue && (
                                <Badge variant="destructive" className="text-xs">
                                  Overskredet
                                </Badge>
                              )}
                            </div>
                            
                            {task.description && (
                              <p className="text-sm text-muted-foreground">
                                {task.description}
                              </p>
                            )}
                            
                            <div className="flex items-center flex-wrap gap-2">
                              <Badge className={getTypeColor(task.type)}>
                                {task.type}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {task.priority}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Oprettet: {task.createdAt.toLocaleDateString('da-DK')}
                              </span>
                              {task.dueDate && (
                                <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                                  Deadline: {task.dueDate.toLocaleDateString('da-DK')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {/* Quick Actions */}
                          {task.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTask(task.id, { status: 'in_progress' })}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Start
                            </Button>
                          )}
                          
                          {task.status === 'in_progress' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTask(task.id, { status: 'completed' })}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Færdig
                            </Button>
                          )}
                          
                          {task.status === 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTask(task.id, { status: 'pending' })}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Genåbn
                            </Button>
                          )}
                          
                          {/* More Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingTask(task)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Rediger
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => updateTask(task.id, { status: 'cancelled' })}
                                className="text-orange-600"
                              >
                                <Pause className="h-4 w-4 mr-2" />
                                Annuller
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteTask(task.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Slet
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </Card>
                  )
                })}
                
                {filteredTasks.length === 0 && (
                  <div className="text-center py-12">
                    <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Ingen opgaver</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery || filterStatus !== 'all' || filterType !== 'all' || filterPriority !== 'all'
                        ? 'Ingen opgaver matcher dine filtre'
                        : 'Opret din første opgave for at komme i gang'
                      }
                    </p>
                    {!searchQuery && filterStatus === 'all' && filterType === 'all' && filterPriority === 'all' && (
                      <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Opret Opgave
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}