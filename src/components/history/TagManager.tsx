import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Plus, 
  X, 
  Tag, 
  Palette,
  Trash2,
  Edit3
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import blink from '@/blink/client'

interface ChatTag {
  id: string
  name: string
  color: string
  usageCount: number
  userId: string
}

interface TagManagerProps {
  tags: ChatTag[]
  onClose: () => void
  onTagsUpdated: () => void
}

const TAG_COLORS = [
  '#F8360C', // Primary
  '#FF9800', // Accent
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#F59E0B', // Yellow
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#84CC16'  // Lime
]

export function TagManager({ tags, onClose, onTagsUpdated }: TagManagerProps) {
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [editingTag, setEditingTag] = useState<ChatTag | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    setLoading(true)
    try {
      const user = await blink.auth.me()
      await blink.db.chatTags.create({
        id: `tag_${Date.now()}`,
        userId: user.id,
        name: newTagName.trim(),
        color: newTagColor,
        usageCount: 0
      })

      setNewTagName('')
      setNewTagColor(TAG_COLORS[0])
      onTagsUpdated()
    } catch (error) {
      console.error('Error creating tag:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTag = async (tag: ChatTag, updates: Partial<ChatTag>) => {
    setLoading(true)
    try {
      await blink.db.chatTags.update(tag.id, updates)
      setEditingTag(null)
      onTagsUpdated()
    } catch (error) {
      console.error('Error updating tag:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Er du sikker på, at du vil slette dette tag?')) return

    setLoading(true)
    try {
      await blink.db.chatTags.delete(tagId)
      onTagsUpdated()
    } catch (error) {
      console.error('Error deleting tag:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Tag className="h-5 w-5" />
            <span>Tag Manager</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Tag */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Opret nyt tag</h3>
              <div className="flex items-center space-x-3">
                <Input
                  placeholder="Tag navn..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
                />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="px-3">
                      <div 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: newTagColor }}
                      />
                      <Palette className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <div className="grid grid-cols-5 gap-2 p-2">
                      {TAG_COLORS.map(color => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            newTagColor === color 
                              ? 'border-gray-900 scale-110' 
                              : 'border-gray-200 hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewTagColor(color)}
                        />
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button 
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || loading}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Opret
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Existing Tags */}
          <div>
            <h3 className="font-medium mb-3">Eksisterende tags ({tags.length})</h3>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {tags.map(tag => (
                  <Card key={tag.id} className="transition-all hover:shadow-sm">
                    <CardContent className="p-3">
                      {editingTag?.id === tag.id ? (
                        <div className="flex items-center space-x-3">
                          <Input
                            value={editingTag.name}
                            onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                            className="flex-1"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateTag(tag, { name: editingTag.name, color: editingTag.color })
                              }
                            }}
                          />
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="px-2">
                                <div 
                                  className="w-4 h-4 rounded-full" 
                                  style={{ backgroundColor: editingTag.color }}
                                />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <div className="grid grid-cols-5 gap-2 p-2">
                                {TAG_COLORS.map(color => (
                                  <button
                                    key={color}
                                    className={`w-6 h-6 rounded-full border transition-all ${
                                      editingTag.color === color 
                                        ? 'border-gray-900 scale-110' 
                                        : 'border-gray-200 hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setEditingTag({ ...editingTag, color })}
                                  />
                                ))}
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <Button 
                            size="sm" 
                            onClick={() => handleUpdateTag(tag, { name: editingTag.name, color: editingTag.color })}
                            disabled={loading}
                          >
                            Gem
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setEditingTag(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="font-medium">{tag.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {tag.usageCount} gange
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingTag(tag)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTag(tag.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {tags.length === 0 && (
                  <Card className="p-6 text-center">
                    <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Ingen tags oprettet endnu</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Opret dit første tag ovenfor
                    </p>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Luk
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}