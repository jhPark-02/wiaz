const AUTH_KEY = "wiaz_auth_user"

export const DEMO_ACCOUNT = {
  userId: "admin",
  password: "wiaz1234",
}

export function login(userId: string, password: string) {
  if (userId !== DEMO_ACCOUNT.userId || password !== DEMO_ACCOUNT.password) {
    return false
  }
  window.localStorage.setItem(AUTH_KEY, userId)
  return true
}

export function logout() {
  window.localStorage.removeItem(AUTH_KEY)
}

export function isAuthenticated() {
  if (typeof window === "undefined") return false
  return Boolean(window.localStorage.getItem(AUTH_KEY))
}
