import { useState, useEffect } from 'react'
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
  CreditCard,
  Building,
  Mail
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import blink from '@/blink/client'

interface InvoiceData {
  customerName: string
  customerEmail: string
  customerAddress: string
  customerCVR?: string
  eventTitle: string
  eventDate: string
  location: string
  description: string
  items: InvoiceItem[]
  subtotal: number
  vatAmount: number
  totalAmount: number
  paymentTerms: string
  notes: string
}

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export function InvoiceGenerator() {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    customerCVR: '',
    eventTitle: '',
    eventDate: '',
    location: '',
    description: '',
    items: [
      { description: 'Catering service', quantity: 1, unitPrice: 0, total: 0 }
    ],
    subtotal: 0,
    vatAmount: 0,
    totalAmount: 0,
    paymentTerms: 'netto 8 dage',
    notes: ''
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedInvoice, setGeneratedInvoice] = useState<string>('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    // Generate invoice number
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const time = String(now.getTime()).slice(-4)
    setInvoiceNumber(`${year}${month}${day}-${time}`)
  }, [])

  useEffect(() => {
    // Calculate totals when items change
    const subtotal = invoiceData.items.reduce((sum, item) => sum + item.total, 0)
    const vatAmount = subtotal * 0.25 // 25% Danish VAT
    const totalAmount = subtotal + vatAmount

    setInvoiceData(prev => ({
      ...prev,
      subtotal,
      vatAmount,
      totalAmount
    }))
  }, [invoiceData.items])

  const handleInputChange = (field: keyof InvoiceData, value: any) => {
    setInvoiceData(prev => ({ ...prev, [field]: value }))
  }

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value }
          // Recalculate total when quantity or unit price changes
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice
          }
          return updatedItem
        }
        return item
      })
    }))
  }

  const addItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]
    }))
  }

  const removeItem = (index: number) => {
    if (invoiceData.items.length > 1) {
      setInvoiceData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }))
    }
  }

  const generateInvoice = async () => {
    setIsGenerating(true)
    try {
      const user = await blink.auth.me()
      
      // Create invoice in database
      const invoiceId = `invoice_${Date.now()}`
      
      await blink.db.invoices.create({
        id: invoiceId,
        userId: user.id,
        invoiceNumber,
        title: invoiceData.eventTitle,
        description: invoiceData.description,
        totalAmount: Math.round(invoiceData.totalAmount * 100), // Store in øre
        status: 'draft',
        dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 8 days
      })

      // Generate invoice content using AI
      const itemsText = invoiceData.items
        .map(item => `${item.description} - ${item.quantity} stk. × ${item.unitPrice.toLocaleString('da-DK')} kr = ${item.total.toLocaleString('da-DK')} kr`)
        .join('\n')

      const prompt = `Generer en professionel faktura for Foodtruck Fiesta ApS baseret på følgende data:

FAKTURA NR: ${invoiceNumber}
DATO: ${new Date().toLocaleDateString('da-DK')}

KUNDE:
${invoiceData.customerName}
${invoiceData.customerAddress}
${invoiceData.customerCVR ? `CVR: ${invoiceData.customerCVR}` : ''}

EVENT:
${invoiceData.eventTitle}
Dato: ${invoiceData.eventDate}
Lokation: ${invoiceData.location}
Beskrivelse: ${invoiceData.description}

FAKTURA LINJER:
${itemsText}

BELØB:
Subtotal: ${invoiceData.subtotal.toLocaleString('da-DK')} kr
Moms (25%): ${invoiceData.vatAmount.toLocaleString('da-DK')} kr
Total: ${invoiceData.totalAmount.toLocaleString('da-DK')} kr

BETALINGSBETINGELSER: ${invoiceData.paymentTerms}
NOTER: ${invoiceData.notes}

VIRKSOMHEDSINFO:
Foodtruck Fiesta ApS
Jonas Abde
CVR: 44371901
Tlf: +45 22 65 02 26
Email: ftfiestaa@gmail.com
IBAN: DK127118000177187
MobilePay: #124248

Lav en komplet, professionel faktura i UBL-XML format med alle nødvendige felter og dansk formatering.`

      const { text } = await blink.ai.generateText({
        prompt,
        model: 'gpt-4.1-mini'
      })

      setGeneratedInvoice(text)

      // Update invoice with generated content
      await blink.db.invoices.update(invoiceId, {
        description: text
      })

      toast({
        title: "Faktura genereret! 📄",
        description: `Faktura ${invoiceNumber} er klar til afsendelse`,
      })

    } catch (error) {
      console.error('Error generating invoice:', error)
      toast({
        title: "Fejl",
        description: "Kunne ikke generere faktura",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const sendInvoice = async () => {
    try {
      const emailContent = `
Hej ${invoiceData.customerName},

Tak for jeres event! Vedhæftet finder I fakturaen for vores catering service.

Event: ${invoiceData.eventTitle}
Dato: ${invoiceData.eventDate}
Lokation: ${invoiceData.location}

Faktura nr: ${invoiceNumber}
Total beløb: ${invoiceData.totalAmount.toLocaleString('da-DK')} kr inkl. moms
Betalingsfrist: ${invoiceData.paymentTerms}

BETALINGSOPLYSNINGER:
IBAN: DK127118000177187
MobilePay: #124248

Har I spørgsmål til fakturaen, så kontakt mig gerne.

Med venlig hilsen,
Jonas Abde
Foodtruck Fiesta ApS
CVR: 44371901
Tlf: +45 22 65 02 26
Email: ftfiestaa@gmail.com
      `

      await blink.notifications.email({
        to: invoiceData.customerEmail,
        subject: `Faktura ${invoiceNumber} - Foodtruck Fiesta ApS`,
        html: emailContent.replace(/\n/g, '<br>'),
        text: emailContent
      })

      toast({
        title: "Faktura sendt! 📧",
        description: `Faktura sendt til ${invoiceData.customerEmail}`,
      })
    } catch (error) {
      console.error('Error sending invoice:', error)
      toast({
        title: "Fejl",
        description: "Kunne ikke sende faktura",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Faktura Generator</span>
            </div>
            <Badge variant="outline">#{invoiceNumber}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center space-x-2">
              <Building className="h-4 w-4" />
              <span>Kunde Information</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Firmanavn / Navn</Label>
                <Input
                  id="customerName"
                  value={invoiceData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  placeholder="Kunde navn"
                />
              </div>
              <div>
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={invoiceData.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  placeholder="kunde@email.dk"
                />
              </div>
              <div>
                <Label htmlFor="customerAddress">Adresse</Label>
                <Textarea
                  id="customerAddress"
                  value={invoiceData.customerAddress}
                  onChange={(e) => handleInputChange('customerAddress', e.target.value)}
                  placeholder="Adresse, postnummer, by"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="customerCVR">CVR (valgfrit)</Label>
                <Input
                  id="customerCVR"
                  value={invoiceData.customerCVR}
                  onChange={(e) => handleInputChange('customerCVR', e.target.value)}
                  placeholder="12345678"
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
                  value={invoiceData.eventTitle}
                  onChange={(e) => handleInputChange('eventTitle', e.target.value)}
                  placeholder="Firmafest, bryllup, festival..."
                />
              </div>
              <div>
                <Label htmlFor="eventDate">Event Dato</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={invoiceData.eventDate}
                  onChange={(e) => handleInputChange('eventDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="location">Lokation</Label>
                <Input
                  id="location"
                  value={invoiceData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Event adresse"
                />
              </div>
              <div>
                <Label htmlFor="paymentTerms">Betalingsbetingelser</Label>
                <Select value={invoiceData.paymentTerms} onValueChange={(value) => handleInputChange('paymentTerms', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="netto 8 dage">Netto 8 dage</SelectItem>
                    <SelectItem value="netto 14 dage">Netto 14 dage</SelectItem>
                    <SelectItem value="netto 30 dage">Netto 30 dage</SelectItem>
                    <SelectItem value="kontant">Kontant</SelectItem>
                    <SelectItem value="forudbetaling">100% forudbetaling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Beskrivelse</Label>
              <Textarea
                id="description"
                value={invoiceData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detaljeret beskrivelse af service..."
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Invoice Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center space-x-2">
                <Calculator className="h-4 w-4" />
                <span>Faktura Linjer</span>
              </h3>
              <Button onClick={addItem} variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Tilføj Linje
              </Button>
            </div>

            <div className="space-y-3">
              {invoiceData.items.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="md:col-span-2">
                      <Label>Beskrivelse</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Service beskrivelse"
                      />
                    </div>
                    <div>
                      <Label>Antal</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        min="1"
                      />
                    </div>
                    <div>
                      <Label>Enhedspris (kr)</Label>
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Total</Label>
                        <div className="text-lg font-semibold">
                          {item.total.toLocaleString('da-DK')} kr
                        </div>
                      </div>
                      {invoiceData.items.length > 1 && (
                        <Button
                          onClick={() => removeItem(index)}
                          variant="outline"
                          size="sm"
                          className="ml-2"
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Price Summary */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="space-y-3">
              <div className="flex justify-between text-lg">
                <span>Subtotal:</span>
                <span>{invoiceData.subtotal.toLocaleString('da-DK')} kr</span>
              </div>
              <div className="flex justify-between text-lg">
                <span>Moms (25%):</span>
                <span>{invoiceData.vatAmount.toLocaleString('da-DK')} kr</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xl font-bold">
                <span>Total inkl. moms:</span>
                <span>{invoiceData.totalAmount.toLocaleString('da-DK')} kr</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Særlige Noter</Label>
            <Textarea
              id="notes"
              value={invoiceData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Ekstra information, tak for samarbejdet, etc..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <Button 
              onClick={generateInvoice} 
              disabled={isGenerating || !invoiceData.customerName || !invoiceData.eventTitle}
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
                  Generer Faktura
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Invoice */}
      {generatedInvoice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Genereret Faktura #{invoiceNumber}</span>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button 
                  onClick={sendInvoice}
                  disabled={!invoiceData.customerEmail}
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
                {generatedInvoice}
              </pre>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center space-x-2">
                <CreditCard className="h-4 w-4" />
                <span>Betalingsoplysninger</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Bankoverførsel:</strong><br />
                  IBAN: DK127118000177187<br />
                  Foodtruck Fiesta ApS<br />
                  CVR: 44371901
                </div>
                <div>
                  <strong>MobilePay:</strong><br />
                  #124248<br />
                  <strong>Betalingsfrist:</strong><br />
                  {invoiceData.paymentTerms}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}