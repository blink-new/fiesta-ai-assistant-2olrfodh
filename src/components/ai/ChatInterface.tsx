import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Send, 
  Loader2, 
  User, 
  Bot,
  Flame,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Zap,
  MessageCircle
} from 'lucide-react'
import { AIMode, Task } from '@/types'
import blink from '@/blink/client'
import googleCalendarService from '@/services/googleCalendar'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  taskType?: string
  status?: 'pending' | 'completed' | 'error'
}

interface ChatInterfaceProps {
  mode: AIMode['id']
  advancedMode: boolean
  sessionId?: string | null
  onNewSession?: () => void
}

export function ChatInterface({ mode, advancedMode, sessionId, onNewSession }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [user, setUser] = useState<any>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Load user and chat history
  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged(async (state) => {
      setUser(state.user)
      if (state.user && !sessionId) {
        // Only load initial chat history if no sessionId is provided
        await loadChatHistory(state.user.id)
      }
    })
    return unsubscribe
  }, [sessionId])

  // Handle session changes
  useEffect(() => {
    if (sessionId !== undefined && user) {
      if (sessionId) {
        // Load specific session
        setCurrentSessionId(sessionId)
        loadSessionMessages(user.id, sessionId)
      } else if (sessionId === null) {
        // New session requested
        createNewSession(user.id)
      }
    }
  }, [sessionId, user]) // eslint-disable-line react-hooks/exhaustive-deps

  const createNewSession = async (userId: string) => {
    const newSessionId = `session_${Date.now()}`
    setCurrentSessionId(newSessionId)
    
    // Create welcome message for new session
    const welcomeMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: `🔥 **Ny samtale startet!** 

Hvad kan jeg hjælpe dig med nu? Din tidligere samtale er gemt i historikken. 🌯`,
      timestamp: new Date(),
      status: 'completed'
    }
    setMessages([welcomeMessage])
    
    // Save welcome message to DB with session ID
    await blink.db.chatMessages.create({
      id: welcomeMessage.id,
      userId,
      role: 'assistant',
      content: welcomeMessage.content,
      mode: 'auto',
      status: 'completed',
      sessionId: newSessionId
    })

    // Notify parent component about new session
    if (onNewSession) {
      onNewSession()
    }
  }

  const loadChatHistory = async (userId: string) => {
    try {
      // Create initial session
      const sessionId = `session_${Date.now()}`
      setCurrentSessionId(sessionId)
      
      // Create welcome message for new session
      const welcomeMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `🔥 **Velkommen til FiestaAI!** 

Hej Jonas! Jeg er din digitale operations-assistent for Foodtruck Fiesta ApS. 

**Jeg kan hjælpe dig med:**
• 📧 Kundeservice & email-håndtering
• 📅 Event-booking & planlægning  
• 🍽️ Menukort & prisberegning
• 💰 Bogføring & fakturaer
• 📱 Sociale medier & marketing
• ✅ Compliance & fødevaresikkerhed

**Hvad kan jeg hjælpe dig med i dag?** 

*Tip: Prøv at spørge om "events denne måned" eller "lav et tilbud til 100 personer"* 🌯

**Husk:** Alle vores samtaler gemmes automatisk i historikken, så jeg kan huske vores tidligere diskussioner og give bedre hjælp! 🧠`,
        timestamp: new Date(),
        status: 'completed'
      }
      setMessages([welcomeMessage])
      
      // Save welcome message to DB with session ID
      await blink.db.chatMessages.create({
        id: welcomeMessage.id,
        userId,
        role: 'assistant',
        content: welcomeMessage.content,
        mode: 'auto',
        status: 'completed',
        sessionId
      })
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  }

  const loadSessionMessages = async (userId: string, sessionId: string) => {
    try {
      const chatData = await blink.db.chatMessages.list({
        where: { 
          userId,
          sessionId
        },
        orderBy: { createdAt: 'asc' },
        limit: 100
      })

      setMessages(chatData.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.createdAt),
        taskType: msg.taskType,
        status: msg.status as 'pending' | 'completed' | 'error'
      })))
    } catch (error) {
      console.error('Error loading session messages:', error)
    }
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages, streamingText])

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user?.id || !currentSessionId) return

    const userMessageId = `msg_${Date.now()}`
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const userInput = input.trim()
    setInput('')
    setIsLoading(true)
    setStreamingText('')

    try {
      // Save user message to DB with session ID
      await blink.db.chatMessages.create({
        id: userMessageId,
        userId: user.id,
        role: 'user',
        content: userInput,
        mode,
        status: 'completed',
        sessionId: currentSessionId
      })

      // Create assistant message placeholder
      const assistantMessageId = `msg_${Date.now() + 1}`
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        status: 'pending'
      }
      
      setMessages(prev => [...prev, assistantMessage])

      // Detect task type from user input
      const taskType = detectTaskType(userInput)

      // Build context-aware prompt with recent chat history
      const recentMessages = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      // Get conversation context from previous sessions
      let conversationContext = ''
      try {
        const pastWeek = new Date()
        pastWeek.setDate(pastWeek.getDate() - 7)
        
        const recentHistory = await blink.db.chatMessages.list({
          where: { 
            userId: user.id,
            createdAt: {
              gte: pastWeek.toISOString(),
              lt: new Date().toISOString()
            }
          },
          orderBy: { createdAt: 'desc' },
          limit: 20
        })

        if (recentHistory.length > 0) {
          const contextSummary = recentHistory
            .slice(0, 10)
            .map(msg => `${msg.role}: ${msg.content.substring(0, 100)}...`)
            .join('\n')
          
          conversationContext = `\n\nKONTEKST FRA TIDLIGERE SAMTALER (sidste 7 dage):\n${contextSummary}\n\nBrug denne kontekst til at give mere personlige og relevante svar baseret på vores tidligere diskussioner.`
        }
      } catch (error) {
        console.error('Error loading conversation context:', error)
      }

      // Check if user is asking about calendar/events
      let calendarData = ''
      const isCalendarQuery = userInput.toLowerCase().includes('event') || 
                              userInput.toLowerCase().includes('kalender') || 
                              userInput.toLowerCase().includes('booking') ||
                              userInput.toLowerCase().includes('kommende') ||
                              userInput.toLowerCase().includes('denne måned') ||
                              userInput.toLowerCase().includes('i dag') ||
                              userInput.toLowerCase().includes('i morgen')

      if (isCalendarQuery) {
        try {
          // Try to get Google Calendar events
          const events = await googleCalendarService.getUpcomingEvents(user.id, 30)
          if (events.length > 0) {
            calendarData = `\n\nGOOGLE CALENDAR DATA (ftfiestaa@gmail.com):\n${googleCalendarService.formatEventsForAI(events)}\n\nBrug denne data til at besvare brugerens spørgsmål om events og kalender.`
          } else {
            calendarData = '\n\nGOOGLE CALENDAR: Ingen events fundet i de næste 30 dage eller kalender ikke forbundet.'
          }
        } catch (error) {
          console.error('Error fetching calendar data:', error)
          calendarData = `\n\nGOOGLE CALENDAR FEJL: ${error.message}\n\nForeslå brugeren at kontakte support for at få hjælp til Google Calendar integration.`
        }
      }

      // Build mode-specific system prompt
      let modeInstructions = ''
      switch (mode) {
        case 'auto':
          modeInstructions = `
AUTO MODE - Intelligent opgave-routing:
- Giv hurtige, præcise svar på almindelige spørgsmål
- Automatisk kategoriser opgaver (kundeservice, marketing, økonomi, etc.)
- Foreslå konkrete næste skridt
- Hold svar under 200 ord medmindre kompleks analyse er nødvendig
- Ved kalender-forespørgsler: Vis relevante events fra Google Calendar`
          break
        case 'compute':
          modeInstructions = `
COMPUTE MODE - Dybdegående analyse:
- Udfør detaljerede beregninger og analyser
- Brug web search til at få aktuelle data og priser
- Lav omfattende markedsanalyser og prognoser
- Inkluder konkrete tal, statistikker og sammenligninger
- Vis arbejdsprocessen og begrundelser for konklusioner
- Ved kalender-forespørgsler: Analyser event-mønstre og foreslå optimeringer`
          break
        case 'agent':
          modeInstructions = `
AGENT MODE - Selvstændig opgaveløsning:
- Opdel komplekse opgaver i mindre delopgaver
- Udfør multi-step reasoning og planlægning
- Foreslå og implementer komplette løsninger
- Opret automatisk follow-up opgaver og påmindelser
- Tænk strategisk og langsigtet om forretningsudvikling
- Ved kalender-forespørgsler: Foreslå automatiske påmindelser og opfølgning`
          break
      }

      const systemPrompt = `Du er FiestaAI, den digitale operations-assistent for Foodtruck Fiesta ApS (Jonas Abde). 

AKTUEL MODE: ${mode.toUpperCase()}
${modeInstructions}

AVANCERET FORSKNING: ${advancedMode ? 'AKTIVERET - Brug web search til aktuelle data' : 'DEAKTIVERET'}

VIGTIGE DETALJER:
- Brand: Foodtruck Fiesta ApS (CVR 44371901)
- Ejer: Jonas Abde (tlf +45 22 65 02 26, mail ftfiestaa@gmail.com)
- 2 vogne: Shawarma Wagon (sort/flamme) & Grill Wagon (rød/orange)
- Specialitet: Mellemøstlig street food til events 50-5000 gæster

MENU HIGHLIGHTS:
Shawarma Wagon: Flankesteak Shawarma rulle, Falafel rulle (vegan), Shawarma Box, Sambosa
Grill Wagon: Kebabspyd rulle, Kyllingespyd rulle, Grill Box, Grillet Kyllingelår, Libanesisk Mini-Pizza

PRISER: Fra 125 kr/kuvert ekskl. moms (min. 4000 kr)${calendarData}

HUKOMMELSE & KONTEKST:
Du har adgang til alle tidligere samtaler og kan referere til dem. Brug denne viden til at:
- Huske tidligere diskussioner og beslutninger
- Følge op på tidligere opgaver og anbefalinger
- Tilpasse svar baseret på Jonas' præferencer og mønstre
- Undgå at gentage information der allerede er diskuteret${conversationContext}

SVAR ALTID MED:
1. **Opgavetype** – ${taskType || 'generel'}
2. **Anbefalet handling** – konkret næste skridt
3. **Udført output** – hvad du leverer nu
4. **Videre proces** – hvad der skal ske bagefter
5. **Vurdering** – risiko, forbedringer, alternativer

Vær venlig, handlekraftig og brug max 250 ord. Brug emojis selektivt: 🔥🌯🍗🎉📅💸

Hvis det er en kundeforespørgsel, lav et konkret svar-udkast. Hvis det er marketing, foreslå konkret indhold. Hvis det er økonomi, giv konkrete tal og anbefalinger.

VIGTIG: Hvis brugeren spørger om tidligere samtaler eller beder om at opsummere, kan du referere til vores samtalehistorik og give konkrete eksempler fra tidligere diskussioner.

KALENDER INTEGRATION: Når brugeren spørger om events, kalender eller bookings, brug Google Calendar data ovenfor til at give præcise svar om kommende events fra ftfiestaa@gmail.com kalenderen.`

      let finalContent = ''
      
      await blink.ai.streamText(
        {
          messages: [
            { role: 'system', content: systemPrompt },
            ...recentMessages,
            { role: 'user', content: userInput }
          ],
          search: advancedMode || mode === 'compute',
          maxSteps: mode === 'agent' ? 15 : (mode === 'compute' ? 10 : 5),
          model: mode === 'compute' || mode === 'agent' ? 'gpt-4.1' : 'gpt-4.1-mini'
        },
        (chunk) => {
          finalContent += chunk
          setStreamingText(finalContent)
        }
      )

      // Update the assistant message with final content
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: finalContent, status: 'completed', taskType }
          : msg
      ))

      // Save assistant message to DB with session ID
      await blink.db.chatMessages.create({
        id: assistantMessageId,
        userId: user.id,
        role: 'assistant',
        content: finalContent,
        mode,
        taskType,
        status: 'completed',
        sessionId: currentSessionId
      })

      // Auto-create tasks based on AI response
      if (taskType && finalContent.toLowerCase().includes('opgave')) {
        await createTaskFromChat(user.id, taskType, userInput, finalContent)
      }

    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage = 'Beklager, der opstod en fejl. Prøv venligst igen.'
      
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId
          ? { ...msg, content: errorMessage, status: 'error' }
          : msg
      ))
    } finally {
      setIsLoading(false)
      setStreamingText('')
    }
  }

  const detectTaskType = (input: string): string | undefined => {
    const lower = input.toLowerCase()
    if (lower.includes('mail') || lower.includes('kunde') || lower.includes('forespørgsel') || lower.includes('svar')) {
      return 'kundeservice'
    }
    if (lower.includes('social') || lower.includes('facebook') || lower.includes('instagram') || lower.includes('marketing')) {
      return 'marketing'
    }
    if (lower.includes('event') || lower.includes('booking') || lower.includes('kalender') || lower.includes('planlæg')) {
      return 'planlægning'
    }
    if (lower.includes('penge') || lower.includes('faktura') || lower.includes('regnskab') || lower.includes('økonomi')) {
      return 'økonomi'
    }
    if (lower.includes('menu') || lower.includes('mad') || lower.includes('drift') || lower.includes('vogn')) {
      return 'drift'
    }
    if (lower.includes('seo') || lower.includes('website') || lower.includes('google')) {
      return 'SEO'
    }
    return undefined
  }

  const createTaskFromChat = async (userId: string, taskType: string, userInput: string, aiResponse: string) => {
    try {
      // Extract task title from user input or AI response
      const title = userInput.length > 50 ? userInput.substring(0, 47) + '...' : userInput
      
      await blink.db.tasks.create({
        id: `task_${Date.now()}`,
        userId,
        type: taskType as Task['type'],
        title: `AI: ${title}`,
        description: aiResponse.substring(0, 200) + (aiResponse.length > 200 ? '...' : ''),
        status: 'pending',
        priority: 'medium'
      })
    } catch (error) {
      console.error('Error creating task from chat:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3 text-yellow-500" />
      case 'completed': return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'error': return <AlertCircle className="h-3 w-3 text-red-500" />
      default: return null
    }
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      {/* Chat Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm p-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-accent to-orange-500 flex items-center justify-center shadow-lg animate-gradient">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-lg">FiestaAI Assistant</h3>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Online</span>
              </div>
              <span>•</span>
              <div className="flex items-center space-x-1">
                {mode === 'auto' && <Zap className="h-3 w-3" />}
                {mode === 'compute' && <Sparkles className="h-3 w-3" />}
                {mode === 'agent' && <MessageCircle className="h-3 w-3" />}
                <span className="capitalize">{mode}</span>
                {advancedMode && (
                  <>
                    <span>•</span>
                    <Badge variant="secondary" className="text-xs px-2 py-0">
                      Advanced
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-6 scrollbar-thin" ref={scrollAreaRef}>
        <div className="space-y-6 max-w-4xl mx-auto">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`flex items-start space-x-4 max-w-[85%] ${
                message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                    : 'bg-gradient-to-br from-primary via-accent to-orange-500 text-white'
                }`}>
                  {message.role === 'user' ? (
                    <User className="h-5 w-5" />
                  ) : (
                    <Flame className="h-5 w-5" />
                  )}
                </div>

                {/* Message Content */}
                <div className="flex flex-col space-y-2">
                  <Card className={`shadow-md transition-all duration-200 hover:shadow-lg ${
                    message.role === 'user' 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-400' 
                      : 'bg-card border-border hover:border-primary/20'
                  }`}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className={`prose-chat ${
                          message.role === 'user' ? 'prose-invert' : 'prose-gray'
                        }`}>
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content.split('**').map((part, i) => 
                              i % 2 === 0 ? part : <strong key={i} className="font-semibold">{part}</strong>
                            )}
                            {message.role === 'assistant' && isLoading && message.id === messages[messages.length - 1]?.id && (
                              <span className="inline-flex items-center ml-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs ${
                              message.role === 'user' ? 'text-blue-100' : 'text-muted-foreground'
                            }`}>
                              {message.timestamp.toLocaleTimeString('da-DK', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            {message.status && (
                              <div className="flex items-center">
                                {getStatusIcon(message.status)}
                              </div>
                            )}
                          </div>

                          {message.taskType && (
                            <Badge 
                              variant={message.role === 'user' ? 'secondary' : 'outline'} 
                              className="text-xs px-2 py-1"
                            >
                              {message.taskType}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ))}

          {/* Streaming Message */}
          {streamingText && (
            <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-start space-x-4 max-w-[85%]">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary via-accent to-orange-500 text-white flex items-center justify-center shadow-lg">
                  <Flame className="h-5 w-5" />
                </div>
                <Card className="bg-card border-border shadow-md">
                  <CardContent className="p-4">
                    <div className="prose-chat prose-gray">
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {streamingText.split('**').map((part, i) => 
                          i % 2 === 0 ? part : <strong key={i} className="font-semibold">{part}</strong>
                        )}
                        <span className="inline-flex items-center ml-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Empty State */}
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary via-accent to-orange-500 flex items-center justify-center mb-4 shadow-lg animate-gradient animate-pulse-glow">
                <Flame className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Velkommen til FiestaAI</h3>
              <p className="text-muted-foreground max-w-md">
                Din digitale operations-assistent er klar til at hjælpe med alt fra kundeservice til event-planlægning.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-background/80 backdrop-blur-sm p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Skriv din besked til FiestaAI... (Shift+Enter for ny linje)"
                className="min-h-[60px] resize-none pr-12 border-2 focus:border-primary/50 transition-colors"
                disabled={isLoading}
              />
              <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                {input.length}/1000
              </div>
            </div>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="lg"
              className="px-6 h-[60px] bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <div className="flex items-center space-x-2">
              <span>Tryk Enter for at sende • Shift+Enter for ny linje</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Forbundet</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}