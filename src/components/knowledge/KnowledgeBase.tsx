import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Database, 
  Upload, 
  Search, 
  FileText, 
  Image, 
  File,
  Trash2,
  Download,
  Eye,
  Plus,
  Filter,
  Tag,
  Calendar,
  FileType,
  HardDrive,
  CheckCircle,
  AlertCircle,
  Clock,
  Brain
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { GoogleCalendarSetup } from '@/components/integrations/GoogleCalendarSetup'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import blink from '@/blink/client'

interface KnowledgeFile {
  id: string
  userId: string
  filename: string
  fileType: string
  fileSize: number
  content?: string
  summary?: string
  tags?: string
  uploadUrl?: string
  createdAt: Date
  updatedAt: Date
}

export function KnowledgeBase() {
  const [files, setFiles] = useState<KnowledgeFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<'all' | string>('all')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [user, setUser] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged(async (state) => {
      setUser(state.user)
      if (state.user) {
        await loadFiles(state.user.id)
      }
      setLoading(false)
    })
    return unsubscribe
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadFiles = async (userId: string) => {
    try {
      const fileData = await blink.db.knowledgeBase.list({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        limit: 100
      })

      setFiles(fileData.map(file => ({
        id: file.id,
        userId: file.userId,
        filename: file.filename,
        fileType: file.fileType,
        fileSize: file.fileSize,
        content: file.content,
        summary: file.summary,
        tags: file.tags,
        uploadUrl: file.uploadUrl,
        createdAt: new Date(file.createdAt),
        updatedAt: new Date(file.updatedAt)
      })))

      // Create some sample files if none exist
      if (fileData.length === 0) {
        await createSampleFiles(userId)
        setTimeout(() => loadFiles(userId), 1000)
      }
    } catch (error) {
      console.error('Error loading files:', error)
    }
  }

  const createSampleFiles = async (userId: string) => {
    try {
      await blink.db.knowledgeBase.createMany([
        {
          id: `kb_${Date.now()}_1`,
          userId,
          filename: 'Foodtruck_Menu_2025.pdf',
          fileType: 'application/pdf',
          fileSize: 245760,
          content: 'Shawarma Wagon Menu: Flankesteak Shawarma Rulle, Falafel Rulle (vegan), Shawarma Box, Sambosa...',
          summary: 'Komplet menukort for begge vogne med priser og allergener',
          tags: 'menu,priser,allergener,2025',
          uploadUrl: 'https://example.com/menu.pdf'
        },
        {
          id: `kb_${Date.now()}_2`,
          userId,
          filename: 'HACCP_Risikoanalyse.docx',
          fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileSize: 156432,
          content: 'Kritiske kontrolpunkter: Køling ≤4°C, Varmhold ≥60°C, Sambosa frysning...',
          summary: 'HACCP risikoanalyse for mobile køkkener med kritiske punkter',
          tags: 'haccp,fødevaresikkerhed,compliance',
          uploadUrl: 'https://example.com/haccp.docx'
        },
        {
          id: `kb_${Date.now()}_3`,
          userId,
          filename: 'Event_Pipeline_2025.xlsx',
          fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          fileSize: 89234,
          content: 'Roskilde Festival 17-21 juni, Samsø Festival 16-19 juli, Aalborg Regatta...',
          summary: 'Komplet oversigt over bookede og potentielle events for 2025',
          tags: 'events,pipeline,2025,booking',
          uploadUrl: 'https://example.com/pipeline.xlsx'
        }
      ])
    } catch (error) {
      console.error('Error creating sample files:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (!selectedFiles || !user?.id) return

    setUploading(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "Fil for stor",
            description: `${file.name} er større end 10MB`,
            variant: "destructive"
          })
          continue
        }

        // Upload file to storage
        const { publicUrl } = await blink.storage.upload(
          file,
          `knowledge/${user.id}/${Date.now()}_${file.name}`,
          { 
            upsert: true,
            onProgress: (percent) => {
              setUploadProgress(Math.round((i / selectedFiles.length + percent / 100 / selectedFiles.length) * 100))
            }
          }
        )

        // Extract text content for supported file types
        let content = ''
        let summary = ''
        
        try {
          if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
            content = await file.text()
            
            // Generate AI summary
            const { text } = await blink.ai.generateText({
              prompt: `Lav en kort dansk sammenfatning (max 100 ord) af dette dokument:\n\n${content.substring(0, 2000)}`,
              model: 'gpt-4.1-mini'
            })
            summary = text.trim()
          } else if (file.type.startsWith('image/')) {
            // For images, we could use OCR or image analysis
            summary = `Billede: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
          } else {
            // For other files, extract basic info
            summary = `Dokument: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
          }
        } catch (error) {
          console.error('Error processing file content:', error)
          summary = `Fil: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
        }

        // Auto-generate tags based on filename and content
        const tags = generateTags(file.name, content)

        // Save to database
        const newFile = {
          id: `kb_${Date.now()}_${i}`,
          userId: user.id,
          filename: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          content: content.substring(0, 5000), // Limit content size
          summary,
          tags: tags.join(','),
          uploadUrl: publicUrl
        }

        await blink.db.knowledgeBase.create(newFile)

        // 🔥 AUTOMATISK AI INTEGRATION - Tilføj fil til AI's vidensbase
        await integrateWithAI(newFile, content)
        
        setFiles(prev => [
          {
            ...newFile,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          ...prev
        ])
      }

      toast({
        title: "Filer uploadet",
        description: `${selectedFiles.length} fil(er) er blevet tilføjet til knowledge base`,
      })

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error uploading files:', error)
      toast({
        title: "Upload fejl",
        description: "Kunne ikke uploade filer. Prøv igen.",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const generateTags = (filename: string, content: string): string[] => {
    const tags = new Set<string>()
    
    // Tags from filename
    const name = filename.toLowerCase()
    if (name.includes('menu')) tags.add('menu')
    if (name.includes('haccp') || name.includes('sikkerhed')) tags.add('fødevaresikkerhed')
    if (name.includes('event') || name.includes('booking')) tags.add('events')
    if (name.includes('regnskab') || name.includes('økonomi')) tags.add('økonomi')
    if (name.includes('marketing') || name.includes('social')) tags.add('marketing')
    if (name.includes('2025')) tags.add('2025')
    
    // Tags from content
    const text = content.toLowerCase()
    if (text.includes('shawarma') || text.includes('falafel')) tags.add('menu')
    if (text.includes('festival') || text.includes('event')) tags.add('events')
    if (text.includes('pris') || text.includes('kr')) tags.add('priser')
    if (text.includes('allergi')) tags.add('allergener')
    if (text.includes('kunde') || text.includes('service')) tags.add('kundeservice')
    
    return Array.from(tags)
  }

  // 🔥 AUTOMATISK AI INTEGRATION - Integrerer uploadede filer med AI'ens vidensbase
  const integrateWithAI = async (fileData: any, content: string) => {
    try {
      // Opret en AI-kontekst post der gør filen tilgængelig for AI'en
      await blink.db.aiKnowledge.create({
        id: `ai_${Date.now()}`,
        userId: fileData.userId,
        sourceType: 'file',
        sourceId: fileData.id,
        title: fileData.filename,
        content: content.substring(0, 10000), // Større indhold til AI
        summary: fileData.summary,
        tags: fileData.tags,
        metadata: JSON.stringify({
          fileType: fileData.fileType,
          fileSize: fileData.fileSize,
          uploadUrl: fileData.uploadUrl
        }),
        isActive: true
      })

      // Generer AI-embeddings for bedre søgning (simuleret)
      const { text: aiInsights } = await blink.ai.generateText({
        prompt: `Analyser dette dokument og lav en struktureret sammenfatning til AI-assistenten:

DOKUMENT: ${fileData.filename}
INDHOLD: ${content.substring(0, 2000)}

Lav en sammenfatning der inkluderer:
1. Hovedemner og nøgleord
2. Vigtige tal og data
3. Handlingsanvisninger
4. Relevante kontaktoplysninger
5. Datoer og deadlines

Formater som struktureret tekst der er let for AI at forstå og referere til.`,
        model: 'gpt-4.1-mini'
      })

      // Opdater AI-kontekst med insights
      await blink.db.aiKnowledge.update(`ai_${Date.now()}`, {
        aiInsights: aiInsights.trim()
      })

      console.log(`✅ Fil "${fileData.filename}" er nu integreret med AI'ens vidensbase`)
      
    } catch (error) {
      console.error('Fejl ved AI integration:', error)
      // Fejl skal ikke blokere fil upload
    }
  }

  const deleteFile = async (fileId: string) => {
    try {
      await blink.db.knowledgeBase.delete(fileId)
      setFiles(prev => prev.filter(file => file.id !== fileId))
      
      toast({
        title: "Fil slettet",
        description: "Filen er blevet fjernet fra knowledge base",
      })
    } catch (error) {
      console.error('Error deleting file:', error)
      toast({
        title: "Fejl",
        description: "Kunne ikke slette filen",
        variant: "destructive"
      })
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />
    if (fileType.includes('word') || fileType.includes('document')) return <FileText className="h-5 w-5 text-blue-600" />
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileText className="h-5 w-5 text-green-600" />
    if (fileType.startsWith('text/') || fileType.includes('markdown')) return <FileText className="h-5 w-5 text-gray-600" />
    return <File className="h-5 w-5 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const filteredFiles = files.filter(file => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!file.filename.toLowerCase().includes(query) && 
          !file.content?.toLowerCase().includes(query) &&
          !file.summary?.toLowerCase().includes(query) &&
          !file.tags?.toLowerCase().includes(query)) {
        return false
      }
    }

    // Type filter
    if (selectedType !== 'all' && !file.fileType.includes(selectedType)) {
      return false
    }

    return true
  })

  const fileStats = {
    total: files.length,
    totalSize: files.reduce((sum, file) => sum + file.fileSize, 0),
    images: files.filter(f => f.fileType.startsWith('image/')).length,
    documents: files.filter(f => f.fileType.includes('pdf') || f.fileType.includes('word') || f.fileType.includes('document')).length,
    spreadsheets: files.filter(f => f.fileType.includes('excel') || f.fileType.includes('spreadsheet')).length,
    text: files.filter(f => f.fileType.startsWith('text/') || f.fileType.includes('markdown')).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Database className="h-8 w-8 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground">Indlæser knowledge base...</p>
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
              <Database className="h-8 w-8 text-primary" />
              <span>Knowledge Base & Integrationer</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload filer og konfigurer integrationer til FiestaAI
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-gradient-to-r from-primary to-accent"
            >
              {uploading ? (
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Uploader...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>Upload Filer</span>
                </div>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploader filer...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="files" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="files">📁 Knowledge Base</TabsTrigger>
            <TabsTrigger value="integrations">🔗 Integrationer</TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{fileStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total filer</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{formatFileSize(fileStats.totalSize)}</p>
                  <p className="text-xs text-muted-foreground">Samlet størrelse</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{fileStats.documents}</p>
                  <p className="text-xs text-muted-foreground">Dokumenter</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Image className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{fileStats.images}</p>
                  <p className="text-xs text-muted-foreground">Billeder</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{files.filter(f => f.summary).length}</p>
                  <p className="text-xs text-muted-foreground">AI-analyseret</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Søg i filer, indhold og tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="all">Alle filtyper</option>
                <option value="pdf">PDF</option>
                <option value="word">Word dokumenter</option>
                <option value="excel">Excel ark</option>
                <option value="image">Billeder</option>
                <option value="text">Tekst filer</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Files List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Filer ({filteredFiles.length})</span>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Brain className="h-4 w-4" />
                <span>AI-understøttet søgning</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {filteredFiles.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchQuery || selectedType !== 'all' 
                        ? 'Ingen filer fundet' 
                        : 'Ingen filer uploadet endnu'
                      }
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery || selectedType !== 'all'
                        ? 'Prøv at justere dine søgekriterier'
                        : 'Upload dokumenter, billeder og andre filer for at bygge din knowledge base'
                      }
                    </p>
                    {!searchQuery && selectedType === 'all' && (
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gradient-to-r from-primary to-accent"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload første fil
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredFiles.map((file) => (
                    <Card key={file.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="mt-1">
                              {getFileIcon(file.fileType)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="font-medium truncate">{file.filename}</h3>
                                <Badge variant="outline" className="text-xs">
                                  {formatFileSize(file.fileSize)}
                                </Badge>
                              </div>
                              
                              {file.summary && (
                                <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                                  {file.summary}
                                </p>
                              )}
                              
                              {file.tags && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {file.tags.split(',').map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {tag.trim()}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {file.createdAt.toLocaleDateString('da-DK')}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <FileType className="h-3 w-3" />
                                  <span>{file.fileType.split('/')[1] || 'unknown'}</span>
                                </div>
                                {file.content && (
                                  <div className="flex items-center space-x-1">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    <span>Indekseret</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {file.uploadUrl && (
                                <DropdownMenuItem
                                  onClick={() => window.open(file.uploadUrl, '_blank')}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Vis fil
                                </DropdownMenuItem>
                              )}
                              {file.uploadUrl && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    const a = document.createElement('a')
                                    a.href = file.uploadUrl!
                                    a.download = file.filename
                                    a.click()
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => deleteFile(file.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Slet fil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Supported File Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Understøttede filtyper</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-red-500" />
                <span>PDF dokumenter</span>
              </div>
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>Word dokumenter</span>
              </div>
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-green-600" />
                <span>Excel ark</span>
              </div>
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-600" />
                <span>Tekst & Markdown</span>
              </div>
              <div className="flex items-center space-x-2">
                <Image className="h-4 w-4 text-purple-500" />
                <span>Billeder (JPG, PNG)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Image className="h-4 w-4 text-blue-500" />
                <span>GIF & WebP</span>
              </div>
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4 text-orange-500" />
                <span>AI-analyse</span>
              </div>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-primary" />
                <span>Fuld-tekst søgning</span>
              </div>
            </div>
          </CardContent>
        </Card>

          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <GoogleCalendarSetup />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}