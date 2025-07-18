import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { KPI } from '@/types'

interface KPIWidgetProps {
  kpi: KPI
}

export function KPIWidget({ kpi }: KPIWidgetProps) {
  const percentage = (kpi.value / kpi.target) * 100
  const isOnTarget = percentage >= 100
  
  const getTrendIcon = () => {
    switch (kpi.trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendColor = () => {
    switch (kpi.trend) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {kpi.name}
        </CardTitle>
        {getTrendIcon()}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold">
              {kpi.value.toLocaleString('da-DK')}
            </span>
            <span className="text-sm text-muted-foreground">
              {kpi.unit}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px]">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    isOnTarget ? 'bg-green-500' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${getTrendColor()}`}>
                {percentage.toFixed(0)}%
              </span>
            </div>
            
            <Badge variant={isOnTarget ? "default" : "outline"} className="text-xs">
              Mål: {kpi.target.toLocaleString('da-DK')}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}