import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Search, 
  Filter, 
  Calendar,
  MessageSquare,
  Tag,
  Clock,
  Flame,
  Bot,
  User,
  ChevronRight,
  Trash2,
  Star,
  Archive
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { ChatSessionCard } from './ChatSessionCard'
import { TagManager } from './TagManager'
import { ConversationSummary } from './ConversationSummary'
import blink from '@/blink/client'

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

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  mode: string
  taskType?: string
  createdAt: Date
  userId: string
}

interface ChatTag {
  id: string
  name: string
  color: string
  usageCount: number
  userId: string
}

interface ChatHistoryProps {
  onSelectSession?: (sessionId: string) => void
}

export function ChatHistory({ onSelectSession }: ChatHistoryProps = {}) {
  const [user, setUser] = useState<any>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [tags, setTags] = useState<ChatTag[]>([])
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'title'>('recent')
  const [loading, setLoading] = useState(true)
  const [showTagManager, setShowTagManager] = useState(false)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged(async (state) => {
      setUser(state.user)
      if (state.user) {
        await loadHistoryData(state.user.id)
      }
      setLoading(false)
    })
    return unsubscribe
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadHistoryData = async (userId: string) => {
    try {
      // Load chat sessions
      await loadChatSessions(userId)
      
      // Load tags
      const tagData = await blink.db.chatTags.list({
        where: { userId },
        orderBy: { usageCount: 'desc' }
      })
      
      setTags(tagData.map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        usageCount: tag.usageCount,
        userId: tag.userId
      })))

    } catch (error) {
      console.error('Error loading history data:', error)
    }
  }

  const loadChatSessions = async (userId: string) => {
    try {
      // Get all messages grouped by date to create sessions
      const messages = await blink.db.chatMessages.list({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        limit: 1000
      })

      // Group messages into sessions by date
      const sessionMap = new Map<string, ChatMessage[]>()
      
      messages.forEach(msg => {
        const date = new Date(msg.createdAt).toDateString()
        if (!sessionMap.has(date)) {
          sessionMap.set(date, [])
        }
        sessionMap.get(date)!.push({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          mode: msg.mode,
          taskType: msg.taskType,
          createdAt: new Date(msg.createdAt),
          userId: msg.userId
        })
      })

      // Convert to sessions
      const sessionList: ChatSession[] = []
      
      for (const [dateStr, msgs] of sessionMap.entries()) {
        const date = new Date(dateStr)
        const firstUserMessage = msgs.find(m => m.role === 'user')
        const title = firstUserMessage 
          ? (firstUserMessage.content.length > 50 
              ? firstUserMessage.content.substring(0, 47) + '...'
              : firstUserMessage.content)
          : `Chat ${date.toLocaleDateString('da-DK')}`

        // Generate summary from conversation
        const summary = await generateSessionSummary(msgs)
        
        sessionList.push({
          id: `session_${date.getTime()}`,
          title,
          summary,
          tags: extractTagsFromMessages(msgs),
          createdAt: date,
          updatedAt: new Date(Math.max(...msgs.map(m => m.createdAt.getTime()))),
          lastMessageAt: new Date(Math.max(...msgs.map(m => m.createdAt.getTime()))),
          messageCount: msgs.length,
          userId
        })
      }

      setSessions(sessionList.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()))
      
    } catch (error) {
      console.error('Error loading chat sessions:', error)
    }
  }

  const generateSessionSummary = async (messages: ChatMessage[]): Promise<string> => {
    try {
      if (messages.length === 0) return ''
      
      const conversation = messages
        .slice(0, 10) // Limit to first 10 messages for summary
        .map(m => `${m.role}: ${m.content.substring(0, 200)}`)
        .join('\n')

      const { text } = await blink.ai.generateText({
        prompt: `Lav en kort dansk sammenfatning (max 100 ord) af denne FiestaAI samtale:\n\n${conversation}`,
        model: 'gpt-4.1-mini'
      })

      return text.trim()
    } catch (error) {
      console.error('Error generating summary:', error)
      return ''
    }
  }

  const extractTagsFromMessages = (messages: ChatMessage[]): string[] => {
    const tags = new Set<string>()
    
    messages.forEach(msg => {
      if (msg.taskType) {
        tags.add(msg.taskType)
      }
      
      // Extract common keywords as tags
      const content = msg.content.toLowerCase()
      if (content.includes('event') || content.includes('booking')) tags.add('events')
      if (content.includes('menu') || content.includes('mad')) tags.add('menu')
      if (content.includes('social') || content.includes('facebook')) tags.add('social-media')
      if (content.includes('faktura') || content.includes('penge')) tags.add('økonomi')
      if (content.includes('kunde') || content.includes('mail')) tags.add('kundeservice')
    })
    
    return Array.from(tags)
  }

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const sessionDate = new Date(parseInt(sessionId.replace('session_', '')))
      const startOfDay = new Date(sessionDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(sessionDate)
      endOfDay.setHours(23, 59, 59, 999)

      const messages = await blink.db.chatMessages.list({
        where: { 
          userId: user.id,
          createdAt: {
            gte: startOfDay.toISOString(),
            lte: endOfDay.toISOString()
          }
        },
        orderBy: { createdAt: 'asc' }
      })

      setSessionMessages(messages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        mode: msg.mode,
        taskType: msg.taskType,
        createdAt: new Date(msg.createdAt),
        userId: msg.userId
      })))
    } catch (error) {
      console.error('Error loading session messages:', error)
    }
  }

  const filteredSessions = sessions.filter(session => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!session.title.toLowerCase().includes(query) && 
          !session.summary?.toLowerCase().includes(query)) {
        return false
      }
    }

    // Tag filter
    if (selectedTags.length > 0) {
      if (!selectedTags.some(tag => session.tags.includes(tag))) {
        return false
      }
    }

    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
      case 'oldest':
        return a.createdAt.getTime() - b.createdAt.getTime()
      case 'title':
        return a.title.localeCompare(b.title)
      default:
        return 0
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Flame className="h-8 w-8 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground">Indlæser chat historik...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
        {/* Left Panel - Session List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Chat Historik</span>
                <Badge variant="outline">{sessions.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Søg i samtaler..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Sorter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSortBy('recent')}>
                      <Clock className="h-4 w-4 mr-2" />
                      Nyeste først
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('oldest')}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Ældste først
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('title')}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Alfabetisk
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTagManager(true)}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Tags
                </Button>
              </div>

              {/* Tag Filter */}
              {tags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Filter efter tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.slice(0, 8).map(tag => (
                      <Badge
                        key={tag.id}
                        variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedTags(prev => 
                            prev.includes(tag.name)
                              ? prev.filter(t => t !== tag.name)
                              : [...prev, tag.name]
                          )
                        }}
                      >
                        {tag.name} ({tag.usageCount})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session List */}
          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="space-y-3">
              {filteredSessions.map(session => (
                <ChatSessionCard
                  key={session.id}
                  session={session}
                  isSelected={selectedSession?.id === session.id}
                  onClick={() => {
                    setSelectedSession(session)
                    loadSessionMessages(session.id)
                  }}
                />
              ))}
              
              {filteredSessions.length === 0 && (
                <Card className="p-6 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    {searchQuery || selectedTags.length > 0 
                      ? 'Ingen samtaler matcher dine filtre'
                      : 'Ingen chat historik endnu'
                    }
                  </p>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Selected Session */}
        <div className="lg:col-span-2">
          {selectedSession ? (
            <div className="space-y-4 h-full">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Flame className="h-5 w-5 text-primary" />
                        <span>{selectedSession.title}</span>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedSession.createdAt.toLocaleDateString('da-DK', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })} • {selectedSession.messageCount} beskeder
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Archive className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {selectedSession.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedSession.tags.map(tag => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardHeader>
              </Card>

              {/* Conversation Summary */}
              {selectedSession.summary && (
                <ConversationSummary 
                  summary={selectedSession.summary}
                  messages={sessionMessages}
                />
              )}

              {/* Messages */}
              <Card className="flex-1">
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-300px)] p-6">
                    <div className="space-y-6">
                      {sessionMessages.map((message, index) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex items-start space-x-3 max-w-[85%] ${
                            message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                          }`}>
                            {/* Avatar */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                              message.role === 'user' 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gradient-to-br from-primary to-accent text-white'
                            }`}>
                              {message.role === 'user' ? (
                                <User className="h-4 w-4" />
                              ) : (
                                <Flame className="h-4 w-4" />
                              )}
                            </div>

                            {/* Message */}
                            <div className="space-y-1">
                              <Card className={`${
                                message.role === 'user' 
                                  ? 'bg-blue-500 text-white' 
                                  : 'bg-card'
                              }`}>
                                <CardContent className="p-3">
                                  <div className="text-sm whitespace-pre-wrap">
                                    {message.content.split('**').map((part, i) => 
                                      i % 2 === 0 ? part : <strong key={i}>{part}</strong>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                              
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                <span>
                                  {message.createdAt.toLocaleTimeString('da-DK', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                {message.taskType && (
                                  <>
                                    <span>•</span>
                                    <Badge variant="outline" className="text-xs">
                                      {message.taskType}
                                    </Badge>
                                  </>
                                )}
                                {message.mode !== 'auto' && (
                                  <>
                                    <span>•</span>
                                    <Badge variant="outline" className="text-xs">
                                      {message.mode}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center space-y-4">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">Vælg en samtale</h3>
                  <p className="text-muted-foreground">
                    Klik på en samtale i listen for at se beskeder og detaljer
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Tag Manager Modal */}
      {showTagManager && (
        <TagManager
          tags={tags}
          onClose={() => setShowTagManager(false)}
          onTagsUpdated={() => loadHistoryData(user.id)}
        />
      )}
    </div>
  )
}