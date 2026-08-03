function bestImage(article) {
  const imgs = [...article.querySelectorAll('img')]
    .map((img) => img.src)
    .filter((src) => src && !src.includes('data:') && src.includes('cdninstagram'))
  return [...new Set(imgs)]
}

function videoUrl(article) {
  const video = article.querySelector('video')
  const src = video?.src || video?.querySelector('source')?.src
  if (src && src.startsWith('http') && !src.startsWith('blob:')) return src
  return null
}

function videoPoster(article) {
  const video = article.querySelector('video')
  const poster = video?.getAttribute('poster')
  if (poster && poster.startsWith('http')) return poster
  return null
}

function hasVideo(article) {
  return Boolean(article.querySelector('video'))
}

function embedUrlFromPost(url) {
  const match = url.match(/instagram\.com\/(p|reel|reels)\/([^/?#]+)/i)
  if (!match) return null
  const kind = match[1].toLowerCase() === 'p' ? 'p' : 'reel'
  return `https://www.instagram.com/${kind}/${match[2]}/embed/`
}

const IG_RESERVED = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct', 'tv'])

function profileTagFromPage() {
  const profile = window.location.pathname.match(/^\/([^/]+)\/?$/)
  if (profile && !IG_RESERVED.has(profile[1].toLowerCase())) {
    return profile[1].toLowerCase()
  }
  return null
}

function profileTagFromUrl(url) {
  const match = url.match(/instagram\.com\/([^/]+)\/(p|reel|reels)\//i)
  if (match && !IG_RESERVED.has(match[1].toLowerCase())) {
    return match[1].toLowerCase()
  }
  return null
}

function caption(article) {
  const candidates = [
    ...article.querySelectorAll('h1'),
    ...article.querySelectorAll('span[dir="auto"]'),
    ...article.querySelectorAll('div._a9zs span')
  ]
  for (const el of candidates) {
    const text = el.textContent?.trim()
    if (text && text.length > 8 && text.length < 5000) return text
  }
  return ''
}

function postUrl(article) {
  const link = article.querySelector('a[href*="/p/"], a[href*="/reel/"]')
  if (!link) return window.location.href
  return new URL(link.getAttribute('href'), window.location.origin).href
}

let lastContextArticle = null

document.addEventListener(
  'contextmenu',
  (e) => {
    lastContextArticle = e.target.closest('article')
  },
  true
)

function findArticleFromLink(linkUrl) {
  if (!linkUrl) return null
  try {
    const path = new URL(linkUrl, window.location.origin).pathname
    const match = path.match(/\/(p|reel|reels)\/([^/]+)/)
    if (!match) return null
    const id = match[2]
    for (const article of document.querySelectorAll('article')) {
      if (article.querySelector(`a[href*="/${id}"]`)) return article
    }
    // Post dialog / modal may use role=dialog
    const dialog = document.querySelector('div[role="dialog"]')
    if (dialog) {
      const dialogArticle = dialog.querySelector('article')
      if (dialogArticle?.querySelector(`a[href*="/${id}"]`)) return dialogArticle
    }
  } catch {
    // ignore
  }
  return null
}

function findGridLinkFromUrl(linkUrl) {
  if (!linkUrl) return null
  try {
    const path = new URL(linkUrl, window.location.origin).pathname
    const match = path.match(/\/(p|reel|reels)\/([^/]+)/)
    if (!match) return null
    const id = match[2]
    for (const link of document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')) {
      if (link.closest('article')) continue
      if (link.getAttribute('href')?.includes(id)) return link
    }
  } catch {
    // ignore
  }
  return null
}

function articleForSave({ linkUrl, imageUrl } = {}) {
  if (lastContextArticle?.isConnected) return lastContextArticle

  const pageMatch = window.location.pathname.match(/\/(p|reel|reels)\/([^/]+)/)
  if (pageMatch) {
    const onPage = document.querySelector('div[role="dialog"] article') || document.querySelector('article')
    if (onPage) return onPage
  }

  const fromLink = findArticleFromLink(linkUrl || window.location.href)
  if (fromLink) return fromLink
  if (imageUrl) {
    for (const article of document.querySelectorAll('article')) {
      const imgs = [...article.querySelectorAll('img')]
      if (imgs.some((img) => img.src === imageUrl || imageUrl.startsWith(img.src.split('?')[0]))) {
        return article
      }
    }
  }
  return document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)?.closest('article') || document.querySelector('div[role="dialog"] article') || document.querySelector('article')
}

function buildPayload(article) {
  const url = postUrl(article)
  const images = bestImage(article)
  const poster = videoPoster(article)
  if (poster && !images.includes(poster)) images.unshift(poster)

  const payload = {
    url,
    caption: caption(article),
    imageUrls: images,
    videoUrl: videoUrl(article),
    embedUrl: embedUrlFromPost(url),
    source: 'instagram',
    tags: ['instagram']
  }

  if (hasVideo(article)) payload.mediaType = 'video'

  const pageTag = profileTagFromPage() || profileTagFromUrl(url)
  if (pageTag) payload.tags.push(pageTag)

  return payload
}

function buildPayloadFromLink(link) {
  const url = new URL(link.getAttribute('href'), window.location.origin).href
  const images = []
  const img = link.querySelector('img')
  if (img?.src && !img.src.startsWith('data:') && img.src.includes('cdninstagram')) {
    images.push(img.src)
  }

  const payload = {
    url,
    caption: '',
    imageUrls: images,
    embedUrl: embedUrlFromPost(url),
    source: 'instagram',
    tags: ['instagram'],
    mediaType: images.length ? 'image' : 'page'
  }

  const pageTag = profileTagFromPage() || profileTagFromUrl(url)
  if (pageTag) payload.tags.push(pageTag)

  return payload
}

function attachSaveButton(article) {
  if (article.dataset.mycelBound) return
  article.dataset.mycelBound = '1'
  article.classList.add('mycel-target')
  article.style.position = 'relative'

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'mycel-save-btn'
  btn.textContent = '+ Mycel'
  article.appendChild(btn)

  article.addEventListener('mouseenter', () => btn.classList.add('mycel-visible'))
  article.addEventListener('mouseleave', () => btn.classList.remove('mycel-visible'))

  btn.addEventListener('click', async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (btn.classList.contains('mycel-saving')) return

    btn.classList.add('mycel-saving')
    btn.textContent = 'Saving…'

    const payload = buildPayload(article)

    chrome.runtime.sendMessage({ type: 'SAVE', payload }, (res) => {
      btn.classList.remove('mycel-saving')
      if (chrome.runtime.lastError) {
        btn.textContent = 'Open Mycel first'
        setTimeout(() => { btn.textContent = '+ Mycel' }, 2500)
        return
      }
      if (res?.ok) {
        btn.classList.add('mycel-saved')
        btn.textContent = 'Saved ✓'
        setTimeout(() => {
          btn.classList.remove('mycel-saved', 'mycel-visible')
          btn.textContent = '+ Mycel'
        }, 1600)
      } else {
        btn.textContent = res?.error?.slice(0, 28) || 'Failed'
        setTimeout(() => {
          btn.textContent = '+ Mycel'
        }, 2500)
      }
    })
  })
}

function attachGridSaveButton(link) {
  if (link.dataset.mycelGridBound) return
  if (link.closest('article')) return
  link.dataset.mycelGridBound = '1'

  const container = link.closest('div') || link
  container.classList.add('mycel-target')
  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative'
  }

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'mycel-save-btn'
  btn.textContent = '+ Mycel'
  container.appendChild(btn)

  container.addEventListener('mouseenter', () => btn.classList.add('mycel-visible'))
  container.addEventListener('mouseleave', () => btn.classList.remove('mycel-visible'))

  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (btn.classList.contains('mycel-saving')) return

    btn.classList.add('mycel-saving')
    btn.textContent = 'Saving…'

    const payload = buildPayloadFromLink(link)

    chrome.runtime.sendMessage({ type: 'SAVE', payload }, (res) => {
      btn.classList.remove('mycel-saving')
      if (chrome.runtime.lastError) {
        btn.textContent = 'Open Mycel first'
        setTimeout(() => { btn.textContent = '+ Mycel' }, 2500)
        return
      }
      if (res?.ok) {
        btn.classList.add('mycel-saved')
        btn.textContent = 'Saved ✓'
        setTimeout(() => {
          btn.classList.remove('mycel-saved', 'mycel-visible')
          btn.textContent = '+ Mycel'
        }, 1600)
      } else {
        btn.textContent = res?.error?.slice(0, 28) || 'Failed'
        setTimeout(() => {
          btn.textContent = '+ Mycel'
        }, 2500)
      }
    })
  })
}

