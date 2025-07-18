import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { 
  Bell, 
  Check, 
  X, 
  Trash2, 
  CheckCheck,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react'
import blink from '@/blink/client'

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  isRead: boolean
  actionUrl?: string
  createdAt: Date
  userId: string
}

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  onNotificationRead: () => void
}

export function NotificationCenter({ isOpen, onClose, onNotificationRead }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (isOpen && user?.id) {
      loadNotifications()
    }
  }, [isOpen, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadNotifications = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const notificationData = await blink.db.notifications.list({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        limit: 50
      })

      setNotifications(notificationData.map(notif => ({
        id: notif.id,
        type: notif.type as 'info' | 'success' | 'warning' | 'error',
        title: notif.title,
        message: notif.message,
        isRead: Number(notif.isRead) > 0,
        actionUrl: notif.actionUrl,
        createdAt: new Date(notif.createdAt),
        userId: notif.userId
      })))

      // Create some sample notifications if none exist
      if (notificationData.length === 0) {
        await createSampleNotifications()
        setTimeout(() => loadNotifications(), 1000)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const createSampleNotifications = async () => {
    if (!user?.id) return

    try {
      await blink.db.notifications.createMany([
        {
          id: `notif_${Date.now()}_1`,
          userId: user.id,
          type: 'success',
          title: 'Velkommen til FiestaAI!',
          message: 'Din AI-assistent er nu klar til at hjælpe med alle dine operations-opgaver.',
          isRead: 0
        },
        {
          id: `notif_${Date.now()}_2`,
          userId: user.id,
          type: 'info',
          title: 'Ny event forespørgsel',
          message: 'Du har modtaget en forespørgsel om catering til Ellevangskolen Festival.',
          isRead: 0,
          actionUrl: '/dashboard'
        },
        {
          id: `notif_${Date.now()}_3`,
          userId: user.id,
          type: 'warning',
          title: 'Påmindelse: Bogføring',
          message: 'Husk at importere Sydbank CSV for juni måned.',
          isRead: 0
        }
      ])
    } catch (error) {
      console.error('Error creating sample notifications:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await blink.db.notifications.update(notificationId, { isRead: 1 })
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      )
      onNotificationRead()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead)
      
      for (const notif of unreadNotifications) {
        await blink.db.notifications.update(notif.id, { isRead: 1 })
      }
      
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      )
      onNotificationRead()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await blink.db.notifications.delete(notificationId)
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
      onNotificationRead()
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />
      default: return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Lige nu'
    if (diffInMinutes < 60) return `${diffInMinutes}m siden`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}t siden`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d siden`
    
    return date.toLocaleDateString('da-DK')
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notifikationer</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Hold styr på vigtige opdateringer og påmindelser
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Actions */}
          {unreadCount > 0 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="flex items-center space-x-2"
              >
                <CheckCheck className="h-4 w-4" />
                <span>Marker alle som læst</span>
              </Button>
            </div>
          )}

          {/* Notifications List */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-2">
                    <Bell className="h-8 w-8 text-muted-foreground mx-auto animate-pulse" />
                    <p className="text-muted-foreground">Indlæser notifikationer...</p>
                  </div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-2">
                    <Bell className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">Ingen notifikationer</p>
                    <p className="text-sm text-muted-foreground">
                      Du vil modtage notifikationer her når der sker noget vigtigt
                    </p>
                  </div>
                </div>
              ) : (
                notifications.map((notification, index) => (
                  <Card 
                    key={notification.id}
                    className={`transition-all duration-200 hover:shadow-md ${
                      !notification.isRead 
                        ? 'border-primary/50 bg-primary/5' 
                        : 'border-border'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className={`text-sm font-medium ${
                                !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                              }`}>
                                {notification.title}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center space-x-2 mt-2">
                                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{getTimeAgo(notification.createdAt)}</span>
                                </div>
                                
                                {notification.actionUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => {
                                      if (!notification.isRead) {
                                        markAsRead(notification.id)
                                      }
                                      // Navigate to action URL
                                      window.location.href = notification.actionUrl!
                                    }}
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Se mere
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-1 ml-2">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                  className="h-8 w-8 p-0"
                                  title="Marker som læst"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteNotification(notification.id)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                title="Slet notifikation"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}