const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const getToken = () => localStorage.getItem('token')

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method, headers, body: form ?? (body ? JSON.stringify(body) : undefined),
    })
  } catch {
    throw new Error('Cannot reach the server. If the free backend was idle, wait ~30s and retry.')
  }
  if (res.status === 401 && path !== '/auth/login') {
    // Session is missing or expired: clear everything so the login page doesn't bounce back
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
    throw new Error('Session expired. Please log in again.')
  }
  if (!res.ok) {
    let detail = 'Something went wrong'
    try {
      const j = await res.json()
      detail = typeof j.detail === 'string' ? j.detail : 'Please check the entered values'
    } catch {}
    throw new Error(detail)
  }
  return res.json()
}
