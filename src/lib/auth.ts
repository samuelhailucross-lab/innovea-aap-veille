import { cookies } from 'next/headers'

const SESSION_COOKIE = 'aap_session'

export function isAuthenticated(): boolean {
  const cookieStore = cookies()
  const val = cookieStore.get(SESSION_COOKIE)?.value
  return val === process.env.ADMIN_SECRET
}

export function SESSION_COOKIE_NAME() {
  return SESSION_COOKIE
}
