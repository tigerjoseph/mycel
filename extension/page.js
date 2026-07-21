/** Generic save handler for non-Instagram pages (⌘⇧S, popup, etc.) */

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

  return {
    url,
    title,
    caption: description,
    imageUrls,
    source: 'web',
    mediaType: imageUrls.length ? 'image' : 'page',
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
