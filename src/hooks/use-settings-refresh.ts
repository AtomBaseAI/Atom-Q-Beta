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
 * Hook for refreshing settings with automatic refresh capabilities
 * Provides both manual and automatic refresh functionality
 */
export function useSettingsRefresh(options: UseSettingsRefreshOptions = {}) {
  const { 
    settings, 
    isLoading, 
    error, 
    refreshSettings,
    fetchSettings 
  } = useSettings()
  
  const { user } = useUserStore()
  
  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds default
    enabled = true,
    onRefresh
  } = options

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (!enabled) return
    
    try {
      await refreshSettings()
      if (onRefresh && settings) {
        onRefresh(settings)
      }
    } catch (error) {
      console.error('Failed to refresh settings:', error)
    }
  }, [refreshSettings, enabled, onRefresh, settings])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !enabled) return

    const interval = setInterval(refresh, refreshInterval)
    
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refresh, enabled])

  // Refresh when user changes (for role-based settings)
  useEffect(() => {
    if (user && enabled) {
      refresh()
    }
  }, [user, refresh, enabled])

  // Initial fetch
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
    refreshSettings,
    fetchSettings,
    isAutoRefreshEnabled: autoRefresh,
    lastRefreshed: settings?.updatedAt ? new Date(settings.updatedAt) : null,
  }
}