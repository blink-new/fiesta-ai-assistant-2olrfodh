import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  MessageSquare,
  Clock,
  Target,
  TrendingUp
} from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import blink from '@/blink/client'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  mode: string
  taskType?: string
  createdAt: Date
  userId: string
}

interface ConversationSummaryProps {
  summary: string
  messages: ChatMessage[]
}

interface ReasoningStep {
  step: number
  title: string
  description: string
  outcome: string
}

export function ConversationSummary({ summary, messages }: ConversationSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [reasoning, setReasoning] = useState<ReasoningStep[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [enhancedSummary, setEnhancedSummary] = useState('')

  const analyzeConversation = async () => {
    setIsAnalyzing(true)
    try {
      const conversation = messages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n\n')

      // Generate enhanced summary with reasoning
      const { text } = await blink.ai.generateText({
        prompt: `Analyser denne FiestaAI samtale og lav en detaljeret analyse:

SAMTALE:
${conversation}

Lav en struktureret analyse med:

1. **HOVEDFORMÅL**: Hvad var brugerens primære mål?
2. **NØGLEEMNER**: Hvilke hovedemner blev diskuteret?
3. **AI HANDLINGER**: Hvilke konkrete handlinger tog FiestaAI?
4. **RESULTATER**: Hvad blev opnået i samtalen?
5. **OPFØLGNING**: Hvad skal der følges op på?

Skriv på dansk og vær konkret og handlingsorienteret.`,
        model: 'gpt-4.1',
        search: true
      })

      setEnhancedSummary(text)

      // Generate reasoning steps
      const { text: reasoningText } = await blink.ai.generateText({
        prompt: `Baseret på denne FiestaAI samtale, beskriv AI'ens tankeproces i 4-6 trin:

SAMTALE:
${conversation}

Format som JSON array med objekter der har:
- step: nummer
- title: kort titel på trin
- description: hvad AI tænkte/analyserede
- outcome: hvad det førte til

Fokuser på hvordan AI'en:
1. Forstod brugerens behov
2. Analyserede situationen
3. Valgte den bedste tilgang
4. Udførte handlingen
5. Evaluerede resultatet

Svar kun med valid JSON array.`,
        model: 'gpt-4.1-mini'
      })

      try {
        const parsedReasoning = JSON.parse(reasoningText)
        setReasoning(Array.isArray(parsedReasoning) ? parsedReasoning : [])
      } catch (error) {
        console.error('Error parsing reasoning:', error)
        setReasoning([])
      }

    } catch (error) {
      console.error('Error analyzing conversation:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getTaskTypeStats = () => {
    const taskTypes = messages
      .filter(m => m.taskType)
      .reduce((acc, m) => {
        acc[m.taskType!] = (acc[m.taskType!] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    return Object.entries(taskTypes).map(([type, count]) => ({ type, count }))
  }

  const getModeStats = () => {
    const modes = messages
      .filter(m => m.role === 'assistant')
      .reduce((acc, m) => {
        acc[m.mode] = (acc[m.mode] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    return Object.entries(modes).map(([mode, count]) => ({ mode, count }))
  }

  const taskStats = getTaskTypeStats()
  const modeStats = getModeStats()
  const duration = messages.length > 0 
    ? Math.round((messages[messages.length - 1].createdAt.getTime() - messages[0].createdAt.getTime()) / (1000 * 60))
    : 0

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-primary/5 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-primary" />
                <span>Samtale Analyse</span>
                <Badge variant="outline" className="bg-white/50">
                  AI Reasoning
                </Badge>
              </CardTitle>
              <Button variant="ghost" size="sm">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{messages.length}</div>
                <div className="text-sm text-muted-foreground">Beskeder</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{duration}</div>
                <div className="text-sm text-muted-foreground">Minutter</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{taskStats.length}</div>
                <div className="text-sm text-muted-foreground">Opgavetyper</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{modeStats.length}</div>
                <div className="text-sm text-muted-foreground">AI Modes</div>
              </div>
            </div>

            {/* Basic Summary */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span>Hurtig Oversigt</span>
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed bg-white/50 p-3 rounded-lg">
                {summary}
              </p>
            </div>

            {/* Task Types & Modes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {taskStats.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Opgavetyper</h4>
                  <div className="flex flex-wrap gap-2">
                    {taskStats.map(({ type, count }) => (
                      <Badge key={type} variant="secondary">
                        {type} ({count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {modeStats.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">AI Modes</h4>
                  <div className="flex flex-wrap gap-2">
                    {modeStats.map(({ mode, count }) => (
                      <Badge key={mode} variant="outline">
                        {mode} ({count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Analysis */}
            {!enhancedSummary && !isAnalyzing && (
              <div className="text-center py-4">
                <Button 
                  onClick={analyzeConversation}
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyser Samtale Dybere
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Få detaljeret AI reasoning og forbedrede indsigter
                </p>
              </div>
            )}

            {isAnalyzing && (
              <div className="text-center py-6">
                <div className="inline-flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-primary animate-pulse" />
                  <span className="text-sm">FiestaAI analyserer samtalen...</span>
                </div>
              </div>
            )}

            {/* Enhanced Summary */}
            {enhancedSummary && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center space-x-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span>Detaljeret Analyse</span>
                </h4>
                <div className="bg-white/70 p-4 rounded-lg border">
                  <div className="prose prose-sm max-w-none">
                    {enhancedSummary.split('\n').map((line, i) => {
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return (
                          <h5 key={i} className="font-semibold text-primary mt-3 mb-1">
                            {line.replace(/\*\*/g, '')}
                          </h5>
                        )
                      }
                      return line.trim() ? (
                        <p key={i} className="text-sm mb-2">{line}</p>
                      ) : null
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* AI Reasoning Steps */}
            {reasoning.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  <span>AI Tankeproces</span>
                </h4>
                <div className="space-y-3">
                  {reasoning.map((step, index) => (
                    <div key={index} className="flex space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center text-sm font-medium">
                          {step.step}
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <h5 className="font-medium text-sm">{step.title}</h5>
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                        <div className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                          <strong>Resultat:</strong> {step.outcome}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Tidslinje</span>
              </h4>
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Start: {messages[0]?.createdAt.toLocaleString('da-DK')}</span>
                  <span>Slut: {messages[messages.length - 1]?.createdAt.toLocaleString('da-DK')}</span>
                </div>
                <div className="mt-1 text-xs">
                  Varighed: {duration} minutter • Gennemsnit: {Math.round(duration / Math.max(messages.length - 1, 1))} min/besked
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}