import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, 
  Clock, 
  Calendar,
  Flame
} from 'lucide-react'

interface ChatSession {
  id: string
  title: string
  summary?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
  lastMessageAt: Date
  messageCount: number
  userId: string
}

interface ChatSessionCardProps {
  session: ChatSession
  isSelected: boolean
  onClick: () => void
}

export function ChatSessionCard({ session, isSelected, onClick }: ChatSessionCardProps) {
  const formatDate = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('da-DK', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('da-DK', { 
        weekday: 'short' 
      })
    } else {
      return date.toLocaleDateString('da-DK', { 
        day: '2-digit', 
        month: '2-digit' 
      })
    }
  }

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected 
          ? 'ring-2 ring-primary bg-primary/5 border-primary/20' 
          : 'hover:border-primary/20'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Flame className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-sm truncate">
                  {session.title}
                </h4>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(session.createdAt)}</span>
                  <span>•</span>
                  <MessageSquare className="h-3 w-3" />
                  <span>{session.messageCount}</span>
                </div>
              </div>
            </div>
            
            {session.lastMessageAt.getTime() > Date.now() - 24 * 60 * 60 * 1000 && (
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
            )}
          </div>

          {/* Summary */}
          {session.summary && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {session.summary}
            </p>
          )}

          {/* Tags */}
          {session.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {session.tags.slice(0, 3).map(tag => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className="text-xs px-2 py-0.5"
                >
                  {tag}
                </Badge>
              ))}
              {session.tags.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  +{session.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>Sidst aktiv {formatDate(session.lastMessageAt)}</span>
            </div>
            
            {isSelected && (
              <Badge variant="default" className="text-xs">
                Aktiv
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}