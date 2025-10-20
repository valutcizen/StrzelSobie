import axios from 'axios'

export const http = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status

    if (status === 401 || status === 403) {
      const [{ useAuthStore }, { default: router }] = await Promise.all([
        import('../stores/auth'),
        import('../router'),
      ])

      const authStore = useAuthStore()
      authStore.reset()

      if (router.currentRoute.value.name !== 'auth') {
        await router.push({ name: 'auth' })
      }
    }

    return Promise.reject(error)
  },
)
