import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { ModeSelector } from '@/components/ai/ModeSelector'
import { ChatInterface } from '@/components/ai/ChatInterface'
import { KPIWidget } from '@/components/dashboard/KPIWidget'
import { TaskList } from '@/components/dashboard/TaskList'
import { EventCalendar } from '@/components/dashboard/EventCalendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuoteGenerator } from '@/components/business/QuoteGenerator'
import { MenuManager } from '@/components/business/MenuManager'
import { SocialMediaManager } from '@/components/business/SocialMediaManager'
import { InvoiceGenerator } from '@/components/business/InvoiceGenerator'
import { ComplianceTracker } from '@/components/business/ComplianceTracker'
import { GoogleCalendarSetup } from '@/components/integrations/GoogleCalendarSetup'
import { ChatHistory } from '@/components/history/ChatHistory'
import { TasksPage } from '@/components/tasks/TasksPage'
import { KnowledgeBase } from '@/components/knowledge/KnowledgeBase'
import { 
  BarChart3, 
  MessageSquare, 
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  Flame,
  History,
  RefreshCw
} from 'lucide-react'
import { AIMode, KPI, Task, Event } from '@/types'
import blink from '@/blink/client'

function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMode, setSelectedMode] = useState<AIMode['id']>('auto')
  const [showAdvanced, setShowAdvanced] = useState(true)
  const [currentView, setCurrentView] = useState<'dashboard' | 'history' | 'tasks' | 'knowledge'>('dashboard')
  const [currentSessionId, setCurrentSessionId] = useState<string | null | undefined>(undefined)

  // Real data from Blink DB
  const [kpis, setKpis] = useState<KPI[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<Event[]>([])

  // Load data from database
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return

      try {
        // Load KPIs
        const kpiData = await blink.db.kpis.list({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          limit: 10
        })
        setKpis(kpiData.map(kpi => ({
          name: kpi.name,
          value: kpi.value,
          target: kpi.target,
          unit: kpi.unit,
          trend: kpi.trend as 'up' | 'down' | 'stable'
        })))

        // Load Tasks
        const taskData = await blink.db.tasks.list({
          where: { userId: user.id, status: ['pending', 'in_progress'] },
          orderBy: { createdAt: 'desc' },
          limit: 10
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
          userId: task.userId
        })))

        // Load Events
        const eventData = await blink.db.events.list({
          where: { userId: user.id },
          orderBy: { date: 'asc' },
          limit: 10
        })
        setEvents(eventData.map(event => ({
          id: event.id,
          title: event.title,
          date: new Date(event.date),
          location: event.location,
          guests: event.guests,
          status: event.status as Event['status'],
          wagon: event.wagon as Event['wagon'],
          price: event.price,
          userId: event.userId
        })))

        // If no data exists, create some sample data
        if (kpiData.length === 0) {
          await createSampleData(user.id)
          // Reload data after creating samples
          setTimeout(() => loadData(), 1000)
        }

      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    loadData()
  }, [user?.id])

  const createSampleData = async (userId: string) => {
    try {
      // Create sample tasks
      await blink.db.tasks.createMany([
        {
          id: `task_${Date.now()}_1`,
          userId,
          type: 'kundeservice',
          title: 'Svar på Ellevangskolen forespørgsel',
          description: 'Festival 16. maj - 200 gæster',
          status: 'pending',
          priority: 'high'
        },
        {
          id: `task_${Date.now()}_2`,
          userId,
          type: 'marketing',
          title: 'Opret SoMe indhold til uge 29',
          description: '10 opslag, 2 reels, 1 annonce',
          status: 'in_progress',
          priority: 'medium'
        },
        {
          id: `task_${Date.now()}_3`,
          userId,
          type: 'økonomi',
          title: 'Importer Sydbank CSV',
          description: 'Bogføring for juni måned',
          status: 'pending',
          priority: 'medium'
        }
      ])

      // Create sample events
      await blink.db.events.createMany([
        {
          id: `event_${Date.now()}_1`,
          userId,
          title: 'Ellevangskolen Festival',
          date: '2025-05-16',
          location: 'Ellevangskolen, Aarhus',
          guests: 200,
          status: 'quoted',
          wagon: 'shawarma',
          price: 25000
        },
        {
          id: `event_${Date.now()}_2`,
          userId,
          title: 'Kapsejladsen Århus',
          date: '2025-05-01',
          location: 'Aarhus Havn',
          guests: 500,
          status: 'booked',
          wagon: 'both',
          price: 62500
        },
        {
          id: `event_${Date.now()}_3`,
          userId,
          title: 'Roskilde Festival',
          date: '2025-06-17',
          location: 'Roskilde',
          guests: 5000,
          status: 'booked',
          wagon: 'both',
          price: 625000
        }
      ])

      // Create sample KPIs
      await blink.db.kpis.createMany([
        {
          id: `kpi_${Date.now()}_1`,
          userId,
          name: 'Svartid (timer)',
          value: 18,
          target: 24,
          unit: 'h',
          trend: 'up',
          date: new Date().toISOString().split('T')[0]
        },
        {
          id: `kpi_${Date.now()}_2`,
          userId,
          name: 'Bruttoavance',
          value: 68,
          target: 65,
          unit: '%',
          trend: 'up',
          date: new Date().toISOString().split('T')[0]
        },
        {
          id: `kpi_${Date.now()}_3`,
          userId,
          name: 'SoMe Reach',
          value: 4200,
          target: 4000,
          unit: 'følgere',
          trend: 'up',
          date: new Date().toISOString().split('T')[0]
        },
        {
          id: `kpi_${Date.now()}_4`,
          userId,
          name: 'Events denne måned',
          value: 12,
          target: 15,
          unit: 'events',
          trend: 'stable',
          date: new Date().toISOString().split('T')[0]
        }
      ])
    } catch (error) {
      console.error('Error creating sample data:', error)
    }
  }

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <Flame className="h-12 w-12 text-primary mx-auto animate-pulse" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full animate-ping" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">FiestaAI</h2>
            <p className="text-muted-foreground">Starter din operations-assistent...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="relative mx-auto mb-4">
              <Flame className="h-16 w-16 text-primary" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full animate-pulse" />
            </div>
            <CardTitle className="font-display text-3xl">FiestaAI</CardTitle>
            <p className="text-muted-foreground">
              Operations Assistant for Foodtruck Fiesta ApS
            </p>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm">
              Log ind for at få adgang til din AI-assistent til kundeservice, 
              event-booking, menukort, bogføring og meget mere.
            </p>
            <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
              <Badge variant="outline">🌯 Shawarma Wagon</Badge>
              <Badge variant="outline">🍗 Grill Wagon</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleNewChat = () => {
    setCurrentSessionId(null)
  }

  const handleNewSession = () => {
    // Refresh session list in history if needed
    setCurrentSessionId(undefined)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        user={user} 
        currentView={currentView}
        onViewChange={setCurrentView}
        onNewChat={handleNewChat}
      />
      
      {currentView === 'history' ? (
        <ChatHistory />
      ) : currentView === 'tasks' ? (
        <TasksPage />
      ) : currentView === 'knowledge' ? (
        <KnowledgeBase />
      ) : (
        <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
          {/* Left Column - Dashboard */}
          <div className="lg:col-span-1 space-y-6 overflow-y-auto">
            {/* Welcome Card */}
            <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="relative">
                    <Flame className="h-8 w-8 text-primary" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold">
                      Velkommen, Jonas! 🔥
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Din AI-assistent er klar til at hjælpe
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>System Online</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span>{tasks.filter(t => t.status === 'pending').length} ventende</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span>{events.filter(e => e.date >= new Date()).length} events</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span>68% avance</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {kpis.map((kpi, index) => (
                <KPIWidget key={index} kpi={kpi} />
              ))}
            </div>

            {/* Tasks and Events */}
            <Tabs defaultValue="tasks" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tasks" className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Opgaver</span>
                </TabsTrigger>
                <TabsTrigger value="events" className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Events</span>
                </TabsTrigger>
                <TabsTrigger value="business" className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Business</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="tasks">
                <TaskList tasks={tasks} />
              </TabsContent>
              <TabsContent value="events">
                <EventCalendar events={events} />
              </TabsContent>
              <TabsContent value="business">
                <Tabs defaultValue="quotes" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="quotes">Tilbud</TabsTrigger>
                    <TabsTrigger value="invoices">Fakturaer</TabsTrigger>
                    <TabsTrigger value="menu">Menu</TabsTrigger>
                    <TabsTrigger value="social">SoMe</TabsTrigger>
                    <TabsTrigger value="compliance">Compliance</TabsTrigger>
                  </TabsList>
                  <TabsContent value="quotes">
                    <QuoteGenerator />
                  </TabsContent>
                  <TabsContent value="invoices">
                    <InvoiceGenerator />
                  </TabsContent>
                  <TabsContent value="menu">
                    <MenuManager />
                  </TabsContent>
                  <TabsContent value="social">
                    <SocialMediaManager />
                  </TabsContent>
                  <TabsContent value="compliance">
                    <ComplianceTracker />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - AI Chat */}
          <div className="lg:col-span-2 flex flex-col space-y-4">
            <ModeSelector
              selectedMode={selectedMode}
              onModeChange={setSelectedMode}
              showAdvanced={showAdvanced}
              onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
            />
            
            <Card className="flex-1 flex flex-col min-h-0">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>FiestaAI Chat</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                    Online
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0 p-0">
                <ChatInterface 
                  mode={selectedMode} 
                  advancedMode={showAdvanced} 
                  sessionId={currentSessionId}
                  onNewSession={handleNewSession}
                />
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      )}
    </div>
  )
}

export default App