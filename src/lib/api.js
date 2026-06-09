/**
 * Finzo — Backend API Client
 * All calls to the Express backend go through here
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function apiCall(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}

// ── AUTH ──────────────────────────────────────────────────────
export const gmailAPI = {
  /** Start Gmail OAuth — returns { authUrl } */
  async startOAuth(userId) {
    return apiCall(`/auth/gmail?userId=${encodeURIComponent(userId)}`)
  },

  /** Check if Gmail is connected */
  async status(userId) {
    return apiCall('/auth/gmail/status', {
      headers: { 'x-user-id': userId }
    })
  },

  /** Disconnect Gmail */
  async disconnect(userId) {
    return apiCall('/auth/gmail/disconnect', {
      method: 'DELETE',
      headers: { 'x-user-id': userId }
    })
  },

  /** Scan Gmail inbox for bank emails */
  async scan(userId) {
    return apiCall('/api/gmail/scan', {
      headers: { 'x-user-id': userId }
    })
  },

  /** Download a PDF attachment — returns { data: base64string, filename } */
  async downloadAttachment(userId, messageId, attachmentId, filename) {
    return apiCall('/api/gmail/attachment', {
      method: 'POST',
      headers: { 'x-user-id': userId },
      body: JSON.stringify({ messageId, attachmentId, filename })
    })
  },

  /** Parse alert emails into transactions */
  async parseAlerts(userId, alerts) {
    return apiCall('/api/gmail/parse-alerts', {
      method: 'POST',
      headers: { 'x-user-id': userId },
      body: JSON.stringify({ alerts })
    })
  },
}
