import { defineStore } from 'pinia'
import { ref } from 'vue'

export type AuthDialogTab = 'login' | 'register'

export const useAuthDialogStore = defineStore('authDialog', () => {
  const isOpen = ref(false)
  const activeTab = ref<AuthDialogTab>('login')
  const redirectPath = ref<string | null>(null)

  const open = (options?: { tab?: AuthDialogTab; redirectPath?: string | null }) => {
    if (options?.tab) {
      activeTab.value = options.tab
    }
    if (options && 'redirectPath' in options) {
      redirectPath.value = options.redirectPath ?? null
    }
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
  }

  const setRedirectPath = (path: string | null) => {
    redirectPath.value = path
  }

  const popRedirectPath = () => {
    const target = redirectPath.value
    redirectPath.value = null
    return target
  }

  return {
    isOpen,
    activeTab,
    redirectPath,
    open,
    close,
    setRedirectPath,
    popRedirectPath,
  }
})

export type AuthDialogStore = ReturnType<typeof useAuthDialogStore>
