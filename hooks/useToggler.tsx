"use client"

import { useState, useCallback, useMemo } from "react"

export interface TogglerState {
  [key: string]: boolean
}

export interface TogglerActions {
  toggle: (key: string) => void
  set: (key: string, value: boolean) => void
  setMultiple: (updates: Partial<TogglerState>) => void
  reset: (keys?: string[]) => void
  resetAll: () => void
  enable: (key: string) => void
  disable: (key: string) => void
  enableMultiple: (keys: string[]) => void
  disableMultiple: (keys: string[]) => void
}

export interface TogglerReturn {
  states: TogglerState
  actions: TogglerActions
  isEnabled: (key: string) => boolean
  isDisabled: (key: string) => boolean
  hasAnyEnabled: (keys?: string[]) => boolean
  hasAllEnabled: (keys: string[]) => boolean
  getEnabledKeys: () => string[]
  getDisabledKeys: () => string[]
}

export interface UseTogglerOptions {
  initialStates?: TogglerState
  defaultValue?: boolean
}

/**
 * A comprehensive hook for managing multiple toggle states
 *
 * @param keys - Array of toggle keys to manage
 * @param options - Configuration options
 * @returns Object with states, actions, and utility functions
 *
 * @example
 * ```tsx
 * const { states, actions, isEnabled } = useToggler(['delete', 'edit', 'add'])
 *
 * // Toggle individual states
 * actions.toggle('delete')
 * actions.enable('edit')
 * actions.disable('add')
 *
 * // Check states
 * if (isEnabled('delete')) {
 *   // Show delete confirmation
 * }
 * ```
 */
export function useToggler(keys: string[], options: UseTogglerOptions = {}): TogglerReturn {
  const { initialStates = {}, defaultValue = false } = options

  // Initialize state with provided keys
  const [states, setStates] = useState<TogglerState>(() => {
    const initialState: TogglerState = {}
    keys.forEach((key) => {
      initialState[key] = initialStates[key] ?? defaultValue
    })
    return initialState
  })

  // Toggle a specific key
  const toggle = useCallback((key: string) => {
    setStates((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }, [])

  // Set a specific key to a value
  const set = useCallback((key: string, value: boolean) => {
    setStates((prev) => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  // Set multiple keys at once
  const setMultiple = useCallback((updates: Partial<TogglerState>) => {
    setStates((prev) => {
      const newState: TogglerState = { ...prev }
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          newState[key] = value
        }
      })
      return newState
    })
  }, [])

  // Reset specific keys to default value
  const reset = useCallback(
    (keysToReset?: string[]) => {
      const targetKeys = keysToReset || keys
      setStates((prev) => {
        const newState: TogglerState = { ...prev }
        targetKeys.forEach((key) => {
          newState[key] = initialStates[key] ?? defaultValue
        })
        return newState
      })
    },
    [keys, initialStates, defaultValue],
  )

  // Reset all keys to default value
  const resetAll = useCallback(() => {
    reset(keys)
  }, [reset, keys])

  // Enable a specific key
  const enable = useCallback(
    (key: string) => {
      set(key, true)
    },
    [set],
  )

  // Disable a specific key
  const disable = useCallback(
    (key: string) => {
      set(key, false)
    },
    [set],
  )

  // Enable multiple keys
  const enableMultiple = useCallback(
    (keysToEnable: string[]) => {
      const updates: TogglerState = {}
      keysToEnable.forEach((key) => {
        updates[key] = true
      })
      setMultiple(updates)
    },
    [setMultiple],
  )

  // Disable multiple keys
  const disableMultiple = useCallback(
    (keysToDisable: string[]) => {
      const updates: TogglerState = {}
      keysToDisable.forEach((key) => {
        updates[key] = false
      })
      setMultiple(updates)
    },
    [setMultiple],
  )

  // Utility functions
  const isEnabled = useCallback(
    (key: string) => {
      return Boolean(states[key])
    },
    [states],
  )

  const isDisabled = useCallback(
    (key: string) => {
      return !states[key]
    },
    [states],
  )

  const hasAnyEnabled = useCallback(
    (keysToCheck?: string[]) => {
      const targetKeys = keysToCheck || keys
      return targetKeys.some((key) => states[key])
    },
    [states, keys],
  )

  const hasAllEnabled = useCallback(
    (keysToCheck: string[]) => {
      return keysToCheck.every((key) => states[key])
    },
    [states],
  )

  const getEnabledKeys = useCallback(() => {
    return keys.filter((key) => states[key])
  }, [keys, states])

  const getDisabledKeys = useCallback(() => {
    return keys.filter((key) => !states[key])
  }, [keys, states])

  // Memoized actions object
  const actions = useMemo<TogglerActions>(
    () => ({
      toggle,
      set,
      setMultiple,
      reset,
      resetAll,
      enable,
      disable,
      enableMultiple,
      disableMultiple,
    }),
    [toggle, set, setMultiple, reset, resetAll, enable, disable, enableMultiple, disableMultiple],
  )

  return {
    states,
    actions,
    isEnabled,
    isDisabled,
    hasAnyEnabled,
    hasAllEnabled,
    getEnabledKeys,
    getDisabledKeys,
  }
}

// Additional utility hook for common UI patterns
export function useModalToggler(modalKeys: string[]) {
  const toggler = useToggler(modalKeys)

  const openModal = useCallback(
    (key: string) => {
      // Close all other modals first
      toggler.actions.resetAll()
      // Open the requested modal
      toggler.actions.enable(key)
    },
    [toggler.actions],
  )

  const closeModal = useCallback(
    (key: string) => {
      toggler.actions.disable(key)
    },
    [toggler.actions],
  )

  const closeAllModals = useCallback(() => {
    toggler.actions.resetAll()
  }, [toggler.actions])

  return {
    ...toggler,
    openModal,
    closeModal,
    closeAllModals,
  }
}

// Hook for managing loading states
export function useLoadingToggler(loadingKeys: string[]) {
  const toggler = useToggler(loadingKeys)

  const startLoading = useCallback(
    (key: string) => {
      toggler.actions.enable(key)
    },
    [toggler.actions],
  )

  const stopLoading = useCallback(
    (key: string) => {
      toggler.actions.disable(key)
    },
    [toggler.actions],
  )

  const stopAllLoading = useCallback(() => {
    toggler.actions.resetAll()
  }, [toggler.actions])

  const isLoading = useCallback(
    (key?: string) => {
      if (key) return toggler.isEnabled(key)
      return toggler.hasAnyEnabled()
    },
    [toggler],
  )

  return {
    ...toggler,
    startLoading,
    stopLoading,
    stopAllLoading,
    isLoading,
  }
}
