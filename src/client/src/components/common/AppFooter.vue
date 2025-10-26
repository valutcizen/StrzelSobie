<template>
  <v-footer
    class="bg-grey-lighten-4 footer-compact"
    :style="footerStyles"
  >
    <v-container class="d-flex flex-column flex-sm-row align-center justify-space-between py-1">
      <v-btn
        variant="text"
        href="https://github.com/valutcizen/StrzelSobie"
        target="_blank"
        rel="noopener noreferrer"
        class="text-decoration-none"
        prepend-icon="mdi-github"
      >
        {{ t('app.title') }}
      </v-btn>
      <LanguageSwitcher />
      <v-btn
        variant="text"
        :to="{ name: 'PrivacyPolicy' }"
        prepend-icon="mdi-shield-account"
      >
        {{ t('footer.privacyPolicy') }}
      </v-btn>
    </v-container>
  </v-footer>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'

const { t } = useI18n()

const drawerOffset = ref(0)

const footerStyles = computed(() => {
  if (!drawerOffset.value) {
    return { width: '100%' }
  }

  const offset = `${drawerOffset.value}px`
  return {
    marginInlineStart: offset,
    width: `calc(100% - ${offset})`,
  }
})

let resizeObserver: ResizeObserver | null = null
let mutationObserver: MutationObserver | null = null

onMounted(() => {
  if (typeof window === 'undefined') {
    return
  }

  const drawerElement = document.querySelector<HTMLElement>('.app-shell-navigation')

  if (!drawerElement) {
    return
  }

  const updateOffset = () => {
    const isTemporary = drawerElement.classList.contains('v-navigation-drawer--temporary')
    const isActive = drawerElement.classList.contains('v-navigation-drawer--active')

    if (!isActive || isTemporary) {
      drawerOffset.value = 0
      return
    }

    drawerOffset.value = Math.round(drawerElement.getBoundingClientRect().width)
  }

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(updateOffset)
    })
    resizeObserver.observe(drawerElement)
  }

  if (typeof MutationObserver !== 'undefined') {
    mutationObserver = new MutationObserver(() => {
      window.requestAnimationFrame(updateOffset)
    })
    mutationObserver.observe(drawerElement, { attributes: true, attributeFilter: ['class', 'style'] })
  }

  window.requestAnimationFrame(updateOffset)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  mutationObserver?.disconnect()
})
</script>

<style scoped>
.footer-compact {
  height: 48px;
  min-height: 48px;
  max-height: 48px;
  transition: margin-inline-start 160ms ease, width 160ms ease;
}

.footer-compact :deep(.v-container) {
  padding-top: 8px;
  padding-bottom: 8px;
}
</style>