function scan() {
  document.querySelectorAll('article').forEach(attachSaveButton)
  document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]').forEach(attachGridSaveButton)
}

function scanAddedNodes(records) {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue
      const el = node
      if (el.matches?.('article')) attachSaveButton(el)
      el.querySelectorAll?.('article').forEach(attachSaveButton)
      if (el.matches?.('a[href*="/p/"], a[href*="/reel/"]')) attachGridSaveButton(el)
      el.querySelectorAll?.('a[href*="/p/"], a[href*="/reel/"]').forEach(attachGridSaveButton)
    }
  }
}

let scanTimer = null
function scheduleScan(records) {
  if (records?.length) scanAddedNodes(records)
  if (scanTimer) return
  scanTimer = setTimeout(() => {
    scanTimer = null
    scan()
  }, 200)
}

const observer = new MutationObserver((records) => scheduleScan(records))
observer.observe(document.body, { childList: true, subtree: true })
scan()

function saveArticle(article, sendResponse) {
  if (!article) {
    sendResponse({ ok: false, error: 'No Instagram post here — right-click on a post in the feed' })
    return
  }
  chrome.runtime.sendMessage({ type: 'SAVE', payload: buildPayload(article) }, (res) => {
    if (chrome.runtime.lastError) {
      sendResponse({ ok: false, error: chrome.runtime.lastError.message })
      return
    }
    sendResponse(res)
  })
}

