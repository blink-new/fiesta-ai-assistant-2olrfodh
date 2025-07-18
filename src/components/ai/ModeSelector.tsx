import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Zap, 
  Brain, 
  Bot, 
  ChevronDown,
  Settings
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AIMode } from '@/types'

const AI_MODES: AIMode[] = [
  {
    id: 'auto',
    name: 'Auto Mode',
    description: 'Intelligent opgave-routing og hurtige svar',
    icon: 'Zap'
  },
  {
    id: 'compute',
    name: 'Compute Mode',
    description: 'Dybdegående analyse og komplekse beregninger',
    icon: 'Brain'
  },
  {
    id: 'agent',
    name: 'Agent Mode',
    description: 'Selvstændig opgaveløsning og multi-step reasoning',
    icon: 'Bot'
  }
]

interface ModeSelectorProps {
  selectedMode: AIMode['id']
  onModeChange: (mode: AIMode['id']) => void
  showAdvanced: boolean
  onToggleAdvanced: () => void
}

export function ModeSelector({ 
  selectedMode, 
  onModeChange, 
  showAdvanced, 
  onToggleAdvanced 
}: ModeSelectorProps) {
  const currentMode = AI_MODES.find(mode => mode.id === selectedMode) || AI_MODES[0]

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap': return <Zap className="h-4 w-4" />
      case 'Brain': return <Brain className="h-4 w-4" />
      case 'Bot': return <Bot className="h-4 w-4" />
      default: return <Zap className="h-4 w-4" />
    }
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 px-3">
                  <div className="flex items-center space-x-2">
                    {getIcon(currentMode.icon)}
                    <span className="font-medium">{currentMode.name}</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {AI_MODES.map((mode) => (
                  <DropdownMenuItem
                    key={mode.id}
                    onClick={() => onModeChange(mode.id)}
                    className="flex flex-col items-start p-3 cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 w-full">
                      {getIcon(mode.icon)}
                      <span className="font-medium">{mode.name}</span>
                      {mode.id === selectedMode && (
                        <Badge variant="secondary" className="ml-auto">Active</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {mode.description}
                    </p>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="hidden md:block">
              <p className="text-sm text-muted-foreground">
                {currentMode.description}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant={showAdvanced ? "default" : "outline"}>
              Advanced Research & Reasoning
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleAdvanced}
              className="h-8 w-8 p-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}