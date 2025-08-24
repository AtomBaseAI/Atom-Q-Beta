"use client"

import React, { useEffect, createContext, useContext, useCallback } from "react"
import { useSettingsStore, Settings } from "@/stores/settings"
import { useAccentColor } from "./accent-color-provider"
import { toasts } from "@/lib/toasts"

interface SettingsContextType {
  settings: Settings
  isLoading: boolean
  error: string | null
  updateSettings: (updates: Partial<Settings>) => Promise<void>
  refreshSettings: () => Promise<void>
  fetchSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType>({
  settings: {
    siteTitle: "Atom Q",
    siteDescription: "Knowledge testing portal powered by Atom Labs",
    maintenanceMode: false,
    allowRegistration: true,
    enableGithubAuth: false,
    accentColor: "blue",
  },
  isLoading: false,
  error: null,
  updateSettings: async () => {},
  refreshSettings: async () => {},
  fetchSettings: async () => {},
})

export const useSettings = () => useContext(SettingsContext)

const colorMappings = {
  blue: "hsl(221.2 83.2% 53.3%)",
  green: "hsl(142.1 76.2% 36.3%)",
  purple: "hsl(262.1 83.3% 57.8%)",
  red: "hsl(346.8 77.2% 49.8%)",
  orange: "hsl(24.6 95% 53.1%)",
  pink: "hsl(330.4 81.2% 60.4%)"
}

interface SettingsProviderProps {
  children: React.ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const { 
    settings, 
    isLoading, 
    error, 
    setSettings, 
    updateSettings: updateStoreSettings,
    setLoading,
    setError,
    fetchSettings: fetchStoreSettings,
    refreshSettings: refreshStoreSettings
  } = useSettingsStore()
  
  const { setAccentColor } = useAccentColor()

  // Update document title when site title changes
  useEffect(() => {
    if (settings.siteTitle) {
      document.title = settings.siteTitle
    }
  }, [settings.siteTitle])

  // Update accent color when it changes
  useEffect(() => {
    if (settings.accentColor) {
      setAccentColor(settings.accentColor)
      
      // Also update CSS custom properties directly for immediate effect
      const root = document.documentElement
      const primaryColor = colorMappings[settings.accentColor as keyof typeof colorMappings] || colorMappings.blue
      
      root.style.setProperty("--primary", primaryColor)
      root.style.setProperty("--primary-foreground", "hsl(0 0% 98%)")
    }
  }, [settings.accentColor, setAccentColor])

  // Update meta tags when settings change
  useEffect(() => {
    // Update Open Graph meta tags
    const ogTitle = document.querySelector('meta[property="og:title"]')
    const ogDescription = document.querySelector('meta[property="og:description"]')
    const twitterTitle = document.querySelector('meta[name="twitter:title"]')
    const twitterDescription = document.querySelector('meta[name="twitter:description"]')

    if (ogTitle) ogTitle.setAttribute('content', settings.siteTitle)
    if (ogDescription) ogDescription.setAttribute('content', settings.siteDescription)
    if (twitterTitle) twitterTitle.setAttribute('content', settings.siteTitle)
    if (twitterDescription) twitterDescription.setAttribute('content', settings.siteDescription)
  }, [settings.siteTitle, settings.siteDescription])

  // Fetch settings on mount
  useEffect(() => {
    fetchStoreSettings()
  }, [])

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const updatedSettings = await response.json()
        setSettings(updatedSettings)
        toasts.settingsUpdated()

        // Show specific toasts for maintenance mode changes
        if ('maintenanceMode' in updates && updates.maintenanceMode !== settings.maintenanceMode) {
          if (updates.maintenanceMode) {
            toasts.maintenanceModeEnabled()
          } else {
            toasts.maintenanceModeDisabled()
          }
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update settings')
        toasts.actionFailed('Settings update')
      }
    } catch (error) {
      setError('Network error while updating settings')
      toasts.actionFailed('Settings update')
    } finally {
      setLoading(false)
    }
  }, [settings.maintenanceMode, setSettings, setLoading, setError])

  const refreshSettings = useCallback(async () => {
    await refreshStoreSettings()
  }, [refreshStoreSettings])

  const fetchSettings = useCallback(async () => {
    await fetchStoreSettings()
  }, [fetchStoreSettings])

  const value: SettingsContextType = {
    settings,
    isLoading,
    error,
    updateSettings,
    refreshSettings,
    fetchSettings,
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}