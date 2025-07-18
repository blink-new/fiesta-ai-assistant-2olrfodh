import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Mail, 
  Send, 
  Inbox, 
  Archive,
  Star,
  Reply,
  Forward,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  Paperclip,
  Search,
  Filter,
  RefreshCw,
  Settings,
  Plus
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import blink from '@/blink/client'

interface EmailMessage {
  id: string
  userId: string
  from: string
  to: string
  subject: string
  content: string
  htmlContent?: string
  status: 'unread' | 'read' | 'replied' | 'archived'
  priority: 'low' | 'medium' | 'high'
  category: 'kundeservice' | 'booking' | 'marketing' | 'økonomi' | 'general'
  attachments?: string[]
  aiSuggestion?: string
  createdAt: Date
  updatedAt: Date
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
  category: string
  variables: string[]
}

export function EmailIntegration() {
  const [emails, setEmails] = useState<EmailMessage[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all')
  const [user, setUser] = useState<any>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    content: '',
    template: ''
  })
  const { toast } = useToast()

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged(async (state) => {
      setUser(state.user)
      if (state.user) {
        await loadEmails(state.user.id)
        await loadTemplates(state.user.id)
      }
      setLoading(false)
    })
    return unsubscribe
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadEmails = async (userId: string) => {
    try {
      const emailData = await blink.db.emails.list({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        limit: 100
      })

      setEmails(emailData.map(email => ({
        id: email.id,
        userId: email.userId,
        from: email.from,
        to: email.to,
        subject: email.subject,
        content: email.content,
        htmlContent: email.htmlContent,
        status: email.status as EmailMessage['status'],
        priority: email.priority as EmailMessage['priority'],
        category: email.category as EmailMessage['category'],
        attachments: email.attachments ? email.attachments.split(',') : undefined,
        aiSuggestion: email.aiSuggestion,
        createdAt: new Date(email.createdAt),
        updatedAt: new Date(email.updatedAt)
      })))

      // Create sample emails if none exist
      if (emailData.length === 0) {
        await createSampleEmails(userId)
        setTimeout(() => loadEmails(userId), 1000)
      }
    } catch (error) {
      console.error('Error loading emails:', error)
    }
  }

  const loadTemplates = async (userId: string) => {
    try {
      const templateData = await blink.db.emailTemplates.list({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        limit: 50
      })

      setTemplates(templateData.map(template => ({
        id: template.id,
        name: template.name,
        subject: template.subject,
        content: template.content,
        category: template.category,
        variables: template.variables ? template.variables.split(',') : []
      })))

      // Create sample templates if none exist
      if (templateData.length === 0) {
        await createSampleTemplates(userId)
        setTimeout(() => loadTemplates(userId), 1000)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const createSampleEmails = async (userId: string) => {
    try {
      await blink.db.emails.createMany([
        {
          id: `email_${Date.now()}_1`,
          userId,
          from: 'info@ellevangskolen.dk',
          to: 'ftfiestaa@gmail.com',
          subject: 'Forespørgsel om catering til skolefestival',
          content: 'Hej Jonas,\n\nVi planlægger vores årlige skolefestival den 16. maj og vil gerne høre om I kan levere mad til ca. 200 personer.\n\nVi tænker på mellemøstlig mad, da det er meget populært blandt eleverne.\n\nKan I sende et tilbud?\n\nVenlig hilsen,\nAnne Larsen\nEllevangskolen',
          status: 'unread',
          priority: 'high',
          category: 'booking',
          aiSuggestion: 'Foreslå svar med menu for 200 personer, pris og praktiske detaljer om strøm og placering.'
        },
        {
          id: `email_${Date.now()}_2`,
          userId,
          from: 'events@aarhushavn.dk',
          to: 'ftfiestaa@gmail.com',
          subject: 'Kapsejladsen 2025 - Foodtruck deltagelse',
          content: 'Kære Jonas,\n\nTak for jeres deltagelse i Kapsejladsen 2024! Vi vil gerne invitere jer til at deltage igen i 2025.\n\nEventet finder sted 1. maj ved Aarhus Havn med forventet 500+ gæster.\n\nEr I interesserede?\n\nBedste hilsner,\nLars Nielsen\nAarhus Havn',
          status: 'read',
          priority: 'medium',
          category: 'booking',
          aiSuggestion: 'Bekræft interesse og spørg om praktiske detaljer som placering, strøm og setup-tid.'
        },
        {
          id: `email_${Date.now()}_3`,
          userId,
          from: 'marketing@facebook.com',
          to: 'ftfiestaa@gmail.com',
          subject: 'Boost your food truck business with Facebook Ads',
          content: 'Hi there,\n\nWe noticed your food truck business and wanted to share some marketing opportunities...',
          status: 'read',
          priority: 'low',
          category: 'marketing',
          aiSuggestion: 'Vurder om Facebook Ads kan være relevant for at nå flere kunder til events.'
        }
      ])
    } catch (error) {
      console.error('Error creating sample emails:', error)
    }
  }

  const createSampleTemplates = async (userId: string) => {
    try {
      await blink.db.emailTemplates.createMany([
        {
          id: `template_${Date.now()}_1`,
          userId,
          name: 'Inbound Event Forespørgsel',
          subject: 'Re: {{subject}} - Tilbud fra Foodtruck Fiesta',
          content: `Hej {{navn}},

Tak for din forespørgsel om catering til {{event}}.

Vi glæder os til at høre mere om jeres arrangement:
• Dato: {{dato}}
• Antal gæster: {{antal}}
• Lokation: {{lokation}}
• Ønsket serveringstid: {{tid}}

Har I adgang til strøm (32A 400V CEE eller 2×16A)?

Jeg vedhæfter vores menukort for begge vogne. Prisen starter fra 125 kr/kuvert ekskl. moms (minimum 4.000 kr).

Svar gerne i dag, så holder vi datoen for jer! 🔥

Med venlig hilsen,
Jonas Abde
Foodtruck Fiesta ApS
Tlf: +45 22 65 02 26
CVR: 44371901`,
          category: 'booking',
          variables: 'navn,subject,event,dato,antal,lokation,tid'
        },
        {
          id: `template_${Date.now()}_2`,
          userId,
          name: 'Tilbud Bekræftelse',
          subject: 'Tilbud #{{tilbudsnr}} - Foodtruck Fiesta til {{event}}',
          content: `Hej {{navn}},

Hermed vores tilbud til {{event}}:

📅 Dato: {{dato}}
📍 Lokation: {{lokation}}
👥 Antal gæster: {{antal}}
🍽️ Menu: {{menu}}
💰 Pris: {{pris}} kr ekskl. moms

Tilbuddet er gældende i 14 dage.

Betalingsbetingelser: {{betalingsbetingelser}}

Vi glæder os til at høre fra jer!

Med venlig hilsen,
Jonas Abde
Foodtruck Fiesta ApS`,
          category: 'booking',
          variables: 'navn,tilbudsnr,event,dato,lokation,antal,menu,pris,betalingsbetingelser'
        },
        {
          id: `template_${Date.now()}_3`,
          userId,
          name: 'Event Påmindelse 48 timer',
          subject: '🔥 Påmindelse: {{event}} i morgen!',
          content: `Hej {{navn}},

Vi glæder os til at se jer i morgen til {{event}}!

📋 Event detaljer:
• Dato: {{dato}}
• Tid: {{tid}}
• Lokation: {{lokation}}
• Antal gæster: {{antal}}

Vi ankommer {{ankomsttid}} for setup.

Har I spørgsmål, så ring på +45 22 65 02 26.

Vi ses i morgen! 🌯

Venlig hilsen,
Jonas & Foodtruck Fiesta teamet`,
          category: 'kundeservice',
          variables: 'navn,event,dato,tid,lokation,antal,ankomsttid'
        }
      ])
    } catch (error) {
      console.error('Error creating sample templates:', error)
    }
  }

  const generateAIResponse = async (email: EmailMessage) => {
    if (!user?.id) return

    try {
      // Get knowledge base context
      const knowledgeFiles = await blink.db.knowledgeBase.list({
        where: { userId: user.id },
        limit: 10
      })

      const knowledgeContext = knowledgeFiles
        .map(file => `${file.filename}: ${file.summary || file.content?.substring(0, 200)}`)
        .join('\n')

      const { text } = await blink.ai.generateText({
        prompt: `Du er FiestaAI og skal hjælpe Jonas med at svare på denne email.

EMAIL FRA: ${email.from}
EMNE: ${email.subject}
INDHOLD: ${email.content}

KATEGORI: ${email.category}

KNOWLEDGE BASE KONTEKST:
${knowledgeContext}

VIRKSOMHEDSINFO:
- Foodtruck Fiesta ApS (CVR 44371901)
- Jonas Abde (tlf +45 22 65 02 26)
- 2 vogne: Shawarma Wagon & Grill Wagon
- Priser fra 125 kr/kuvert ekskl. moms (min. 4000 kr)
- Specialitet: Mellemøstlig street food til events 50-5000 gæster

Lav et professionelt svar på dansk der:
1. Takker for henvendelsen
2. Besvarer deres spørgsmål
3. Spørger om nødvendige detaljer (dato, antal, lokation, strøm)
4. Inkluderer relevant information fra knowledge base
5. Har en klar call-to-action
6. Maksimum 200 ord

Brug venlig tone og inkluder relevante emojis (🔥🌯🍗).`,
        model: 'gpt-4.1-mini'
      })

      // Update email with AI suggestion
      await blink.db.emails.update(email.id, {
        aiSuggestion: text.trim()
      })

      setEmails(prev => prev.map(e => 
        e.id === email.id 
          ? { ...e, aiSuggestion: text.trim() }
          : e
      ))

      toast({
        title: "AI svar genereret",
        description: "Et forslag til svar er nu tilgængeligt",
      })

    } catch (error) {
      console.error('Error generating AI response:', error)
      toast({
        title: "Fejl",
        description: "Kunne ikke generere AI svar",
        variant: "destructive"
      })
    }
  }

  const sendEmail = async (emailData: {
    to: string
    subject: string
    content: string
    replyToId?: string
  }) => {
    if (!user?.id) return

    setSending(true)
    try {
      // Send email using Blink notifications
      const result = await blink.notifications.email({
        to: emailData.to,
        from: 'ftfiestaa@gmail.com',
        subject: emailData.subject,
        html: emailData.content.replace(/\n/g, '<br>'),
        text: emailData.content
      })

      if (result.success) {
        // Save sent email to database
        await blink.db.emails.create({
          id: `email_${Date.now()}`,
          userId: user.id,
          from: 'ftfiestaa@gmail.com',
          to: emailData.to,
          subject: emailData.subject,
          content: emailData.content,
          status: 'read',
          priority: 'medium',
          category: 'kundeservice',
          replyToId: emailData.replyToId
        })

        // Update original email status if it's a reply
        if (emailData.replyToId) {
          await blink.db.emails.update(emailData.replyToId, {
            status: 'replied'
          })
          
          setEmails(prev => prev.map(e => 
            e.id === emailData.replyToId 
              ? { ...e, status: 'replied' as const }
              : e
          ))
        }

        toast({
          title: "Email sendt",
          description: `Email sendt til ${emailData.to}`,
        })

        setShowCompose(false)
        setComposeData({ to: '', subject: '', content: '', template: '' })
        
        // Reload emails
        await loadEmails(user.id)
      } else {
        throw new Error('Email sending failed')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      toast({
        title: "Fejl",
        description: "Kunne ikke sende email",
        variant: "destructive"
      })
    } finally {
      setSending(false)
    }
  }

  const markAsRead = async (emailId: string) => {
    try {
      await blink.db.emails.update(emailId, { status: 'read' })
      setEmails(prev => prev.map(e => 
        e.id === emailId 
          ? { ...e, status: 'read' as const }
          : e
      ))
    } catch (error) {
      console.error('Error marking email as read:', error)
    }
  }

  const archiveEmail = async (emailId: string) => {
    try {
      await blink.db.emails.update(emailId, { status: 'archived' })
      setEmails(prev => prev.map(e => 
        e.id === emailId 
          ? { ...e, status: 'archived' as const }
          : e
      ))
      
      toast({
        title: "Email arkiveret",
        description: "Email er flyttet til arkiv",
      })
    } catch (error) {
      console.error('Error archiving email:', error)
    }
  }

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setComposeData(prev => ({
        ...prev,
        subject: template.subject,
        content: template.content,
        template: templateId
      }))
    }
  }

  const filteredEmails = emails.filter(email => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!email.subject.toLowerCase().includes(query) && 
          !email.content.toLowerCase().includes(query) &&
          !email.from.toLowerCase().includes(query)) {
        return false
      }
    }

    if (statusFilter !== 'all' && email.status !== statusFilter) {
      return false
    }

    if (categoryFilter !== 'all' && email.category !== categoryFilter) {
      return false
    }

    return true
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unread': return <Mail className="h-4 w-4 text-blue-500" />
      case 'read': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'replied': return <Reply className="h-4 w-4 text-purple-500" />
      case 'archived': return <Archive className="h-4 w-4 text-gray-500" />
      default: return <Mail className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500'
      case 'medium': return 'text-yellow-500'
      case 'low': return 'text-green-500'
      default: return 'text-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Mail className="h-8 w-8 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground">Indlæser emails...</p>
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
              <Mail className="h-8 w-8 text-primary" />
              <span>Email Integration</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Administrer kundeservice emails med AI-assisteret svar
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowCompose(true)}
              className="bg-gradient-to-r from-primary to-accent"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ny Email
            </Button>
            <Button variant="outline" onClick={() => user && loadEmails(user.id)}>
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
                <Inbox className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{emails.filter(e => e.status === 'unread').length}</p>
                  <p className="text-xs text-muted-foreground">Ulæste</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{emails.filter(e => e.priority === 'high').length}</p>
                  <p className="text-xs text-muted-foreground">Høj prioritet</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{emails.filter(e => e.category === 'booking').length}</p>
                  <p className="text-xs text-muted-foreground">Bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{emails.filter(e => e.status === 'replied').length}</p>
                  <p className="text-xs text-muted-foreground">Besvaret</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Søg i emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle status</SelectItem>
                  <SelectItem value="unread">Ulæste</SelectItem>
                  <SelectItem value="read">Læste</SelectItem>
                  <SelectItem value="replied">Besvaret</SelectItem>
                  <SelectItem value="archived">Arkiveret</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle kategorier</SelectItem>
                  <SelectItem value="booking">Booking</SelectItem>
                  <SelectItem value="kundeservice">Kundeservice</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="økonomi">Økonomi</SelectItem>
                  <SelectItem value="general">Generelt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Email List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Email List */}
          <Card>
            <CardHeader>
              <CardTitle>Emails ({filteredEmails.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {filteredEmails.map((email) => (
                    <Card 
                      key={email.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedEmail?.id === email.id ? 'ring-2 ring-primary' : ''
                      } ${email.status === 'unread' ? 'bg-blue-50/50' : ''}`}
                      onClick={() => {
                        setSelectedEmail(email)
                        if (email.status === 'unread') {
                          markAsRead(email.id)
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(email.status)}
                              <Badge variant="outline" className={getPriorityColor(email.priority)}>
                                {email.priority}
                              </Badge>
                              <Badge variant="secondary">
                                {email.category}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {email.createdAt.toLocaleDateString('da-DK')}
                            </span>
                          </div>
                          
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm font-medium">{email.from}</span>
                            </div>
                            <h3 className={`font-medium text-sm mb-2 ${
                              email.status === 'unread' ? 'font-bold' : ''
                            }`}>
                              {email.subject}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {email.content}
                            </p>
                          </div>

                          {email.aiSuggestion && (
                            <div className="flex items-center space-x-1 text-xs text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              <span>AI svar klar</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Email Detail */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedEmail ? 'Email Detaljer' : 'Vælg en email'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEmail ? (
                <div className="space-y-4">
                  {/* Email Header */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(selectedEmail.status)}
                        <Badge variant="outline" className={getPriorityColor(selectedEmail.priority)}>
                          {selectedEmail.priority}
                        </Badge>
                        <Badge variant="secondary">
                          {selectedEmail.category}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateAIResponse(selectedEmail)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          AI Svar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => archiveEmail(selectedEmail.id)}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-medium">Fra:</span>
                        <span>{selectedEmail.from}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-medium">Til:</span>
                        <span>{selectedEmail.to}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-medium">Emne:</span>
                        <span>{selectedEmail.subject}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{selectedEmail.createdAt.toLocaleString('da-DK')}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Email Content */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Besked:</h4>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{selectedEmail.content}</p>
                      </div>
                    </div>

                    {/* AI Suggestion */}
                    {selectedEmail.aiSuggestion && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center space-x-2">
                          <Settings className="h-4 w-4 text-green-500" />
                          <span>AI Forslag til Svar:</span>
                        </h4>
                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">{selectedEmail.aiSuggestion}</p>
                          <div className="flex items-center space-x-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => {
                                setComposeData({
                                  to: selectedEmail.from,
                                  subject: `Re: ${selectedEmail.subject}`,
                                  content: selectedEmail.aiSuggestion || '',
                                  template: ''
                                })
                                setShowCompose(true)
                              }}
                            >
                              <Reply className="h-4 w-4 mr-1" />
                              Brug Svar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateAIResponse(selectedEmail)}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Generer Nyt
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => {
                          setComposeData({
                            to: selectedEmail.from,
                            subject: `Re: ${selectedEmail.subject}`,
                            content: selectedEmail.aiSuggestion || '',
                            template: ''
                          })
                          setShowCompose(true)
                        }}
                      >
                        <Reply className="h-4 w-4 mr-2" />
                        Svar
                      </Button>
                      <Button variant="outline">
                        <Forward className="h-4 w-4 mr-2" />
                        Videresend
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Vælg en email for at se detaljer</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Compose Dialog */}
        <Dialog open={showCompose} onOpenChange={setShowCompose}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ny Email</DialogTitle>
              <DialogDescription>
                Skriv en ny email eller brug en skabelon
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Til:</label>
                  <Input
                    value={composeData.to}
                    onChange={(e) => setComposeData(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="kunde@example.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Skabelon:</label>
                  <Select value={composeData.template} onValueChange={applyTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vælg skabelon" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Emne:</label>
                <Input
                  value={composeData.subject}
                  onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Email emne"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Besked:</label>
                <Textarea
                  value={composeData.content}
                  onChange={(e) => setComposeData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Skriv din besked her..."
                  rows={10}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCompose(false)}>
                Annuller
              </Button>
              <Button
                onClick={() => sendEmail({
                  to: composeData.to,
                  subject: composeData.subject,
                  content: composeData.content,
                  replyToId: selectedEmail?.id
                })}
                disabled={!composeData.to || !composeData.subject || !composeData.content || sending}
              >
                {sending ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Sender...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Send className="h-4 w-4" />
                    <span>Send Email</span>
                  </div>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}