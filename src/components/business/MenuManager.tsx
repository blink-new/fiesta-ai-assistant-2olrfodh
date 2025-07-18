import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Download,
  Flame,
  ChefHat,
  DollarSign,
  AlertTriangle
} from 'lucide-react'
import blink from '@/blink/client'

interface MenuItem {
  id: string
  userId: string
  wagon: 'shawarma' | 'grill'
  name: string
  description: string
  price: number
  category: string
  isAvailable: boolean
  allergens: string
  createdAt: string
  updatedAt: string
}

export function MenuManager() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [isGeneratingMenu, setIsGeneratingMenu] = useState(false)
  const [newItem, setNewItem] = useState({
    wagon: 'shawarma' as 'shawarma' | 'grill',
    name: '',
    description: '',
    price: 0,
    category: 'Hovedret',
    allergens: ''
  })

  useEffect(() => {
    loadMenuItems()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMenuItems = async () => {
    try {
      const user = await blink.auth.me()
      const items = await blink.db.menuItems.list({
        where: { userId: user.id },
        orderBy: { wagon: 'asc', category: 'asc', name: 'asc' }
      })

      setMenuItems(items.map(item => ({
        id: item.id,
        userId: item.userId,
        wagon: item.wagon as 'shawarma' | 'grill',
        name: item.name,
        description: item.description || '',
        price: item.price || 0,
        category: item.category || 'Hovedret',
        isAvailable: Number(item.isAvailable) > 0,
        allergens: item.allergens || '',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })))

      // If no items exist, create default menu
      if (items.length === 0) {
        await createDefaultMenu(user.id)
        setTimeout(() => loadMenuItems(), 1000)
      }
    } catch (error) {
      console.error('Error loading menu items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createDefaultMenu = async (userId: string) => {
    const defaultItems = [
      // Shawarma Wagon
      { wagon: 'shawarma', name: 'Rulle m. Flankesteak Shawarma', description: 'Hjemmelavet shawarma med friske grøntsager og sauce', price: 8500, category: 'Hovedret', allergens: 'gluten' },
      { wagon: 'shawarma', name: 'Rulle m. Falafel (vegan)', description: 'Sprøde falafel med friske grøntsager og tahini', price: 7500, category: 'Hovedret', allergens: 'sesam' },
      { wagon: 'shawarma', name: 'Shawarma Box', description: 'Shawarma serveret med pommes frites og salat', price: 9500, category: 'Hovedret', allergens: 'gluten' },
      { wagon: 'shawarma', name: 'Falafel Box', description: 'Falafel serveret med pommes frites og salat', price: 8500, category: 'Hovedret', allergens: 'sesam' },
      { wagon: 'shawarma', name: 'Sambosa', description: 'Sprøde sambosa med kylling, okse eller spinat-feta', price: 4500, category: 'Forret', allergens: 'gluten,æg' },
      { wagon: 'shawarma', name: 'Pommes Frites', description: 'Sprøde pommes frites', price: 3500, category: 'Tilbehør', allergens: '' },
      
      // Grill Wagon
      { wagon: 'grill', name: 'Rulle m. Kebabspyd', description: 'Grillet kebabspyd med friske grøntsager', price: 8500, category: 'Hovedret', allergens: 'gluten' },
      { wagon: 'grill', name: 'Rulle m. Kyllingespyd', description: 'Marineret kyllingespyd med grøntsager', price: 8000, category: 'Hovedret', allergens: 'gluten' },
      { wagon: 'grill', name: 'Grill Box', description: 'Grillet kød serveret med ris og salat', price: 9500, category: 'Hovedret', allergens: '' },
      { wagon: 'grill', name: 'Grillet Kyllingelår', description: 'Saftige kyllingelår grillet til perfektion', price: 7500, category: 'Hovedret', allergens: '' },
      { wagon: 'grill', name: 'Libanesisk Mini-Pizza', description: 'Traditionel libanesisk pizza', price: 6500, category: 'Forret', allergens: 'gluten' },
      { wagon: 'grill', name: 'Nachos', description: 'Sprøde nachos med ost eller kylling', price: 5500, category: 'Tilbehør', allergens: 'mælk' }
    ]

    await blink.db.menuItems.createMany(
      defaultItems.map(item => ({
        id: `menu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        ...item,
        isAvailable: true
      }))
    )
  }

  const addMenuItem = async () => {
    if (!newItem.name.trim()) return

    try {
      const user = await blink.auth.me()
      const item = await blink.db.menuItems.create({
        id: `menu_${Date.now()}`,
        userId: user.id,
        wagon: newItem.wagon,
        name: newItem.name,
        description: newItem.description,
        price: newItem.price * 100, // Store in øre
        category: newItem.category,
        allergens: newItem.allergens,
        isAvailable: true
      })

      await loadMenuItems()
      setNewItem({
        wagon: 'shawarma',
        name: '',
        description: '',
        price: 0,
        category: 'Hovedret',
        allergens: ''
      })
    } catch (error) {
      console.error('Error adding menu item:', error)
    }
  }

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    try {
      await blink.db.menuItems.update(id, {
        ...updates,
        price: updates.price ? updates.price * 100 : undefined // Convert to øre
      })
      await loadMenuItems()
      setEditingItem(null)
    } catch (error) {
      console.error('Error updating menu item:', error)
    }
  }

  const deleteMenuItem = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette dette menupunkt?')) return

    try {
      await blink.db.menuItems.delete(id)
      await loadMenuItems()
    } catch (error) {
      console.error('Error deleting menu item:', error)
    }
  }

  const generateMenuPDF = async (wagon: 'shawarma' | 'grill' | 'both') => {
    setIsGeneratingMenu(true)
    try {
      const filteredItems = wagon === 'both' 
        ? menuItems 
        : menuItems.filter(item => item.wagon === wagon)

      const menuContent = `Generer et smukt A3 menukort for Foodtruck Fiesta ApS med følgende menupunkter:

${wagon === 'shawarma' ? '🌯 SHAWARMA WAGON' : wagon === 'grill' ? '🍗 GRILL WAGON' : '🔥 FOODTRUCK FIESTA - BEGGE VOGNE'}

${filteredItems.map(item => `
${item.name}
${item.description}
Allergener: ${item.allergens || 'Ingen'}
`).join('\n')}

Design krav:
- A3 format uden priser (brug placeholder «Kuvertpris»)
- Shawarma Wagon: Sort baggrund med orange flammer (#F8360C)
- Grill Wagon: Rød/orange gradient (#FF9800 til #FF5722)
- Appetitfoto-pladsholdere
- Foodtruck Fiesta ApS logo
- Kontaktinfo: +45 22 65 02 26, ftfiestaa@gmail.com
- Mellemøstlig street food tema

Lav en detaljeret beskrivelse af menukortet som kan bruges til design.`

      const { text } = await blink.ai.generateText({
        prompt: menuContent,
        model: 'gpt-4.1-mini'
      })

      // In a real app, this would generate an actual PDF
      alert(`Menukort design genereret! 🎨\n\n${text.substring(0, 200)}...`)

    } catch (error) {
      console.error('Error generating menu:', error)
    } finally {
      setIsGeneratingMenu(false)
    }
  }

  const categories = ['Forret', 'Hovedret', 'Tilbehør', 'Dessert', 'Drikkevarer']
  const allergenOptions = ['gluten', 'mælk', 'æg', 'nødder', 'sesam', 'soja', 'fisk', 'skaldyr']

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
              <ChefHat className="h-5 w-5" />
              <span>Menu Manager</span>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => generateMenuPDF('shawarma')}
                disabled={isGeneratingMenu}
              >
                <Download className="h-4 w-4 mr-2" />
                Shawarma Menu
              </Button>
              <Button 
                variant="outline" 
                onClick={() => generateMenuPDF('grill')}
                disabled={isGeneratingMenu}
              >
                <Download className="h-4 w-4 mr-2" />
                Grill Menu
              </Button>
              <Button 
                onClick={() => generateMenuPDF('both')}
                disabled={isGeneratingMenu}
              >
                <Download className="h-4 w-4 mr-2" />
                Komplet Menu
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="shawarma" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="shawarma" className="flex items-center space-x-2">
                <span>🌯</span>
                <span>Shawarma Wagon</span>
              </TabsTrigger>
              <TabsTrigger value="grill" className="flex items-center space-x-2">
                <span>🍗</span>
                <span>Grill Wagon</span>
              </TabsTrigger>
              <TabsTrigger value="add" className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Tilføj Ny</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shawarma" className="space-y-4">
              <div className="grid gap-4">
                {menuItems.filter(item => item.wagon === 'shawarma').map(item => (
                  <Card key={item.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold">{item.name}</h3>
                            <Badge variant={item.isAvailable ? 'default' : 'secondary'}>
                              {item.isAvailable ? 'Tilgængelig' : 'Ikke tilgængelig'}
                            </Badge>
                            <Badge variant="outline">{item.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="flex items-center space-x-1">
                              <DollarSign className="h-3 w-3" />
                              <span>{(item.price / 100).toFixed(2)} kr</span>
                            </span>
                            {item.allergens && (
                              <span className="flex items-center space-x-1 text-orange-600">
                                <AlertTriangle className="h-3 w-3" />
                                <span>{item.allergens}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingItem(item)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteMenuItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="grill" className="space-y-4">
              <div className="grid gap-4">
                {menuItems.filter(item => item.wagon === 'grill').map(item => (
                  <Card key={item.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold">{item.name}</h3>
                            <Badge variant={item.isAvailable ? 'default' : 'secondary'}>
                              {item.isAvailable ? 'Tilgængelig' : 'Ikke tilgængelig'}
                            </Badge>
                            <Badge variant="outline">{item.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="flex items-center space-x-1">
                              <DollarSign className="h-3 w-3" />
                              <span>{(item.price / 100).toFixed(2)} kr</span>
                            </span>
                            {item.allergens && (
                              <span className="flex items-center space-x-1 text-orange-600">
                                <AlertTriangle className="h-3 w-3" />
                                <span>{item.allergens}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingItem(item)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteMenuItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="add" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tilføj Nyt Menupunkt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="wagon">Vogn</Label>
                      <Select value={newItem.wagon} onValueChange={(value) => setNewItem(prev => ({ ...prev, wagon: value as 'shawarma' | 'grill' }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="shawarma">🌯 Shawarma Wagon</SelectItem>
                          <SelectItem value="grill">🍗 Grill Wagon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="category">Kategori</Label>
                      <Select value={newItem.category} onValueChange={(value) => setNewItem(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="name">Navn</Label>
                    <Input
                      id="name"
                      value={newItem.name}
                      onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="F.eks. Rulle m. Shawarma"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Beskrivelse</Label>
                    <Textarea
                      id="description"
                      value={newItem.description}
                      onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Beskrivelse af retten..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Pris (kr)</Label>
                      <Input
                        id="price"
                        type="number"
                        value={newItem.price}
                        onChange={(e) => setNewItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                        step="0.50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="allergens">Allergener</Label>
                      <Input
                        id="allergens"
                        value={newItem.allergens}
                        onChange={(e) => setNewItem(prev => ({ ...prev, allergens: e.target.value }))}
                        placeholder="gluten, mælk, nødder..."
                      />
                    </div>
                  </div>

                  <Button onClick={addMenuItem} disabled={!newItem.name.trim()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tilføj Menupunkt
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingItem && (
        <Card className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="font-semibold mb-4">Rediger Menupunkt</h3>
            <div className="space-y-4">
              <div>
                <Label>Navn</Label>
                <Input
                  value={editingItem.name}
                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div>
                <Label>Beskrivelse</Label>
                <Textarea
                  value={editingItem.description}
                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pris (kr)</Label>
                  <Input
                    type="number"
                    value={editingItem.price / 100}
                    onChange={(e) => setEditingItem(prev => prev ? { ...prev, price: parseFloat(e.target.value) * 100 || 0 } : null)}
                    step="0.50"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingItem.isAvailable}
                    onCheckedChange={(checked) => setEditingItem(prev => prev ? { ...prev, isAvailable: checked } : null)}
                  />
                  <Label>Tilgængelig</Label>
                </div>
              </div>
              <div>
                <Label>Allergener</Label>
                <Input
                  value={editingItem.allergens}
                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, allergens: e.target.value } : null)}
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-6">
              <Button onClick={() => updateMenuItem(editingItem.id, editingItem)}>
                Gem Ændringer
              </Button>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Annuller
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}