function saveFromLink(link, sendResponse) {
  if (!link) {
    sendResponse({ ok: false, error: 'No Instagram post here — try a profile grid post or open the post first' })
    return
  }
  chrome.runtime.sendMessage({ type: 'SAVE', payload: buildPayloadFromLink(link) }, (res) => {
    if (chrome.runtime.lastError) {
      sendResponse({ ok: false, error: chrome.runtime.lastError.message })
      return
    }
    sendResponse(res)
  })
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SAVE_INSTAGRAM_POST') {
    const article = articleForSave(msg)
    if (article) {
      saveArticle(article, sendResponse)
      return true
    }
    const gridLink = findGridLinkFromUrl(msg.linkUrl || window.location.href)
    if (gridLink) {
      saveFromLink(gridLink, sendResponse)
      return true
    }
    saveArticle(null, sendResponse)
    return true
  }

  if (msg.type !== 'SAVE_PAGE') return

  const article = document.querySelector('div[role="dialog"] article:hover') ||
    document.querySelector('article:hover') ||
    document.querySelector('div[role="dialog"] article') ||
    document.querySelector('article')
  if (article) {
    saveArticle(article, sendResponse)
    return true
  }

  const gridLink = document.querySelector('a[href*="/p/"]:hover, a[href*="/reel/"]:hover')
  if (gridLink && !gridLink.closest('article')) {
    saveFromLink(gridLink, sendResponse)
    return true
  }

  chrome.runtime.sendMessage({
    type: 'SAVE',
    payload: {
      url: window.location.href,
      title: document.title,
      imageUrls: [...document.querySelectorAll('img')]
        .map((i) => i.src)
        .filter((s) => s && !s.startsWith('data:'))
        .slice(0, 1),
      source: 'instagram',
      mediaType: 'page',
      tags: ['instagram']
    }
  }, sendResponse)
  return true
})
