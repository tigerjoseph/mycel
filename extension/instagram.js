function bestImage(article) {
  const imgs = [...article.querySelectorAll('img')]
    .map((img) => img.src)
    .filter((src) => src && !src.includes('data:') && src.includes('cdninstagram'))
  return [...new Set(imgs)]
}

function videoUrl(article) {
  const video = article.querySelector('video')
  return video?.src || video?.querySelector('source')?.src || null
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

function buildPayload(article) {
  const payload = {
    url: postUrl(article),
    caption: caption(article),
    imageUrls: bestImage(article),
    videoUrl: videoUrl(article),
    source: 'instagram',
    tags: []
  }

  const profile = window.location.pathname.match(/^\/([^/]+)\/?$/)
  if (profile && !['p', 'reel', 'reels', 'stories', 'explore'].includes(profile[1])) {
    payload.tags.push(profile[1].toLowerCase())
  }

  return payload
}

function attachSaveButton(article) {
  if (article.dataset.mycelBound) return
  article.dataset.mycelBound = '1'
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

function scan() {
  document.querySelectorAll('article').forEach(attachSaveButton)
}

const observer = new MutationObserver(() => scan())
observer.observe(document.body, { childList: true, subtree: true })
scan()

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'SAVE_PAGE') return

  const article = document.querySelector('article:hover') || document.querySelector('article')
  if (article) {
    chrome.runtime.sendMessage({ type: 'SAVE', payload: buildPayload(article) }, sendResponse)
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
