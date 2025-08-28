"use client"

import { useCallback, useEffect } from "react"
import { useSettings } from "@/components/providers/settings-provider"
import { useUserStore } from "@/stores/user"

interface UseSettingsRefreshOptions {
  autoRefresh?: boolean
  refreshInterval?: number
  enabled?: boolean
  onRefresh?: (settings: any) => void
}

/**
 * Hook for refreshing settings with manual refresh only
 * Auto-refresh disabled to prevent multiple fetching
 */
export function useSettingsRefresh(options: UseSettingsRefreshOptions = {}) {
  const { 
    settings, 
    isLoading, 
    error, 
    fetchSettings 
  } = useSettings()
  
  const { user } = useUserStore()
  
  const {
    autoRefresh = false, // Disabled by default
    refreshInterval = 30000,
    enabled = true,
    onRefresh
  } = options

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (!enabled) return
    
    try {
      await fetchSettings()
      if (onRefresh && settings) {
        onRefresh(settings)
      }
    } catch (error) {
      console.error('Failed to refresh settings:', error)
    }
  }, [fetchSettings, enabled, onRefresh, settings])

  // Auto-refresh functionality - disabled by default
  useEffect(() => {
    if (!autoRefresh || !enabled) return

    const interval = setInterval(refresh, refreshInterval)
    
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refresh, enabled])

  // Only refresh when user changes (for role-based settings)
  // Removed automatic refresh on mount to prevent multiple fetching
  useEffect(() => {
    if (user && enabled) {
      refresh()
    }
  }, [user, refresh, enabled])

  // Initial fetch - only if no settings exist
  useEffect(() => {
    if (enabled && !settings) {
      fetchSettings()
    }
  }, [enabled, settings, fetchSettings])

  return {
    settings,
    isLoading,
    error,
    refresh,
    fetchSettings,
    isAutoRefreshEnabled: autoRefresh,
    lastRefreshed: settings?.updatedAt ? new Date(settings.updatedAt) : null,
  }
}