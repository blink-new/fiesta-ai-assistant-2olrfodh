import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, 
  Download, 
  Send, 
  Calculator,
  Calendar,
  MapPin,
  Users,
  Truck
} from 'lucide-react'
import blink from '@/blink/client'

interface QuoteData {
  customerName: string
  customerEmail: string
  customerPhone: string
  eventTitle: string
  eventDate: string
  location: string
  guests: number
  wagon: 'shawarma' | 'grill' | 'both'
  menu: string[]
  pricePerGuest: number
  totalAmount: number
  notes: string
}

export function QuoteGenerator() {
  const [quoteData, setQuoteData] = useState<QuoteData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    eventTitle: '',
    eventDate: '',
    location: '',
    guests: 50,
    wagon: 'shawarma',
    menu: [],
    pricePerGuest: 125,
    totalAmount: 6250,
    notes: ''
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedQuote, setGeneratedQuote] = useState<string>('')

  const menuOptions = {
    shawarma: [
      'Rulle m. Flankesteak Shawarma',
      'Rulle m. Falafel (vegan)',
      'Shawarma Box',
      'Falafel Box',
      'Sambosa',
      'Pommes Frites'
    ],
    grill: [
      'Rulle m. Kebabspyd',
      'Rulle m. Kyllingespyd',
      'Grill Box',
      'Grillet Kyllingelår',
      'Libanesisk Mini-Pizza',
      'Nachos'
    ]
  }

  const handleInputChange = (field: keyof QuoteData, value: any) => {
    setQuoteData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-calculate total when guests or price changes
      if (field === 'guests' || field === 'pricePerGuest') {
        updated.totalAmount = updated.guests * updated.pricePerGuest
      }
      
      return updated
    })
  }

  const generateQuote = async () => {
    setIsGenerating(true)
    try {
      const user = await blink.auth.me()
      
      // Create quote in database
      const quoteId = `quote_${Date.now()}`
      const quoteNumber = `${new Date().getFullYear()}${String(Date.now()).slice(-4)}`
      
      await blink.db.quotes.create({
        id: quoteId,
        userId: user.id,
        quoteNumber,
        title: quoteData.eventTitle,
        description: `Event for ${quoteData.guests} guests at ${quoteData.location}`,
        totalAmount: quoteData.totalAmount * 100, // Store in øre
        status: 'draft',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days
      })

      // Generate quote content using AI
      const prompt = `Generer et professionelt tilbud for Foodtruck Fiesta ApS baseret på følgende data:

Kunde: ${quoteData.customerName}
Email: ${quoteData.customerEmail}
Telefon: ${quoteData.customerPhone}

Event: ${quoteData.eventTitle}
Dato: ${quoteData.eventDate}
Lokation: ${quoteData.location}
Antal gæster: ${quoteData.guests}
Vogn: ${quoteData.wagon === 'both' ? 'Begge vogne' : quoteData.wagon === 'shawarma' ? 'Shawarma Wagon' : 'Grill Wagon'}
Menu: ${quoteData.menu.join(', ')}
Pris pr. kuvert: ${quoteData.pricePerGuest} kr
Total: ${quoteData.totalAmount} kr ekskl. moms
Noter: ${quoteData.notes}

Lav et komplet tilbud med:
1. Professionel hilsen
2. Beskrivelse af service
3. Menu detaljer
4. Priser og betingelser
5. Praktiske oplysninger (strøm, plads, etc.)
6. Kontaktinfo
7. Venlig afslutning

Brug Foodtruck Fiesta's tone: venlig, professionel, med let humor. Max 400 ord.`

      const { text } = await blink.ai.generateText({
        prompt,
        model: 'gpt-4.1-mini'
      })

      setGeneratedQuote(text)

      // Update quote with generated content
      await blink.db.quotes.update(quoteId, {
        description: text
      })

    } catch (error) {
      console.error('Error generating quote:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const sendQuote = async () => {
    try {
      const emailContent = `
Hej ${quoteData.customerName},

${generatedQuote}

Med venlig hilsen,
Jonas Abde
Foodtruck Fiesta ApS
CVR: 44371901
Tlf: +45 22 65 02 26
Email: ftfiestaa@gmail.com
      `

      await blink.notifications.email({
        to: quoteData.customerEmail,
        subject: `Tilbud fra Foodtruck Fiesta - ${quoteData.eventTitle}`,
        html: emailContent.replace(/\n/g, '<br>'),
        text: emailContent
      })

      alert('Tilbud sendt til kunde! 🎉')
    } catch (error) {
      console.error('Error sending quote:', error)
      alert('Fejl ved afsendelse af tilbud')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Tilbud Generator</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Kunde Information</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="customerName">Navn</Label>
                <Input
                  id="customerName"
                  value={quoteData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  placeholder="Kunde navn"
                />
              </div>
              <div>
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={quoteData.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  placeholder="kunde@email.dk"
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Telefon</Label>
                <Input
                  id="customerPhone"
                  value={quoteData.customerPhone}
                  onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                  placeholder="+45 12 34 56 78"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Event Information */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Event Information</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventTitle">Event Titel</Label>
                <Input
                  id="eventTitle"
                  value={quoteData.eventTitle}
                  onChange={(e) => handleInputChange('eventTitle', e.target.value)}
                  placeholder="Firmafest, bryllup, festival..."
                />
              </div>
              <div>
                <Label htmlFor="eventDate">Dato</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={quoteData.eventDate}
                  onChange={(e) => handleInputChange('eventDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="location">Lokation</Label>
                <Input
                  id="location"
                  value={quoteData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Adresse eller område"
                />
              </div>
              <div>
                <Label htmlFor="guests">Antal Gæster</Label>
                <Input
                  id="guests"
                  type="number"
                  value={quoteData.guests}
                  onChange={(e) => handleInputChange('guests', parseInt(e.target.value) || 0)}
                  min="1"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Service Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center space-x-2">
              <Truck className="h-4 w-4" />
              <span>Service Valg</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="wagon">Vogn</Label>
                <Select value={quoteData.wagon} onValueChange={(value) => handleInputChange('wagon', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shawarma">🌯 Shawarma Wagon</SelectItem>
                    <SelectItem value="grill">🍗 Grill Wagon</SelectItem>
                    <SelectItem value="both">🔥 Begge Vogne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pricePerGuest">Pris pr. Kuvert (kr)</Label>
                <Input
                  id="pricePerGuest"
                  type="number"
                  value={quoteData.pricePerGuest}
                  onChange={(e) => handleInputChange('pricePerGuest', parseInt(e.target.value) || 0)}
                  min="100"
                />
              </div>
            </div>

            {/* Menu Selection */}
            <div>
              <Label>Menu Valg</Label>
              <div className="mt-2 space-y-2">
                {(quoteData.wagon === 'both' 
                  ? [...menuOptions.shawarma, ...menuOptions.grill]
                  : menuOptions[quoteData.wagon]
                ).map((item) => (
                  <label key={item} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={quoteData.menu.includes(item)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleInputChange('menu', [...quoteData.menu, item])
                        } else {
                          handleInputChange('menu', quoteData.menu.filter(m => m !== item))
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Price Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold flex items-center space-x-2">
                <Calculator className="h-4 w-4" />
                <span>Pris Oversigt</span>
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{quoteData.guests} gæster × {quoteData.pricePerGuest} kr</span>
                <span>{quoteData.totalAmount.toLocaleString('da-DK')} kr</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Total ekskl. moms</span>
                <span>{quoteData.totalAmount.toLocaleString('da-DK')} kr</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Moms (25%)</span>
                <span>{Math.round(quoteData.totalAmount * 0.25).toLocaleString('da-DK')} kr</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-1">
                <span>Total inkl. moms</span>
                <span>{Math.round(quoteData.totalAmount * 1.25).toLocaleString('da-DK')} kr</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Særlige Noter</Label>
            <Textarea
              id="notes"
              value={quoteData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Allergier, særlige ønsker, praktiske oplysninger..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <Button 
              onClick={generateQuote} 
              disabled={isGenerating || !quoteData.customerName || !quoteData.eventTitle}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Genererer...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generer Tilbud
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Quote */}
      {generatedQuote && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Genereret Tilbud</span>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button 
                  onClick={sendQuote}
                  disabled={!quoteData.customerEmail}
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send til Kunde
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-6 border rounded-lg">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {generatedQuote}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}