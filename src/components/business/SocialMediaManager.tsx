import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Plus, 
  Calendar as CalendarIcon,
  Send,
  Image,
  Hash,
  TrendingUp,
  Users,
  Heart,
  MessageCircle,
  Share,
  Eye
} from 'lucide-react'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import blink from '@/blink/client'

interface SocialPost {
  id: string
  userId: string
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter'
  content: string
  imageUrl?: string
  scheduledDate?: string
  status: 'draft' | 'scheduled' | 'published'
  engagementStats?: {
    likes: number
    comments: number
    shares: number
    views: number
  }
  createdAt: string
  updatedAt: string
}

const platformIcons = {
  facebook: '📘',
  instagram: '📷',
  linkedin: '💼',
  twitter: '🐦'
}

const platformColors = {
  facebook: 'bg-blue-100 text-blue-800',
  instagram: 'bg-pink-100 text-pink-800',
  linkedin: 'bg-blue-100 text-blue-800',
  twitter: 'bg-sky-100 text-sky-800'
}

export function SocialMediaManager() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [newPost, setNewPost] = useState({
    platform: 'instagram' as 'facebook' | 'instagram' | 'linkedin' | 'twitter',
    content: '',
    imageUrl: '',
    scheduledDate: undefined as Date | undefined
  })

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    try {
      const user = await blink.auth.me()
      const postsData = await blink.db.socialPosts.list({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        limit: 50
      })

      setPosts(postsData.map(post => ({
        id: post.id,
        userId: post.userId,
        platform: post.platform as SocialPost['platform'],
        content: post.content,
        imageUrl: post.imageUrl,
        scheduledDate: post.scheduledDate,
        status: post.status as SocialPost['status'],
        engagementStats: post.engagementStats ? JSON.parse(post.engagementStats) : undefined,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      })))
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateContentIdeas = async () => {
    setIsGenerating(true)
    try {
      const prompt = `Generer 5 kreative sociale medier indlæg for Foodtruck Fiesta ApS:

BRAND INFO:
- Foodtruck Fiesta ApS - Mellemøstlig street food
- 2 vogne: Shawarma Wagon (🌯) & Grill Wagon (🍗)
- Ejer: Jonas Abde
- Specialitet: Autentisk mellemøstlig mad til events

CONTENT TYPER:
1. Menu Monday - vis dagens speciale
2. Behind the Scenes - forberedelse/grilling
3. Customer Spotlight - tilfredse kunder
4. Event Announcement - kommende bookings
5. Food Facts - interessante facts om mellemøstlig mad

For hvert indlæg, inkluder:
- Platform (Instagram/Facebook/LinkedIn)
- Tekst (max 150 ord)
- Hashtags (#FoodtruckFiesta #MellemøstPåHjul #StreetFoodDK)
- Billede-forslag
- Bedste posting tid

Tone: Venlig, autentisk, let humor, dansk sprog`

      const { text } = await blink.ai.generateText({
        prompt,
        model: 'gpt-4.1-mini'
      })

      // Show generated ideas in a modal or alert
      alert(`Content idéer genereret! 🎨\n\n${text}`)

    } catch (error) {
      console.error('Error generating content:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const createPost = async () => {
    if (!newPost.content.trim()) return

    try {
      const user = await blink.auth.me()
      await blink.db.socialPosts.create({
        id: `post_${Date.now()}`,
        userId: user.id,
        platform: newPost.platform,
        content: newPost.content,
        imageUrl: newPost.imageUrl || undefined,
        scheduledDate: newPost.scheduledDate?.toISOString(),
        status: newPost.scheduledDate ? 'scheduled' : 'draft'
      })

      await loadPosts()
      setNewPost({
        platform: 'instagram',
        content: '',
        imageUrl: '',
        scheduledDate: undefined
      })
    } catch (error) {
      console.error('Error creating post:', error)
    }
  }

  const updatePostStatus = async (postId: string, status: SocialPost['status']) => {
    try {
      await blink.db.socialPosts.update(postId, { status })
      await loadPosts()
    } catch (error) {
      console.error('Error updating post:', error)
    }
  }

  const deletePost = async (postId: string) => {
    if (!confirm('Er du sikker på at du vil slette dette indlæg?')) return

    try {
      await blink.db.socialPosts.delete(postId)
      await loadPosts()
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  const getStatusColor = (status: SocialPost['status']) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Hash className="h-5 w-5" />
              <span>Social Media Manager</span>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={generateContentIdeas}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Genererer...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Generer Idéer
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="create">
                <Plus className="h-4 w-4 mr-2" />
                Opret Indlæg
              </TabsTrigger>
              <TabsTrigger value="scheduled">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Planlagte
              </TabsTrigger>
              <TabsTrigger value="published">
                <Send className="h-4 w-4 mr-2" />
                Publicerede
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Nyt Indlæg</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="platform">Platform</Label>
                      <Select 
                        value={newPost.platform} 
                        onValueChange={(value) => setNewPost(prev => ({ ...prev, platform: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instagram">📷 Instagram</SelectItem>
                          <SelectItem value="facebook">📘 Facebook</SelectItem>
                          <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                          <SelectItem value="twitter">🐦 Twitter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Planlæg Dato (valgfri)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newPost.scheduledDate ? (
                              format(newPost.scheduledDate, 'PPP', { locale: da })
                            ) : (
                              <span>Vælg dato</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={newPost.scheduledDate}
                            onSelect={(date) => setNewPost(prev => ({ ...prev, scheduledDate: date }))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="content">Indhold</Label>
                    <Textarea
                      id="content"
                      value={newPost.content}
                      onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Skriv dit sociale medier indlæg her... 🔥"
                      rows={4}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {newPost.content.length}/280 tegn
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="imageUrl">Billede URL (valgfri)</Label>
                    <Input
                      id="imageUrl"
                      value={newPost.imageUrl}
                      onChange={(e) => setNewPost(prev => ({ ...prev, imageUrl: e.target.value }))}
                      placeholder="https://example.com/billede.jpg"
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button onClick={createPost} disabled={!newPost.content.trim()}>
                      {newPost.scheduledDate ? (
                        <>
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Planlæg Indlæg
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Gem som Kladde
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scheduled" className="space-y-4">
              <div className="grid gap-4">
                {posts.filter(post => post.status === 'scheduled').map(post => (
                  <Card key={post.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={platformColors[post.platform]}>
                              {platformIcons[post.platform]} {post.platform}
                            </Badge>
                            <Badge className={getStatusColor(post.status)}>
                              {post.status}
                            </Badge>
                            {post.scheduledDate && (
                              <span className="text-sm text-muted-foreground">
                                📅 {format(new Date(post.scheduledDate), 'PPP', { locale: da })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm mb-2">{post.content}</p>
                          {post.imageUrl && (
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <Image className="h-3 w-3" />
                              <span>Billede vedhæftet</span>
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updatePostStatus(post.id, 'published')}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Publicer Nu
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deletePost(post.id)}
                          >
                            Slet
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {posts.filter(post => post.status === 'scheduled').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Ingen planlagte indlæg</p>
                    <p className="text-sm">Opret et nyt indlæg med en planlagt dato</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="published" className="space-y-4">
              <div className="grid gap-4">
                {posts.filter(post => post.status === 'published').map(post => (
                  <Card key={post.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={platformColors[post.platform]}>
                              {platformIcons[post.platform]} {post.platform}
                            </Badge>
                            <Badge className={getStatusColor(post.status)}>
                              {post.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(post.createdAt), 'PPP', { locale: da })}
                            </span>
                          </div>
                          <p className="text-sm mb-3">{post.content}</p>
                          
                          {/* Engagement Stats */}
                          {post.engagementStats && (
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span className="flex items-center space-x-1">
                                <Heart className="h-3 w-3" />
                                <span>{post.engagementStats.likes}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <MessageCircle className="h-3 w-3" />
                                <span>{post.engagementStats.comments}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Share className="h-3 w-3" />
                                <span>{post.engagementStats.shares}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Eye className="h-3 w-3" />
                                <span>{post.engagementStats.views}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {posts.filter(post => post.status === 'published').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Send className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Ingen publicerede indlæg endnu</p>
                    <p className="text-sm">Dine publicerede indlæg vil vises her</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Send className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Publicerede</p>
                <p className="text-2xl font-bold">{posts.filter(p => p.status === 'published').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <CalendarIcon className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Planlagte</p>
                <p className="text-2xl font-bold">{posts.filter(p => p.status === 'scheduled').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Plus className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Kladder</p>
                <p className="text-2xl font-bold">{posts.filter(p => p.status === 'draft').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Total Engagement</p>
                <p className="text-2xl font-bold">
                  {posts.reduce((total, post) => 
                    total + (post.engagementStats?.likes || 0) + 
                    (post.engagementStats?.comments || 0) + 
                    (post.engagementStats?.shares || 0), 0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}