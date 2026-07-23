/** Generic save handler for non-Instagram pages (⌘⇧S, popup, etc.) */

function embedUrlFromPage(url) {
  const ig = url.match(/instagram\.com\/(p|reel|reels)\/([^/?#]+)/i)
  if (ig) {
    const kind = ig[1].toLowerCase() === 'p' ? 'p' : 'reel'
    return `https://www.instagram.com/${kind}/${ig[2]}/embed/`
  }
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&/?#]+)/i)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  return null
}

function remoteVideoUrl() {
  const ogVideo =
    document.querySelector('meta[property="og:video:url"]')?.getAttribute('content') ||
    document.querySelector('meta[property="og:video"]')?.getAttribute('content') ||
    document.querySelector('meta[property="og:video:secure_url"]')?.getAttribute('content')

  if (ogVideo?.startsWith('http')) return ogVideo

  const video = document.querySelector('video')
  const src = video?.currentSrc || video?.src || video?.querySelector('source')?.src
  if (src?.startsWith('http') && !src.startsWith('blob:')) return src

  return null
}

function pagePayload() {
  const url = window.location.href
  const title = document.title || url
  const selection = window.getSelection()?.toString().trim()

  if (selection && selection.length > 0) {
    return {
      url,
      title: title.slice(0, 120) || 'Quote',
      selection,
      source: 'web',
      mediaType: 'quote',
      tags: []
    }
  }

  const ogImage =
    document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
    document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')

  const imageUrls = []
  if (ogImage && !ogImage.startsWith('data:')) imageUrls.push(ogImage)

  if (imageUrls.length === 0) {
    const img = [...document.querySelectorAll('img')]
      .map((el) => el.currentSrc || el.src)
      .find((src) => src && !src.startsWith('data:') && src.startsWith('http'))
    if (img) imageUrls.push(img)
  }

  const description =
    document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    document.querySelector('meta[name="description"]')?.getAttribute('content') ||
    ''

  const videoUrl = remoteVideoUrl()
  const embedUrl = embedUrlFromPage(url)

  return {
    url,
    title,
    caption: description,
    imageUrls,
    videoUrl: videoUrl || undefined,
    embedUrl: embedUrl || undefined,
    source: 'web',
    mediaType: videoUrl || embedUrl ? 'video' : imageUrls.length ? 'image' : 'page',
    tags: []
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'SAVE_PAGE') return

  chrome.runtime.sendMessage({ type: 'SAVE', payload: pagePayload() }, (res) => {
    if (chrome.runtime.lastError) {
      sendResponse({ ok: false, error: chrome.runtime.lastError.message })
      return
    }
    sendResponse(res)
  })
  return true
})
