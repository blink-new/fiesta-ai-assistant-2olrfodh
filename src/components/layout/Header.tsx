import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Flame, 
  MessageSquare, 
  History, 
  Plus,
  Bell,
  Settings,
  User,
  LogOut,
  CheckSquare,
  Database,
  ChevronDown
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { ProfileSettings } from '@/components/profile/ProfileSettings'
import blink from '@/blink/client'

interface HeaderProps {
  user: any
  currentView: 'dashboard' | 'history' | 'tasks' | 'knowledge'
  onViewChange: (view: 'dashboard' | 'history' | 'tasks' | 'knowledge') => void
  onNewChat?: () => void
}

export function Header({ user, currentView, onViewChange, onNewChat }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [userProfile, setUserProfile] = useState<any>(null)

  const loadUserProfile = async () => {
    if (!user?.id) return
    try {
      const profiles = await blink.db.userProfiles.list({
        where: { userId: user.id },
        limit: 1
      })
      
      if (profiles.length > 0) {
        setUserProfile(profiles[0])
      } else {
        // Create default profile
        const newProfile = {
          id: `profile_${Date.now()}`,
          userId: user.id,
          displayName: user.displayName || user.email?.split('@')[0] || 'Jonas',
          avatarUrl: '',
          bio: 'Ejer af Foodtruck Fiesta ApS',
          preferences: JSON.stringify({
            theme: 'light',
            notifications: true,
            language: 'da'
          })
        }
        
        await blink.db.userProfiles.create(newProfile)
        setUserProfile(newProfile)
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  const loadNotificationCount = async () => {
    if (!user?.id) return
    try {
      const notifications = await blink.db.notifications.list({
        where: { userId: user.id, isRead: 0 },
        limit: 100
      })
      setUnreadCount(notifications.length)
    } catch (error) {
      console.error('Error loading notification count:', error)
    }
  }

  useEffect(() => {
    if (user?.id) {
      loadUserProfile()
      loadNotificationCount()
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = () => {
    blink.auth.logout()
  }

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Dashboard'
      case 'history': return 'Chat Historik'
      case 'tasks': return 'Opgaver'
      case 'knowledge': return 'Knowledge Base'
      default: return 'FiestaAI'
    }
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left Side - Logo and Navigation */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-accent to-orange-500 flex items-center justify-center shadow-lg">
                  <Flame className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <h1 className="font-display text-xl font-bold">FiestaAI</h1>
                <p className="text-xs text-muted-foreground">Operations Assistant</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <Button
                variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('dashboard')}
                className="flex items-center space-x-2"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Chat</span>
              </Button>
              
              <Button
                variant={currentView === 'history' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('history')}
                className="flex items-center space-x-2"
              >
                <History className="h-4 w-4" />
                <span>Historik</span>
              </Button>
              
              <Button
                variant={currentView === 'tasks' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('tasks')}
                className="flex items-center space-x-2"
              >
                <CheckSquare className="h-4 w-4" />
                <span>Opgaver</span>
              </Button>
              
              <Button
                variant={currentView === 'knowledge' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('knowledge')}
                className="flex items-center space-x-2"
              >
                <Database className="h-4 w-4" />
                <span>Knowledge</span>
              </Button>
            </nav>
          </div>

          {/* Center - Current View Title */}
          <div className="hidden lg:block">
            <h2 className="text-lg font-semibold text-muted-foreground">
              {getViewTitle()}
            </h2>
          </div>

          {/* Right Side - Actions and User */}
          <div className="flex items-center space-x-3">
            {/* New Chat Button */}
            {currentView === 'dashboard' && (
              <Button
                onClick={onNewChat}
                size="sm"
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ny Chat
              </Button>
            )}

            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(true)}
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile?.avatarUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-sm">
                      {userProfile?.displayName?.charAt(0) || user?.email?.charAt(0) || 'J'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">
                      {userProfile?.displayName || user?.displayName || 'Jonas'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">
                    {userProfile?.displayName || 'Jonas Abde'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Foodtruck Fiesta ApS
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowProfile(true)}>
                  <User className="h-4 w-4 mr-2" />
                  Profil & Indstillinger
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewChange('tasks')}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Mine Opgaver
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewChange('knowledge')}>
                  <Database className="h-4 w-4 mr-2" />
                  Knowledge Base
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Log ud
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Navigation */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewChange('dashboard')}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewChange('history')}>
                    <History className="h-4 w-4 mr-2" />
                    Historik
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewChange('tasks')}>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Opgaver
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewChange('knowledge')}>
                    <Database className="h-4 w-4 mr-2" />
                    Knowledge
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Center */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onNotificationRead={loadNotificationCount}
      />

      {/* Profile Settings */}
      <ProfileSettings
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        userProfile={userProfile}
        onProfileUpdated={loadUserProfile}
      />
    </header>
  )
}