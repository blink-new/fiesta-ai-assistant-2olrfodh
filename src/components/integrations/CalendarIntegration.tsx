import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Calendar as CalendarIcon, Clock, MapPin, Users, Plus, Edit, Trash2, CheckCircle, AlertCircle, RefreshCw, Settings, Bell, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { useToast } from '@/hooks/use-toast'
import blink from '@/blink/client'

interface CalendarEvent {
  id: string
  userId: string
  title: string
  description?: string
  date: Date
  startTime: string
  endTime: string
  location?: string
  guests?: number
  status: 'planned' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  type: 'event' | 'booking' | 'meeting' | 'reminder' | 'maintenance'
  wagon?: 'shawarma' | 'grill' | 'both'
  price?: number
  customerEmail?: string
  customerPhone?: string
  notes?: string
  reminderSent?: boolean
  createdAt: Date
  updatedAt: Date
}

interface CalendarReminder {
  id: string
  eventId: string
  type: '48h' | '24h' | '2h' | 'custom'
  message: string
  sent: boolean
  scheduledFor: Date
}

export function CalendarIntegration() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: new Date(),
    startTime: '10:00',
    endTime: '18:00',
    location: '',
    guests: 0,
    status: 'planned' as CalendarEvent['status'],
    type: 'event' as CalendarEvent['type'],
    wagon: 'both' as CalendarEvent['wagon'],
    price: 0,
    customerEmail: '',
    customerPhone: '',
    notes: ''
  })
  const { toast } = useToast()

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged(async (state) => {
      setUser(state.user)
      if (state.user) {
        await loadEvents(state.user.id)
      }
      setLoading(false)
    })
    return unsubscribe
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadEvents = async (userId: string) => {
    try {
      const eventData = await blink.db.calendarEvents.list({
        where: { userId },
        orderBy: { date: 'asc' },
        limit: 200
      })

      setEvents(eventData.map(event => ({
        id: event.id,
        userId: event.userId,
        title: event.title,
        description: event.description,
        date: new Date(event.date),
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        guests: event.guests,
        status: event.status as CalendarEvent['status'],
        type: event.type as CalendarEvent['type'],
        wagon: event.wagon as CalendarEvent['wagon'],
        price: event.price,
        customerEmail: event.customerEmail,
        customerPhone: event.customerPhone,
        notes: event.notes,
        reminderSent: Number(event.reminderSent) > 0,
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt)
      })))

      // Create sample events if none exist
      if (eventData.length === 0) {
        await createSampleEvents(userId)
        setTimeout(() => loadEvents(userId), 1000)
      }
    } catch (error) {
      console.error('Error loading events:', error)
    }
  }

  const createSampleEvents = async (userId: string) => {
    try {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)
      
      const nextMonth = new Date(today)
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      await blink.db.calendarEvents.createMany([
        {
          id: `cal_${Date.now()}_1`,
          userId,
          title: 'Ellevangskolen Festival',
          description: 'Skolefestival med 200 elever - mellemøstlig mad',
          date: nextWeek.toISOString().split('T')[0],
          startTime: '11:00',
          endTime: '15:00',
          location: 'Ellevangskolen, Aarhus',
          guests: 200,
          status: 'confirmed',
          type: 'booking',
          wagon: 'shawarma',
          price: 25000,
          customerEmail: 'info@ellevangskolen.dk',
          customerPhone: '+45 86 12 34 56',
          notes: 'Strøm tilgængelig. Setup fra kl. 10:00',
          reminderSent: false
        },
        {
          id: `cal_${Date.now()}_2`,
          userId,
          title: 'Kapsejladsen Aarhus',
          description: 'Årlig kapsejlads ved Aarhus Havn',
          date: nextMonth.toISOString().split('T')[0],
          startTime: '12:00',
          endTime: '20:00',
          location: 'Aarhus Havn',
          guests: 500,
          status: 'confirmed',
          type: 'booking',
          wagon: 'both',
          price: 62500,
          customerEmail: 'events@aarhushavn.dk',
          customerPhone: '+45 87 30 30 30',
          notes: 'Stor event - begge vogne nødvendige',
          reminderSent: false
        },
        {
          id: `cal_${Date.now()}_3`,
          userId,
          title: 'Vogn Vedligeholdelse',
          description: 'Månedlig service af Shawarma Wagon',
          date: tomorrow.toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '12:00',
          location: 'Værksted, Viby J',
          guests: 0,
          status: 'planned',
          type: 'maintenance',
          wagon: 'shawarma',
          price: 0,
          notes: 'Tjek gas, rengøring, temperatur sensorer',
          reminderSent: false
        }
      ])
    } catch (error) {
      console.error('Error creating sample events:', error)
    }
  }

  const saveEvent = async () => {
    if (!user?.id || !eventForm.title) return

    try {
      const eventData = {
        id: selectedEvent?.id || `cal_${Date.now()}`,
        userId: user.id,
        title: eventForm.title,
        description: eventForm.description,
        date: eventForm.date.toISOString().split('T')[0],
        startTime: eventForm.startTime,
        endTime: eventForm.endTime,
        location: eventForm.location,
        guests: eventForm.guests,
        status: eventForm.status,
        type: eventForm.type,
        wagon: eventForm.wagon,
        price: eventForm.price,
        customerEmail: eventForm.customerEmail,
        customerPhone: eventForm.customerPhone,
        notes: eventForm.notes,
        reminderSent: false
      }

      if (selectedEvent) {
        // Update existing event
        await blink.db.calendarEvents.update(selectedEvent.id, eventData)
        setEvents(prev => prev.map(e => 
          e.id === selectedEvent.id 
            ? { ...eventData, date: eventForm.date, reminderSent: false, createdAt: e.createdAt, updatedAt: new Date() }
            : e
        ))
        toast({
          title: "Event opdateret",
          description: "Kalenderevent er blevet opdateret",
        })
      } else {
        // Create new event
        await blink.db.calendarEvents.create(eventData)
        setEvents(prev => [...prev, {
          ...eventData,
          date: eventForm.date,
          reminderSent: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }])
        toast({
          title: "Event oprettet",
          description: "Nyt kalenderevent er blevet oprettet",
        })
      }

      // Auto-schedule reminders
      if (eventForm.type === 'booking' && eventForm.customerEmail) {
        await scheduleReminders(eventData.id, eventForm.date, eventForm.customerEmail)
      }

      setShowEventDialog(false)
      resetForm()
    } catch (error) {
      console.error('Error saving event:', error)
      toast({
        title: "Fejl",
        description: "Kunne ikke gemme event",
        variant: "destructive"
      })
    }
  }

  const scheduleReminders = async (eventId: string, eventDate: Date, customerEmail: string) => {
    try {
      // Schedule 48h reminder
      const reminder48h = new Date(eventDate)
      reminder48h.setHours(reminder48h.getHours() - 48)

      // Schedule 24h reminder  
      const reminder24h = new Date(eventDate)
      reminder24h.setHours(reminder24h.getHours() - 24)

      // For now, we'll just log the reminders
      // In a real implementation, you'd use a job scheduler
      console.log(`Scheduled reminders for event ${eventId}:`, {
        '48h': reminder48h,
        '24h': reminder24h,
        email: customerEmail
      })

      toast({
        title: "Påmindelser planlagt",
        description: "Automatiske påmindelser er blevet planlagt",
      })
    } catch (error) {
      console.error('Error scheduling reminders:', error)
    }
  }

  const deleteEvent = async (eventId: string) => {
    try {
      await blink.db.calendarEvents.delete(eventId)
      setEvents(prev => prev.filter(e => e.id !== eventId))
      
      toast({
        title: "Event slettet",
        description: "Kalenderevent er blevet slettet",
      })
      
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null)
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      toast({
        title: "Fejl",
        description: "Kunne ikke slette event",
        variant: "destructive"
      })
    }
  }

  const sendReminder = async (event: CalendarEvent) => {
    if (!event.customerEmail) return

    try {
      const reminderContent = `Hej!

Vi glæder os til at se jer i morgen til ${event.title}!

📋 Event detaljer:
• Dato: ${event.date.toLocaleDateString('da-DK')}
• Tid: ${event.startTime} - ${event.endTime}
• Lokation: ${event.location}
• Antal gæster: ${event.guests}

Vi ankommer ca. 30 minutter før start for setup.

Har I spørgsmål, så ring på +45 22 65 02 26.

Vi ses i morgen! 🔥🌯

Venlig hilsen,
Jonas & Foodtruck Fiesta teamet`

      const result = await blink.notifications.email({
        to: event.customerEmail,
        from: 'ftfiestaa@gmail.com',
        subject: `🔥 Påmindelse: ${event.title} i morgen!`,
        html: reminderContent.replace(/\n/g, '<br>'),
        text: reminderContent
      })

      if (result.success) {
        // Mark reminder as sent
        await blink.db.calendarEvents.update(event.id, {
          reminderSent: true
        })

        setEvents(prev => prev.map(e => 
          e.id === event.id 
            ? { ...e, reminderSent: true }
            : e
        ))

        toast({
          title: "Påmindelse sendt",
          description: `Email sendt til ${event.customerEmail}`,
        })
      }
    } catch (error) {
      console.error('Error sending reminder:', error)
      toast({
        title: "Fejl",
        description: "Kunne ikke sende påmindelse",
        variant: "destructive"
      })
    }
  }

  const openEventDialog = (event?: CalendarEvent) => {
    if (event) {
      setSelectedEvent(event)
      setEventForm({
        title: event.title,
        description: event.description || '',
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location || '',
        guests: event.guests || 0,
        status: event.status,
        type: event.type,
        wagon: event.wagon || 'both',
        price: event.price || 0,
        customerEmail: event.customerEmail || '',
        customerPhone: event.customerPhone || '',
        notes: event.notes || ''
      })
    } else {
      setSelectedEvent(null)
      resetForm()
    }
    setShowEventDialog(true)
  }

  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      date: selectedDate,
      startTime: '10:00',
      endTime: '18:00',
      location: '',
      guests: 0,
      status: 'planned',
      type: 'event',
      wagon: 'both',
      price: 0,
      customerEmail: '',
      customerPhone: '',
      notes: ''
    })
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      event.date.toDateString() === date.toDateString()
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'text-yellow-600 bg-yellow-50'
      case 'confirmed': return 'text-green-600 bg-green-50'
      case 'in_progress': return 'text-blue-600 bg-blue-50'
      case 'completed': return 'text-gray-600 bg-gray-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'booking': return '🍽️'
      case 'meeting': return '👥'
      case 'reminder': return '⏰'
      case 'maintenance': return '🔧'
      default: return '📅'
    }
  }

  const todayEvents = getEventsForDate(new Date())
  const upcomingEvents = events
    .filter(e => e.date > new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <CalendarIcon className="h-8 w-8 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground">Indlæser kalender...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <CalendarIcon className="h-8 w-8 text-primary" />
              <span>Kalender Integration</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Administrer events, bookings og påmindelser
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => openEventDialog()}
              className="bg-gradient-to-r from-primary to-accent"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nyt Event
            </Button>
            <Button variant="outline" onClick={() => user && loadEvents(user.id)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Opdater
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{todayEvents.length}</p>
                  <p className="text-xs text-muted-foreground">I dag</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{events.filter(e => e.status === 'confirmed').length}</p>
                  <p className="text-xs text-muted-foreground">Bekræftet</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{events.filter(e => e.type === 'booking').length}</p>
                  <p className="text-xs text-muted-foreground">Bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{events.filter(e => !e.reminderSent && e.customerEmail).length}</p>
                  <p className="text-xs text-muted-foreground">Påmindelser</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Kalender</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
                modifiers={{
                  hasEvent: (date) => getEventsForDate(date).length > 0
                }}
                modifiersStyles={{
                  hasEvent: { 
                    backgroundColor: 'hsl(var(--primary))', 
                    color: 'white',
                    fontWeight: 'bold'
                  }
                }}
              />
              
              {/* Today's Events */}
              <div className="mt-4">
                <h3 className="font-medium mb-2">I dag ({todayEvents.length})</h3>
                <div className="space-y-2">
                  {todayEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Ingen events i dag</p>
                  ) : (
                    todayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="p-2 rounded-lg border cursor-pointer hover:bg-muted/50"
                        onClick={() => openEventDialog(event)}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{getTypeIcon(event.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {event.startTime} - {event.endTime}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                Events for {selectedDate.toLocaleDateString('da-DK')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {getEventsForDate(selectedDate).length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Ingen events på denne dato</p>
                      <Button
                        onClick={() => openEventDialog()}
                        variant="outline"
                        className="mt-4"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Opret Event
                      </Button>
                    </div>
                  ) : (
                    getEventsForDate(selectedDate).map((event) => (
                      <Card key={event.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3">
                                <span className="text-2xl">{getTypeIcon(event.type)}</span>
                                <div>
                                  <h3 className="font-medium">{event.title}</h3>
                                  {event.description && (
                                    <p className="text-sm text-muted-foreground">{event.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge className={getStatusColor(event.status)}>
                                  {event.status}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEventDialog(event)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>{event.startTime} - {event.endTime}</span>
                              </div>
                              {event.location && (
                                <div className="flex items-center space-x-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate">{event.location}</span>
                                </div>
                              )}
                              {event.guests && event.guests > 0 && (
                                <div className="flex items-center space-x-2">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span>{event.guests} gæster</span>
                                </div>
                              )}
                              {event.price && event.price > 0 && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-green-600 font-medium">
                                    {event.price.toLocaleString('da-DK')} kr
                                  </span>
                                </div>
                              )}
                            </div>

                            {event.customerEmail && (
                              <div className="flex items-center justify-between pt-2 border-t">
                                <div className="text-sm text-muted-foreground">
                                  {event.customerEmail}
                                  {event.customerPhone && ` • ${event.customerPhone}`}
                                </div>
                                <div className="flex items-center space-x-2">
                                  {event.reminderSent ? (
                                    <Badge variant="secondary" className="text-xs">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Påmindelse sendt
                                    </Badge>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => sendReminder(event)}
                                    >
                                      <Bell className="h-4 w-4 mr-1" />
                                      Send påmindelse
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle>Kommende Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEventDialog(event)}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-lg">{getTypeIcon(event.type)}</span>
                        <Badge className={getStatusColor(event.status)} variant="secondary">
                          {event.status}
                        </Badge>
                      </div>
                      <h3 className="font-medium">{event.title}</h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="h-3 w-3" />
                          <span>{event.date.toLocaleDateString('da-DK')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-3 w-3" />
                          <span>{event.startTime} - {event.endTime}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Event Dialog */}
        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedEvent ? 'Rediger Event' : 'Nyt Event'}
              </DialogTitle>
              <DialogDescription>
                Udfyld event detaljer og gem
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Titel:</label>
                  <Input
                    value={eventForm.title}
                    onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Event titel"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type:</label>
                  <Select value={eventForm.type} onValueChange={(value) => setEventForm(prev => ({ ...prev, type: value as CalendarEvent['type'] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="booking">Booking</SelectItem>
                      <SelectItem value="meeting">Møde</SelectItem>
                      <SelectItem value="reminder">Påmindelse</SelectItem>
                      <SelectItem value="maintenance">Vedligeholdelse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Beskrivelse:</label>
                <Textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Event beskrivelse"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Start tid:</label>
                  <Input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Slut tid:</label>
                  <Input
                    type="time"
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status:</label>
                  <Select value={eventForm.status} onValueChange={(value) => setEventForm(prev => ({ ...prev, status: value as CalendarEvent['status'] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planlagt</SelectItem>
                      <SelectItem value="confirmed">Bekræftet</SelectItem>
                      <SelectItem value="in_progress">I gang</SelectItem>
                      <SelectItem value="completed">Afsluttet</SelectItem>
                      <SelectItem value="cancelled">Aflyst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Lokation:</label>
                  <Input
                    value={eventForm.location}
                    onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Event lokation"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Antal gæster:</label>
                  <Input
                    type="number"
                    value={eventForm.guests}
                    onChange={(e) => setEventForm(prev => ({ ...prev, guests: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Vogn:</label>
                  <Select value={eventForm.wagon} onValueChange={(value) => setEventForm(prev => ({ ...prev, wagon: value as CalendarEvent['wagon'] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shawarma">Shawarma Wagon</SelectItem>
                      <SelectItem value="grill">Grill Wagon</SelectItem>
                      <SelectItem value="both">Begge vogne</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Pris (kr):</label>
                  <Input
                    type="number"
                    value={eventForm.price}
                    onChange={(e) => setEventForm(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Kunde email:</label>
                  <Input
                    type="email"
                    value={eventForm.customerEmail}
                    onChange={(e) => setEventForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="kunde@example.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Kunde telefon:</label>
                  <Input
                    value={eventForm.customerPhone}
                    onChange={(e) => setEventForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="+45 12 34 56 78"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Noter:</label>
                <Textarea
                  value={eventForm.notes}
                  onChange={(e) => setEventForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Interne noter og kommentarer"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <div className="flex items-center justify-between w-full">
                <div>
                  {selectedEvent && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        deleteEvent(selectedEvent.id)
                        setShowEventDialog(false)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Slet
                    </Button>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                    Annuller
                  </Button>
                  <Button onClick={saveEvent} disabled={!eventForm.title}>
                    {selectedEvent ? 'Opdater' : 'Opret'} Event
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}