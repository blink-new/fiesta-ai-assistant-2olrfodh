import blink from '@/blink/client'

export interface GoogleCalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
  location?: string
  attendees?: Array<{ email: string }>
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: 'email' | 'popup'
      minutes: number
    }>
  }
}

export interface CalendarIntegration {
  id: string
  userId: string
  provider: string
  accessToken?: string
  refreshToken?: string
  calendarId: string
  syncEnabled: boolean
  lastSync?: Date
}

export class GoogleCalendarService {
  private static instance: GoogleCalendarService
  private baseUrl = 'https://www.googleapis.com/calendar/v3'

  static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService()
    }
    return GoogleCalendarService.instance
  }

  async getCalendarIntegration(userId: string): Promise<CalendarIntegration | null> {
    try {
      const integrations = await blink.db.calendarIntegrations.list({
        where: { userId, provider: 'google' },
        limit: 1
      })

      if (integrations.length === 0) {
        return null
      }

      const integration = integrations[0]
      return {
        id: integration.id,
        userId: integration.userId,
        provider: integration.provider,
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken,
        calendarId: integration.calendarId || 'primary',
        syncEnabled: Number(integration.syncEnabled) > 0,
        lastSync: integration.lastSync ? new Date(integration.lastSync) : undefined
      }
    } catch (error) {
      console.error('Error getting calendar integration:', error)
      return null
    }
  }

  async saveCalendarIntegration(integration: Partial<CalendarIntegration> & { userId: string }): Promise<void> {
    try {
      const existingIntegrations = await blink.db.calendarIntegrations.list({
        where: { userId: integration.userId, provider: 'google' },
        limit: 1
      })

      const data = {
        userId: integration.userId,
        provider: 'google',
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken,
        calendarId: integration.calendarId || 'primary',
        syncEnabled: integration.syncEnabled ? 1 : 0,
        lastSync: new Date().toISOString()
      }

      if (existingIntegrations.length > 0) {
        await blink.db.calendarIntegrations.update(existingIntegrations[0].id, data)
      } else {
        await blink.db.calendarIntegrations.create({
          id: `cal_int_${Date.now()}`,
          ...data
        })
      }
    } catch (error) {
      console.error('Error saving calendar integration:', error)
      throw error
    }
  }

  async getUpcomingEvents(userId: string, days: number = 30): Promise<any[]> {
    try {
      const integration = await this.getCalendarIntegration(userId)
      if (!integration || !integration.accessToken) {
        throw new Error('Google Calendar ikke forbundet. Kontakt support for at få hjælp til opsætning.')
      }

      const now = new Date()
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + days)

      // Use Blink's secure API proxy to call Google Calendar API
      const response = await blink.data.fetch({
        url: `${this.baseUrl}/calendars/${integration.calendarId}/events`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${integration.accessToken}`,
          'Accept': 'application/json'
        },
        query: {
          timeMin: now.toISOString(),
          timeMax: futureDate.toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '50'
        }
      })

      if (response.status !== 200) {
        throw new Error(`Google Calendar API fejl: ${response.status}`)
      }

      const data = typeof response.body === 'string' ? JSON.parse(response.body) : response.body
      return data.items || []
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error)
      
      // Log sync error
      await this.logSyncOperation(userId, 'fetch_events', null, null, 'error', error.message)
      
      throw error
    }
  }

  async createEvent(userId: string, event: GoogleCalendarEvent): Promise<string> {
    try {
      const integration = await this.getCalendarIntegration(userId)
      if (!integration || !integration.accessToken) {
        throw new Error('Google Calendar ikke forbundet')
      }

      const response = await blink.data.fetch({
        url: `${this.baseUrl}/calendars/${integration.calendarId}/events`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${integration.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: event
      })

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Kunne ikke oprette event: ${response.status}`)
      }

      const data = typeof response.body === 'string' ? JSON.parse(response.body) : response.body
      
      // Log successful operation
      await this.logSyncOperation(userId, 'create_event', null, data.id, 'success')
      
      return data.id
    } catch (error) {
      console.error('Error creating Google Calendar event:', error)
      await this.logSyncOperation(userId, 'create_event', null, null, 'error', error.message)
      throw error
    }
  }

  async updateEvent(userId: string, eventId: string, event: GoogleCalendarEvent): Promise<void> {
    try {
      const integration = await this.getCalendarIntegration(userId)
      if (!integration || !integration.accessToken) {
        throw new Error('Google Calendar ikke forbundet')
      }

      const response = await blink.data.fetch({
        url: `${this.baseUrl}/calendars/${integration.calendarId}/events/${eventId}`,
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${integration.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: event
      })

      if (response.status !== 200) {
        throw new Error(`Kunne ikke opdatere event: ${response.status}`)
      }

      await this.logSyncOperation(userId, 'update_event', null, eventId, 'success')
    } catch (error) {
      console.error('Error updating Google Calendar event:', error)
      await this.logSyncOperation(userId, 'update_event', null, eventId, 'error', error.message)
      throw error
    }
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    try {
      const integration = await this.getCalendarIntegration(userId)
      if (!integration || !integration.accessToken) {
        throw new Error('Google Calendar ikke forbundet')
      }

      const response = await blink.data.fetch({
        url: `${this.baseUrl}/calendars/${integration.calendarId}/events/${eventId}`,
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${integration.accessToken}`
        }
      })

      if (response.status !== 204 && response.status !== 410) {
        throw new Error(`Kunne ikke slette event: ${response.status}`)
      }

      await this.logSyncOperation(userId, 'delete_event', null, eventId, 'success')
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error)
      await this.logSyncOperation(userId, 'delete_event', null, eventId, 'error', error.message)
      throw error
    }
  }

  async syncEvents(userId: string): Promise<{ synced: number; errors: number }> {
    try {
      const integration = await this.getCalendarIntegration(userId)
      if (!integration || !integration.syncEnabled) {
        return { synced: 0, errors: 0 }
      }

      // Get events from Google Calendar
      const googleEvents = await this.getUpcomingEvents(userId, 90)
      
      // Get local events
      const localEvents = await blink.db.calendarEvents.list({
        where: { userId },
        limit: 200
      })

      let synced = 0
      let errors = 0

      // Sync Google events to local database
      for (const googleEvent of googleEvents) {
        try {
          const existingEvent = localEvents.find(e => e.googleEventId === googleEvent.id)
          
          const eventData = {
            userId,
            googleEventId: googleEvent.id,
            title: googleEvent.summary || 'Untitled Event',
            description: googleEvent.description || '',
            date: googleEvent.start?.dateTime ? new Date(googleEvent.start.dateTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            startTime: googleEvent.start?.dateTime ? new Date(googleEvent.start.dateTime).toTimeString().slice(0, 5) : '09:00',
            endTime: googleEvent.end?.dateTime ? new Date(googleEvent.end.dateTime).toTimeString().slice(0, 5) : '17:00',
            location: googleEvent.location || '',
            status: 'confirmed',
            type: 'event'
          }

          if (existingEvent) {
            await blink.db.calendarEvents.update(existingEvent.id, eventData)
          } else {
            await blink.db.calendarEvents.create({
              id: `cal_sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              ...eventData
            })
          }
          
          synced++
        } catch (error) {
          console.error(`Error syncing event ${googleEvent.id}:`, error)
          errors++
        }
      }

      // Update last sync time
      await this.saveCalendarIntegration({
        ...integration,
        lastSync: new Date()
      })

      await this.logSyncOperation(userId, 'sync_events', null, null, 'success', `Synced ${synced} events, ${errors} errors`)

      return { synced, errors }
    } catch (error) {
      console.error('Error syncing events:', error)
      await this.logSyncOperation(userId, 'sync_events', null, null, 'error', error.message)
      return { synced: 0, errors: 1 }
    }
  }

  private async logSyncOperation(
    userId: string,
    operation: string,
    eventId: string | null,
    googleEventId: string | null,
    status: 'success' | 'error',
    errorMessage?: string
  ): Promise<void> {
    try {
      await blink.db.calendarSyncLog.create({
        id: `sync_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        operation,
        eventId,
        googleEventId,
        status,
        errorMessage
      })
    } catch (error) {
      console.error('Error logging sync operation:', error)
    }
  }

  // Helper method to format events for AI responses
  formatEventsForAI(events: any[]): string {
    if (events.length === 0) {
      return 'Ingen events fundet i den angivne periode.'
    }

    return events.map(event => {
      const startDate = event.start?.dateTime ? new Date(event.start.dateTime) : new Date()
      const endDate = event.end?.dateTime ? new Date(event.end.dateTime) : new Date()
      
      return `📅 **${event.summary || 'Untitled Event'}**
📍 ${event.location || 'Ingen lokation angivet'}
🕐 ${startDate.toLocaleDateString('da-DK')} ${startDate.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
${event.description ? `📝 ${event.description}` : ''}
${event.attendees?.length ? `👥 ${event.attendees.length} deltagere` : ''}`
    }).join('\n\n')
  }

  // Helper method to get events for specific date range
  async getEventsForDateRange(userId: string, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const integration = await this.getCalendarIntegration(userId)
      if (!integration || !integration.accessToken) {
        throw new Error('Google Calendar ikke forbundet')
      }

      const response = await blink.data.fetch({
        url: `${this.baseUrl}/calendars/${integration.calendarId}/events`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${integration.accessToken}`,
          'Accept': 'application/json'
        },
        query: {
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '100'
        }
      })

      if (response.status !== 200) {
        throw new Error(`Google Calendar API fejl: ${response.status}`)
      }

      const data = typeof response.body === 'string' ? JSON.parse(response.body) : response.body
      return data.items || []
    } catch (error) {
      console.error('Error fetching events for date range:', error)
      throw error
    }
  }
}

export default GoogleCalendarService.getInstance()