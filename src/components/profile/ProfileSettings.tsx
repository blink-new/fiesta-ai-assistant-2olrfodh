import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  User, 
  Camera, 
  Save, 
  Bell, 
  Moon, 
  Sun,
  Globe,
  Shield,
  Trash2,
  Upload
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import blink from '@/blink/client'

interface UserProfile {
  id: string
  userId: string
  displayName: string
  avatarUrl: string
  bio: string
  preferences: string
}

interface ProfileSettingsProps {
  isOpen: boolean
  onClose: () => void
  userProfile: UserProfile | null
  onProfileUpdated: () => void
}

export function ProfileSettings({ isOpen, onClose, userProfile, onProfileUpdated }: ProfileSettingsProps) {
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '')
  const [bio, setBio] = useState(userProfile?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatarUrl || '')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Parse preferences
  const preferences = userProfile?.preferences 
    ? JSON.parse(userProfile.preferences) 
    : { theme: 'light', notifications: true, language: 'da' }

  const [theme, setTheme] = useState(preferences.theme || 'light')
  const [notifications, setNotifications] = useState(preferences.notifications !== false)
  const [language, setLanguage] = useState(preferences.language || 'da')

  const handleSave = async () => {
    if (!userProfile?.userId) return

    setLoading(true)
    try {
      const updatedPreferences = {
        theme,
        notifications,
        language
      }

      const updateData = {
        displayName: displayName.trim() || 'Jonas',
        bio: bio.trim(),
        avatarUrl,
        preferences: JSON.stringify(updatedPreferences)
      }

      if (userProfile.id) {
        // Update existing profile
        await blink.db.userProfiles.update(userProfile.id, updateData)
      } else {
        // Create new profile
        await blink.db.userProfiles.create({
          id: `profile_${Date.now()}`,
          userId: userProfile.userId,
          ...updateData
        })
      }

      toast({
        title: "Profil opdateret",
        description: "Dine indstillinger er blevet gemt.",
      })

      onProfileUpdated()
      onClose()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Fejl",
        description: "Kunne ikke gemme profil indstillinger.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ugyldig filtype",
        description: "Vælg venligst et billede (JPG, PNG, etc.)",
        variant: "destructive"
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Fil for stor",
        description: "Billedet må maksimalt være 5MB",
        variant: "destructive"
      })
      return
    }

    setUploading(true)
    try {
      const { publicUrl } = await blink.storage.upload(
        file,
        `avatars/${userProfile?.userId}_${Date.now()}.${file.name.split('.').pop()}`,
        { upsert: true }
      )

      setAvatarUrl(publicUrl)
      toast({
        title: "Billede uploadet",
        description: "Dit profilbillede er blevet opdateret.",
      })
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast({
        title: "Upload fejl",
        description: "Kunne ikke uploade billedet. Prøv igen.",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl('')
    toast({
      title: "Profilbillede fjernet",
      description: "Dit profilbillede er blevet fjernet.",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Profil & Indstillinger</span>
          </DialogTitle>
          <DialogDescription>
            Administrer din profil og tilpas FiestaAI til dine behov
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profil Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xl">
                      {displayName?.charAt(0) || 'J'}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Klik på kamera-ikonet for at uploade et nyt profilbillede
                  </p>
                  {avatarUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Fjern billede
                    </Button>
                  )}
                </div>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Navn</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Jonas Abde"
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Fortæl lidt om dig selv..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preferences Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Indstillinger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Tema</Label>
                  <p className="text-sm text-muted-foreground">
                    Vælg mellem lyst og mørkt tema
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Sun className="h-4 w-4" />
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  />
                  <Moon className="h-4 w-4" />
                </div>
              </div>

              <Separator />

              {/* Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Notifikationer</Label>
                  <p className="text-sm text-muted-foreground">
                    Modtag påmindelser og vigtige opdateringer
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Bell className="h-4 w-4" />
                  <Switch
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  />
                </div>
              </div>

              <Separator />

              {/* Language */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Sprog</Label>
                  <p className="text-sm text-muted-foreground">
                    Vælg dit foretrukne sprog
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="px-3 py-1 border rounded-md bg-background"
                  >
                    <option value="da">Dansk</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Info Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Virksomhedsinfo</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Virksomhed</Label>
                  <p className="font-medium">Foodtruck Fiesta ApS</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">CVR</Label>
                  <p className="font-medium">44371901</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Telefon</Label>
                  <p className="font-medium">+45 22 65 02 26</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">ftfiestaa@gmail.com</p>
                </div>
              </div>
              
              <div className="pt-2">
                <Label className="text-muted-foreground">Vogne</Label>
                <div className="flex space-x-2 mt-1">
                  <div className="px-3 py-1 bg-black text-white rounded-full text-xs flex items-center space-x-1">
                    <span>🔥</span>
                    <span>Shawarma Wagon</span>
                  </div>
                  <div className="px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-xs flex items-center space-x-1">
                    <span>🍗</span>
                    <span>Grill Wagon</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuller
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Gemmer...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>Gem ændringer</span>
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}