/** YouTube content script — hover save on video cards + watch/shorts pages */

const VIDEO_RENDERERS = [
  'ytd-rich-item-renderer',
  'ytd-grid-video-renderer',
  'ytd-video-renderer',
  'ytd-compact-video-renderer',
  'ytd-reel-item-renderer',
  'ytd-playlist-video-renderer'
].join(',')

function videoIdFromUrl(url) {
  if (!url) return null
  const patterns = [
    /[?&]v=([^&]+)/,
    /youtu\.be\/([^/?#]+)/,
    /\/shorts\/([^/?#]+)/,
    /\/embed\/([^/?#]+)/
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function canonicalWatchUrl(id) {
  return `https://www.youtube.com/watch?v=${id}`
}

function embedUrl(id) {
  return `https://www.youtube.com/embed/${id}`
}

function thumbnailUrl(id) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

function videoLink(renderer) {
  const selectors = [
    'a#video-title-link',
    'a#thumbnail',
    'a.ytd-thumbnail',
    'a[href*="/watch?v="]',
    'a[href*="/shorts/"]',
    'a[href*="youtu.be/"]'
  ]
  for (const sel of selectors) {
    const link = renderer.querySelector(sel)
    if (link?.href) return link
  }
  return renderer.querySelector('a[href]')
}

function titleFromRenderer(renderer) {
  const titleEl =
    renderer.querySelector('#video-title') ||
    renderer.querySelector('span#video-title') ||
    renderer.querySelector('yt-formatted-string#video-title')
  const text = titleEl?.textContent?.trim() || titleEl?.getAttribute('title')?.trim()
  if (text) return text
  const link = videoLink(renderer)
  return link?.getAttribute('title')?.trim() || link?.textContent?.trim() || ''
}

function channelFromRenderer(renderer) {
  const channelEl =
    renderer.querySelector('#channel-name a') ||
    renderer.querySelector('ytd-channel-name a') ||
    renderer.querySelector('#text.ytd-channel-name a')
  return channelEl?.textContent?.trim() || ''
}

function thumbnailFromRenderer(renderer, videoId) {
  const img = renderer.querySelector('img.yt-core-image, yt-image img, img')
  const src = img?.src || img?.getAttribute('src')
  if (src && src.startsWith('http') && !src.startsWith('data:')) return src
  return videoId ? thumbnailUrl(videoId) : null
}

function buildPayloadFromRenderer(renderer) {
  const link = videoLink(renderer)
  const href = link?.href || window.location.href
  const id = videoIdFromUrl(href) || videoIdFromUrl(window.location.href)
  if (!id) return null

  const url = href.includes('/shorts/')
    ? `https://www.youtube.com/shorts/${id}`
    : canonicalWatchUrl(id)

  const title = titleFromRenderer(renderer) || document.title.replace(' - YouTube', '').trim()
  const channel = channelFromRenderer(renderer)
  const thumb = thumbnailFromRenderer(renderer, id)

  const payload = {
    url,
    title,
    caption: channel ? `${channel}` : '',
    imageUrls: thumb ? [thumb] : [],
    embedUrl: embedUrl(id),
    source: 'youtube',
    mediaType: 'video',
    tags: ['youtube']
  }

  if (channel) payload.tags.push(channel.toLowerCase().replace(/\s+/g, '-'))
  return payload
}

function buildWatchPagePayload() {
  const id = videoIdFromUrl(window.location.href)
  if (!id) return null

  const title =
    document.querySelector('h1 yt-formatted-string')?.textContent?.trim() ||
    document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.replace(' - YouTube', '').trim() ||
    document.title.replace(' - YouTube', '').trim()

  const channel =
    document.querySelector('ytd-channel-name a')?.textContent?.trim() ||
    document.querySelector('#channel-name a')?.textContent?.trim() ||
    document.querySelector('link[itemprop="name"]')?.getAttribute('content')?.trim() ||
    ''

  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content')
  const thumb = ogImage && ogImage.startsWith('http') ? ogImage : thumbnailUrl(id)

  const url = window.location.pathname.includes('/shorts/')
    ? `https://www.youtube.com/shorts/${id}`
    : canonicalWatchUrl(id)

  const payload = {
    url,
    title,
    caption: channel,
    imageUrls: [thumb],
    embedUrl: embedUrl(id),
    source: 'youtube',
    mediaType: 'video',
    tags: ['youtube']
  }

  if (channel) payload.tags.push(channel.toLowerCase().replace(/\s+/g, '-'))
  return payload
}

function sendSave(payload, btn, sendResponse) {
  if (!payload) {
    if (sendResponse) sendResponse({ ok: false, error: 'No YouTube video found on this page' })
    return
  }

  if (btn) {
    btn.classList.add('mycel-saving')
    btn.textContent = 'Saving…'
  }

  chrome.runtime.sendMessage({ type: 'SAVE', payload }, (res) => {
    if (btn) btn.classList.remove('mycel-saving')
    if (chrome.runtime.lastError) {
      if (btn) {
        btn.textContent = 'Open Mycel first'
        setTimeout(() => { btn.textContent = '+ Mycel' }, 2500)
      }
      if (sendResponse) sendResponse({ ok: false, error: chrome.runtime.lastError.message })
      return
    }
    if (res?.ok) {
      if (btn) {
        btn.classList.add('mycel-saved')
        btn.textContent = 'Saved ✓'
        setTimeout(() => {
          btn.classList.remove('mycel-saved', 'mycel-visible')
          btn.textContent = '+ Mycel'
        }, 1600)
      }
      if (sendResponse) sendResponse(res)
    } else {
      if (btn) {
        btn.textContent = res?.error?.slice(0, 28) || 'Failed'
        setTimeout(() => { btn.textContent = '+ Mycel' }, 2500)
      }
      if (sendResponse) sendResponse(res)
    }
  })
}

function attachSaveButton(renderer) {
  if (renderer.dataset.mycelBound) return
  renderer.dataset.mycelBound = '1'
  renderer.classList.add('mycel-target')
  renderer.style.position = 'relative'

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'mycel-save-btn'
  btn.textContent = '+ Mycel'
  renderer.appendChild(btn)

  renderer.addEventListener('mouseenter', () => btn.classList.add('mycel-visible'))
  renderer.addEventListener('mouseleave', () => btn.classList.remove('mycel-visible'))

  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (btn.classList.contains('mycel-saving')) return
    const payload = buildPayloadFromRenderer(renderer)
    sendSave(payload, btn)
  })
}

function attachWatchPageButton() {
  const existing = document.getElementById('mycel-watch-save')
  if (!videoIdFromUrl(window.location.href)) {
    existing?.remove()
    return
  }
  if (existing) return

  const btn = document.createElement('button')
  btn.id = 'mycel-watch-save'
  btn.type = 'button'
  btn.className = 'mycel-save-btn mycel-watch-btn'
  btn.textContent = '+ Mycel'
  document.body.appendChild(btn)

  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (btn.classList.contains('mycel-saving')) return
    const payload = buildWatchPagePayload()
    sendSave(payload, btn)
  })
}

function scanRenderers(root = document) {
  root.querySelectorAll(VIDEO_RENDERERS).forEach(attachSaveButton)
}

function scanAddedNodes(records) {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue
      const el = node
      if (el.matches?.(VIDEO_RENDERERS)) attachSaveButton(el)
      el.querySelectorAll?.(VIDEO_RENDERERS).forEach(attachSaveButton)
    }
  }
}

let scanTimer = null
function scheduleScan(records) {
  if (records?.length) scanAddedNodes(records)
  if (scanTimer) return
  scanTimer = setTimeout(() => {
    scanTimer = null
    scanRenderers()
    attachWatchPageButton()
  }, 200)
}

const observer = new MutationObserver((records) => scheduleScan(records))
observer.observe(document.body, { childList: true, subtree: true })
scanRenderers()
attachWatchPageButton()

let lastContextRenderer = null
document.addEventListener(
  'contextmenu',
  (e) => {
    lastContextRenderer = e.target.closest(VIDEO_RENDERERS)
  },
  true
)

function rendererForSave() {
  if (lastContextRenderer?.isConnected) return lastContextRenderer
  if (videoIdFromUrl(window.location.href)) return null // watch page handled separately
  return document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)?.closest(VIDEO_RENDERERS) || document.querySelector(VIDEO_RENDERERS)
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SAVE_YOUTUBE_VIDEO') {
    const watchPayload = buildWatchPagePayload()
    if (watchPayload) {
      sendSave(watchPayload, null, sendResponse)
      return true
    }
    const renderer = rendererForSave()
    const payload = renderer ? buildPayloadFromRenderer(renderer) : null
    sendSave(payload, null, sendResponse)
    return true
  }

  if (msg.type !== 'SAVE_PAGE') return

  const watchPayload = buildWatchPagePayload()
  if (watchPayload) {
    sendSave(watchPayload, null, sendResponse)
    return true
  }

  const hovered = document.querySelector(`${VIDEO_RENDERERS}:hover`)
  const renderer = hovered || rendererForSave()
  if (renderer) {
    const payload = buildPayloadFromRenderer(renderer)
    sendSave(payload, null, sendResponse)
    return true
  }

  sendSave(buildWatchPagePayload(), null, sendResponse)
  return true
})
