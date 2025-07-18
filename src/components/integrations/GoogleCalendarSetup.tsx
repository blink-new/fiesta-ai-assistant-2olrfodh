import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw,
  Settings,
  Key,
  Globe
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import blink from '@/blink/client'
import googleCalendarService from '@/services/googleCalendar'

interface GoogleCalendarSetupProps {
  onSetupComplete?: () => void
}

export function GoogleCalendarSetup({ onSetupComplete }: GoogleCalendarSetupProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [accessToken, setAccessToken] = useState('')
  const [calendarId, setCalendarId] = useState('ftfiestaa@gmail.com')
  const [testResults, setTestResults] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged(async (state) => {
      setUser(state.user)
      if (state.user) {
        await checkConnection(state.user.id)
      }
      setIsLoading(false)
    })
    return unsubscribe
  }, [])

  const checkConnection = async (userId: string) => {
    try {
      const integration = await googleCalendarService.getCalendarIntegration(userId)
      setIsConnected(!!integration?.accessToken)
      if (integration) {
        setCalendarId(integration.calendarId)
      }
    } catch (error) {
      console.error('Error checking connection:', error)
      setIsConnected(false)
    }
  }

  const connectCalendar = async () => {
    if (!user?.id || !accessToken.trim()) {
      toast({
        title: "Fejl",
        description: "Indtast venligst et gyldigt access token",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      // Save integration
      await googleCalendarService.saveCalendarIntegration({
        userId: user.id,
        accessToken: accessToken.trim(),
        calendarId: calendarId.trim() || 'primary',
        syncEnabled: true
      })

      // Test connection
      const events = await googleCalendarService.getUpcomingEvents(user.id, 7)
      
      setIsConnected(true)
      setTestResults({
        success: true,
        eventCount: events.length,
        events: events.slice(0, 3)
      })

      toast({
        title: "Google Calendar forbundet! 🎉",
        description: `Fundet ${events.length} events i de næste 7 dage`,
      })

      if (onSetupComplete) {
        onSetupComplete()
      }
    } catch (error) {
      console.error('Error connecting calendar:', error)
      setTestResults({
        success: false,
        error: error.message
      })
      toast({
        title: "Forbindelsesfejl",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testConnection = async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const events = await googleCalendarService.getUpcomingEvents(user.id, 30)
      setTestResults({
        success: true,
        eventCount: events.length,
        events: events.slice(0, 5)
      })

      toast({
        title: "Test gennemført",
        description: `Fundet ${events.length} events i kalenderen`,
      })
    } catch (error) {
      console.error('Error testing connection:', error)
      setTestResults({
        success: false,
        error: error.message
      })
      toast({
        title: "Test fejlede",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectCalendar = async () => {
    if (!user?.id) return

    try {
      await googleCalendarService.saveCalendarIntegration({
        userId: user.id,
        accessToken: '',
        syncEnabled: false
      })

      setIsConnected(false)
      setTestResults(null)
      setAccessToken('')

      toast({
        title: "Google Calendar afbrudt",
        description: "Kalenderen er blevet afbrudt fra FiestaAI",
      })
    } catch (error) {
      console.error('Error disconnecting calendar:', error)
      toast({
        title: "Fejl",
        description: "Kunne ikke afbryde kalenderen",
        variant: "destructive"
      })
    }
  }

  if (isLoading && !user) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Google Calendar Integration</span>
            {isConnected && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Forbundet
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isConnected ? (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  For at forbinde Google Calendar skal du oprette et access token fra Google Cloud Console.
                  Dette giver FiestaAI adgang til at læse og skrive events i din kalender.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center space-x-2">
                    <Key className="h-4 w-4" />
                    <span>Opsætning</span>
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Gå til <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center">Google Cloud Console <ExternalLink className="h-3 w-3 ml-1" /></a></li>
                    <li>Opret et nyt projekt eller vælg eksisterende</li>
                    <li>Aktiver Google Calendar API</li>
                    <li>Opret OAuth 2.0 credentials</li>
                    <li>Tilføj din domain som authorized redirect URI</li>
                    <li>Generer og kopier access token</li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Google Calendar ID:</label>
                    <Input
                      value={calendarId}
                      onChange={(e) => setCalendarId(e.target.value)}
                      placeholder="ftfiestaa@gmail.com eller 'primary'"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Brug 'primary' for hovedkalender eller specifik email
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Access Token:</label>
                    <Input
                      type="password"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="Indsæt dit Google Calendar access token"
                    />
                  </div>
                </div>

                <Button 
                  onClick={connectCalendar}
                  disabled={isLoading || !accessToken.trim()}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Forbinder...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Forbind Google Calendar
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Google Calendar er forbundet og klar til brug! FiestaAI kan nu læse og skrive events i din kalender.
                </AlertDescription>
              </Alert>

              <div className="flex space-x-3">
                <Button 
                  onClick={testConnection}
                  disabled={isLoading}
                  variant="outline"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Test Forbindelse
                </Button>
                
                <Button 
                  onClick={disconnectCalendar}
                  variant="destructive"
                >
                  Afbryd Kalender
                </Button>
              </div>
            </>
          )}

          {/* Test Results */}
          {testResults && (
            <Card className={testResults.success ? 'border-green-200' : 'border-red-200'}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  {testResults.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <h3 className="font-semibold">
                    {testResults.success ? 'Forbindelse OK' : 'Forbindelsesfejl'}
                  </h3>
                </div>

                {testResults.success ? (
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Events fundet:</strong> {testResults.eventCount}
                    </p>
                    {testResults.events && testResults.events.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Kommende events:</p>
                        <div className="space-y-1">
                          {testResults.events.map((event: any, index: number) => (
                            <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                              <div className="font-medium">{event.summary || 'Untitled'}</div>
                              <div className="text-muted-foreground">
                                {event.start?.dateTime ? new Date(event.start.dateTime).toLocaleString('da-DK') : 'No date'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-red-600">
                    <strong>Fejl:</strong> {testResults.error}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Usage Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2 flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <span>Sådan bruges Google Calendar integration</span>
              </h3>
              <ul className="text-sm space-y-1 text-blue-800">
                <li>• Spørg FiestaAI om "hvilke events har vi i de kommende dage"</li>
                <li>• AI'en vil automatisk hente data fra din Google Calendar</li>
                <li>• Events fra ftfiestaa@gmail.com vises i chat svar</li>
                <li>• Perfekt til at planlægge og koordinere bookings</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}