import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Thermometer,
  FileText,
  Calendar,
  AlertCircle,
  Download,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import blink from '@/blink/client'

interface ComplianceItem {
  id: string
  userId: string
  category: 'haccp' | 'temperature' | 'cleaning' | 'training' | 'documentation'
  title: string
  description: string
  status: 'compliant' | 'warning' | 'non_compliant' | 'pending'
  dueDate?: string
  lastChecked?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

interface TemperatureLog {
  id: string
  userId: string
  location: 'shawarma_fridge' | 'grill_fridge' | 'hot_hold' | 'ambient'
  temperature: number
  timestamp: string
  withinRange: boolean
  notes?: string
}

export function ComplianceTracker() {
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([])
  const [temperatureLogs, setTemperatureLogs] = useState<TemperatureLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newTempLog, setNewTempLog] = useState({
    location: 'shawarma_fridge' as TemperatureLog['location'],
    temperature: 0,
    notes: ''
  })
  const { toast } = useToast()

  useEffect(() => {
    loadComplianceData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadComplianceData = async () => {
    try {
      const user = await blink.auth.me()
      
      // Load compliance items
      const complianceData = await blink.db.complianceItems.list({
        where: { userId: user.id },
        orderBy: { category: 'asc', dueDate: 'asc' }
      })

      setComplianceItems(complianceData.map(item => ({
        id: item.id,
        userId: item.userId,
        category: item.category as ComplianceItem['category'],
        title: item.title,
        description: item.description || '',
        status: item.status as ComplianceItem['status'],
        dueDate: item.dueDate,
        lastChecked: item.lastChecked,
        notes: item.notes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })))

      // Load temperature logs
      const tempData = await blink.db.temperatureLogs.list({
        where: { userId: user.id },
        orderBy: { timestamp: 'desc' },
        limit: 50
      })

      setTemperatureLogs(tempData.map(log => ({
        id: log.id,
        userId: log.userId,
        location: log.location as TemperatureLog['location'],
        temperature: log.temperature,
        timestamp: log.timestamp,
        withinRange: Number(log.withinRange) > 0,
        notes: log.notes
      })))

      // Create default compliance items if none exist
      if (complianceData.length === 0) {
        await createDefaultComplianceItems(user.id)
        setTimeout(() => loadComplianceData(), 1000)
      }
    } catch (error) {
      console.error('Error loading compliance data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createDefaultComplianceItems = async (userId: string) => {
    const defaultItems = [
      // HACCP
      {
        category: 'haccp',
        title: 'Risikoanalyse opdatering',
        description: 'Årlig gennemgang af HACCP risikoanalyse',
        status: 'compliant',
        dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        category: 'haccp',
        title: 'Kritiske kontrolpunkter',
        description: 'Månedlig kontrol af CCP - køling, varmholdelse, frysning',
        status: 'compliant',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      
      // Temperature
      {
        category: 'temperature',
        title: 'Køletemperatur kontrol',
        description: 'Daglig kontrol af køletemperatur ≤ 4°C',
        status: 'compliant',
        dueDate: new Date().toISOString().split('T')[0]
      },
      {
        category: 'temperature',
        title: 'Varmholdelse kontrol',
        description: 'Daglig kontrol af varmholdelse ≥ 60°C',
        status: 'compliant',
        dueDate: new Date().toISOString().split('T')[0]
      },
      
      // Cleaning
      {
        category: 'cleaning',
        title: 'Daglig rengøring',
        description: 'Rengøring af alle overflader og udstyr',
        status: 'compliant',
        dueDate: new Date().toISOString().split('T')[0]
      },
      {
        category: 'cleaning',
        title: 'Ugentlig dybderengøring',
        description: 'Grundig rengøring af vogne og udstyr',
        status: 'pending',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      
      // Training
      {
        category: 'training',
        title: 'Fødevarehygiejne kursus',
        description: 'Årlig opdatering af fødevarehygiejne certificering',
        status: 'compliant',
        dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      
      // Documentation
      {
        category: 'documentation',
        title: 'Temperatur logbog',
        description: 'Daglig registrering af temperaturer',
        status: 'compliant',
        dueDate: new Date().toISOString().split('T')[0]
      }
    ]

    await blink.db.complianceItems.createMany(
      defaultItems.map(item => ({
        id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        ...item
      }))
    )
  }

  const updateComplianceStatus = async (id: string, status: ComplianceItem['status'], notes?: string) => {
    try {
      await blink.db.complianceItems.update(id, {
        status,
        lastChecked: new Date().toISOString(),
        notes: notes || ''
      })

      setComplianceItems(prev => prev.map(item => 
        item.id === id 
          ? { ...item, status, lastChecked: new Date().toISOString(), notes: notes || '' }
          : item
      ))

      toast({
        title: "Status opdateret",
        description: "Compliance status er blevet opdateret",
      })
    } catch (error) {
      console.error('Error updating compliance status:', error)
      toast({
        title: "Fejl",
        description: "Kunne ikke opdatere status",
        variant: "destructive"
      })
    }
  }

  const addTemperatureLog = async () => {
    if (!newTempLog.temperature) return

    try {
      const user = await blink.auth.me()
      
      // Determine if temperature is within range
      let withinRange = false
      switch (newTempLog.location) {
        case 'shawarma_fridge':
        case 'grill_fridge':
          withinRange = newTempLog.temperature <= 4
          break
        case 'hot_hold':
          withinRange = newTempLog.temperature >= 60
          break
        case 'ambient':
          withinRange = newTempLog.temperature >= 15 && newTempLog.temperature <= 25
          break
      }

      const logId = `temp_${Date.now()}`
      await blink.db.temperatureLogs.create({
        id: logId,
        userId: user.id,
        location: newTempLog.location,
        temperature: newTempLog.temperature,
        timestamp: new Date().toISOString(),
        withinRange,
        notes: newTempLog.notes
      })

      setTemperatureLogs(prev => [{
        id: logId,
        userId: user.id,
        location: newTempLog.location,
        temperature: newTempLog.temperature,
        timestamp: new Date().toISOString(),
        withinRange,
        notes: newTempLog.notes
      }, ...prev])

      setNewTempLog({
        location: 'shawarma_fridge',
        temperature: 0,
        notes: ''
      })

      toast({
        title: "Temperatur registreret",
        description: `${newTempLog.temperature}°C registreret for ${getLocationName(newTempLog.location)}`,
      })
    } catch (error) {
      console.error('Error adding temperature log:', error)
      toast({
        title: "Fejl",
        description: "Kunne ikke registrere temperatur",
        variant: "destructive"
      })
    }
  }

  const getLocationName = (location: TemperatureLog['location']) => {
    switch (location) {
      case 'shawarma_fridge': return 'Shawarma Køleskab'
      case 'grill_fridge': return 'Grill Køleskab'
      case 'hot_hold': return 'Varmholdelse'
      case 'ambient': return 'Omgivelser'
      default: return location
    }
  }

  const getStatusColor = (status: ComplianceItem['status']) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'non_compliant': return 'text-red-600 bg-red-50'
      case 'pending': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: ComplianceItem['status']) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-4 w-4" />
      case 'warning': return <AlertTriangle className="h-4 w-4" />
      case 'non_compliant': return <AlertCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getCategoryIcon = (category: ComplianceItem['category']) => {
    switch (category) {
      case 'haccp': return <Shield className="h-4 w-4" />
      case 'temperature': return <Thermometer className="h-4 w-4" />
      case 'cleaning': return <RefreshCw className="h-4 w-4" />
      case 'training': return <FileText className="h-4 w-4" />
      case 'documentation': return <Calendar className="h-4 w-4" />
      default: return <Shield className="h-4 w-4" />
    }
  }

  const complianceScore = complianceItems.length > 0 
    ? Math.round((complianceItems.filter(item => item.status === 'compliant').length / complianceItems.length) * 100)
    : 100

  const criticalItems = complianceItems.filter(item => 
    item.status === 'non_compliant' || 
    (item.dueDate && new Date(item.dueDate) < new Date())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{complianceScore}%</p>
                <p className="text-xs text-muted-foreground">Compliance Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{complianceItems.filter(i => i.status === 'compliant').length}</p>
                <p className="text-xs text-muted-foreground">Compliant</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{criticalItems.length}</p>
                <p className="text-xs text-muted-foreground">Kritiske</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Thermometer className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{temperatureLogs.filter(l => l.withinRange).length}</p>
                <p className="text-xs text-muted-foreground">Temp OK</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Compliance Oversigt</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Samlet Compliance Score</span>
                <span className="text-sm text-muted-foreground">{complianceScore}%</span>
              </div>
              <Progress value={complianceScore} className="h-2" />
            </div>
            
            {criticalItems.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-semibold text-red-800 mb-2 flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Kritiske Punkter ({criticalItems.length})</span>
                </h4>
                <div className="space-y-2">
                  {criticalItems.map(item => (
                    <div key={item.id} className="text-sm text-red-700">
                      • {item.title} - {item.dueDate && new Date(item.dueDate) < new Date() ? 'Overskredet' : 'Ikke compliant'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="compliance" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="compliance">Compliance Tjek</TabsTrigger>
          <TabsTrigger value="temperature">Temperatur Log</TabsTrigger>
        </TabsList>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid gap-4">
            {complianceItems.map(item => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold">{item.title}</h3>
                          <Badge className={getStatusColor(item.status)}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1 capitalize">{item.status.replace('_', ' ')}</span>
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {item.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          {item.dueDate && (
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Forfald: {new Date(item.dueDate).toLocaleDateString('da-DK')}</span>
                            </span>
                          )}
                          {item.lastChecked && (
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>Sidst tjekket: {new Date(item.lastChecked).toLocaleDateString('da-DK')}</span>
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-2 italic">{item.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateComplianceStatus(item.id, 'compliant', 'Tjekket og godkendt')}
                        disabled={item.status === 'compliant'}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        OK
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateComplianceStatus(item.id, 'warning', 'Kræver opmærksomhed')}
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Advarsel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="temperature" className="space-y-4">
          {/* Add Temperature Log */}
          <Card>
            <CardHeader>
              <CardTitle>Registrer Temperatur</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Lokation</Label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={newTempLog.location}
                    onChange={(e) => setNewTempLog(prev => ({ ...prev, location: e.target.value as TemperatureLog['location'] }))}
                  >
                    <option value="shawarma_fridge">Shawarma Køleskab</option>
                    <option value="grill_fridge">Grill Køleskab</option>
                    <option value="hot_hold">Varmholdelse</option>
                    <option value="ambient">Omgivelser</option>
                  </select>
                </div>
                <div>
                  <Label>Temperatur (°C)</Label>
                  <Input
                    type="number"
                    value={newTempLog.temperature}
                    onChange={(e) => setNewTempLog(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0 }))}
                    step="0.1"
                  />
                </div>
                <div>
                  <Label>Noter (valgfrit)</Label>
                  <Input
                    value={newTempLog.notes}
                    onChange={(e) => setNewTempLog(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Bemærkninger..."
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addTemperatureLog} disabled={!newTempLog.temperature}>
                    <Thermometer className="h-4 w-4 mr-2" />
                    Registrer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Temperature Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Temperatur Historie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {temperatureLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Ingen temperatur logs endnu. Registrer den første temperatur ovenfor.
                  </p>
                ) : (
                  temperatureLogs.map(log => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Thermometer className={`h-4 w-4 ${log.withinRange ? 'text-green-500' : 'text-red-500'}`} />
                        <div>
                          <div className="font-medium">{getLocationName(log.location)}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString('da-DK')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${log.withinRange ? 'text-green-600' : 'text-red-600'}`}>
                          {log.temperature}°C
                        </div>
                        <Badge variant={log.withinRange ? 'default' : 'destructive'} className="text-xs">
                          {log.withinRange ? 'OK' : 'Udenfor område'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}