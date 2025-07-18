export interface User {
  id: string
  email: string
  displayName?: string
}

export interface AIMode {
  id: 'auto' | 'compute' | 'agent'
  name: string
  description: string
  icon: string
}

export interface Task {
  id: string
  type: 'kundeservice' | 'marketing' | 'planlægning' | 'SEO' | 'drift' | 'økonomi'
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
  updatedAt: Date
  userId: string
}

export interface Event {
  id: string
  title: string
  date: Date
  location: string
  guests: number
  status: 'inquiry' | 'quoted' | 'booked' | 'completed'
  wagon: 'shawarma' | 'grill' | 'both'
  price?: number
  userId: string
}

export interface KPI {
  name: string
  value: number
  target: number
  unit: string
  trend: 'up' | 'down' | 'stable'
}