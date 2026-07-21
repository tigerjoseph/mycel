const PORT = 17321
const BASE = `http://127.0.0.1:${PORT}`

async function fetchHealth() {
  const res = await fetch(`${BASE}/health`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Mycel not running')
  return res.json()
}

async function getAuth({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const stored = await chrome.storage.sync.get(['mycelToken'])
    if (stored.mycelToken) return stored.mycelToken
  } else {
    await chrome.storage.sync.remove(['mycelToken'])
  }

  try {
    const data = await fetchHealth()
    if (data.token) {
      await chrome.storage.sync.set({ mycelToken: data.token })
      return data.token
    }
  } catch {
    // Mycel offline
  }
  return null
}

async function saveToMycel(payload, retried = false) {
  const token = await getAuth()
  if (!token) {
    throw new Error('Open Mycel first — it must be running on your Mac.')
  }

  const res = await fetch(`${BASE}/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })

  if (res.status === 401 && !retried) {
    await getAuth({ forceRefresh: true })
    return saveToMycel(payload, true)
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Save failed')
  return data
}

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'mycel-save-image',
      title: 'Save image to Mycel',
      contexts: ['image']
    })
    chrome.contextMenus.create({
      id: 'mycel-save-selection',
      title: 'Save quote to Mycel',
      contexts: ['selection']
    })
  })
}

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus()
})

chrome.runtime.onStartup.addListener(() => {
  setupContextMenus()
})

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SAVE') {
    saveToMycel(msg.payload)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }
  if (msg.type === 'PING') {
    getAuth()
      .then((token) => sendResponse({ ok: Boolean(token) }))
      .catch(() => sendResponse({ ok: false }))
    return true
  }
})

async function saveActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return { ok: false, error: 'No active tab' }

  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'SAVE_PAGE' })
    if (res?.ok === false) return res
    if (res?.ok) return res
  } catch {
    // Content script not injected — fall back to a minimal page save
  }

  try {
    const data = await saveToMycel({
      url: tab.url || '',
      title: tab.title || 'Page',
      source: 'web',
      mediaType: 'page',
      tags: []
    })
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'save-page') return
  void saveActiveTab()
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.url) return

  if (info.menuItemId === 'mycel-save-image' && info.srcUrl) {
    try {
      await saveToMycel({
        url: info.srcUrl,
        imageUrls: [info.srcUrl],
        source: 'web',
        mediaType: 'image',
        title: tab.title || 'Image'
      })
    } catch (err) {
      console.error(err)
    }
    return
  }

  if (info.menuItemId === 'mycel-save-selection' && info.selectionText) {
    try {
      await saveToMycel({
        url: tab.url,
        selection: info.selectionText,
        title: tab.title || 'Quote',
        mediaType: 'quote'
      })
    } catch (err) {
      console.error(err)
    }
  }
})
