'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme
  accentColor: string
  setTheme: (theme: Theme) => void
  setAccentColor: (color: string) => void
  resolvedTheme: 'dark' | 'light'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [accentColor, setAccentColorState] = useState('#3b82f6')
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')
  const [mounted, setMounted] = useState(false)

  // Load saved settings on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null
    const savedAccentColor = localStorage.getItem('accentColor')
    
    if (savedTheme) setThemeState(savedTheme)
    if (savedAccentColor) setAccentColorState(savedAccentColor)
    
    setMounted(true)
  }, [])

  // Apply theme
  useEffect(() => {
    if (!mounted) return

    const applyTheme = (resolvedTheme: 'dark' | 'light') => {
      const root = document.documentElement
      
      if (resolvedTheme === 'dark') {
        root.classList.add('dark')
        root.classList.remove('light')
      } else {
        root.classList.add('light')
        root.classList.remove('dark')
      }
      
      setResolvedTheme(resolvedTheme)
    }

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mediaQuery.matches ? 'dark' : 'light')
      
      const handler = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light')
      }
      
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      applyTheme(theme)
    }
  }, [theme, mounted])

  // Apply accent color
  useEffect(() => {
    if (!mounted) return
    
    document.documentElement.style.setProperty('--accent-color', accentColor)
    
    // Convert hex to RGB for gradients
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null
    }
    
    const rgb = hexToRgb(accentColor)
    if (rgb) {
      document.documentElement.style.setProperty('--accent-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`)
    }
  }, [accentColor, mounted])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  const setAccentColor = (color: string) => {
    setAccentColorState(color)
    localStorage.setItem('accentColor', color)
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, accentColor, setTheme, setAccentColor, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
