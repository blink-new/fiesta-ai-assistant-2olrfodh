import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  MapPin, 
  Users, 
  Truck,
  Plus,
  ChevronRight
} from 'lucide-react'
import { Event } from '@/types'
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns'
import { da } from 'date-fns/locale'

interface EventCalendarProps {
  events: Event[]
  onEventClick?: (event: Event) => void
  onAddEvent?: () => void
}

export function EventCalendar({ events, onEventClick, onAddEvent }: EventCalendarProps) {
  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'booked': return 'bg-green-100 text-green-800 border-green-200'
      case 'quoted': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'inquiry': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getWagonIcon = (wagon: Event['wagon']) => {
    switch (wagon) {
      case 'shawarma': return '🌯'
      case 'grill': return '🍗'
      case 'both': return '🌯🍗'
      default: return '🚚'
    }
  }

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'I dag'
    if (isTomorrow(date)) return 'I morgen'
    if (isThisWeek(date)) return format(date, 'EEEE', { locale: da })
    return format(date, 'dd/MM', { locale: da })
  }

  const upcomingEvents = events
    .filter(event => event.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Kommende Events</span>
            <Badge variant="outline">{upcomingEvents.length}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onAddEvent}>
            <Plus className="h-4 w-4 mr-1" />
            Tilføj
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Ingen kommende events</p>
              <p className="text-sm">Tid til at booke flere arrangementer! 📅</p>
            </div>
          ) : (
            upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onEventClick?.(event)}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className="text-center min-w-[60px]">
                    <div className="text-xs text-muted-foreground">
                      {getDateLabel(event.date)}
                    </div>
                    <div className="text-sm font-medium">
                      {format(event.date, 'dd/MM', { locale: da })}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-sm truncate">
                        {event.title}
                      </h4>
                      <span className="text-lg">
                        {getWagonIcon(event.wagon)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">{event.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>{event.guests} gæster</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getStatusColor(event.status)}`}
                  >
                    {event.status}
                  </Badge>
                  {event.price && (
                    <Badge variant="outline" className="text-xs">
                      {event.price.toLocaleString('da-DK')} kr
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))
          )}
        </div>

        {upcomingEvents.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" className="w-full" size="sm">
              Se fuld kalender
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}