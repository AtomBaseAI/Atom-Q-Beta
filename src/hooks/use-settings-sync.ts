"use client"

import { useEffect } from "react"
import { useSettings } from "@/components/providers/settings-provider"
import { useUserStore } from "@/stores/user"

interface UseSettingsSyncOptions {
  enabled?: boolean
  onUpdate?: (settings: any) => void
}

/**
 * Hook to synchronize settings across the application
 * Provides real-time updates when settings change
 */
export function useSettingsSync(options: UseSettingsSyncOptions = {}) {
  const { 
    settings, 
    isLoading, 
    error, 
    refreshSettings 
  } = useSettings()
  
  const { user } = useUserStore()

  // Call onUpdate callback when settings change
  useEffect(() => {
    if (settings && options.onUpdate) {
      options.onUpdate(settings)
    }
  }, [settings, options.onUpdate])

  // Only refresh settings when user changes (for role-based settings)
  // Removed automatic refresh on mount to prevent multiple fetching
  useEffect(() => {
    if (user && options.enabled !== false) {
      refreshSettings()
    }
  }, [user, refreshSettings, options.enabled])

  // Handle maintenance mode
  useEffect(() => {
    if (settings?.maintenanceMode && user?.role !== 'ADMIN') {
      // Non-admin users should be redirected or notified
      console.warn('Maintenance mode is active')
    }
  }, [settings?.maintenanceMode, user?.role])

  return {
    settings,
    isLoading,
    error,
    refreshSettings,
    isMaintenanceMode: settings?.maintenanceMode || false,
    siteTitle: settings?.siteTitle || "Atom Q",
    siteDescription: settings?.siteDescription || "Knowledge testing portal powered by Atom Labs",
    accentColor: settings?.accentColor || "blue",
    allowRegistration: settings?.allowRegistration ?? true,
  }
}