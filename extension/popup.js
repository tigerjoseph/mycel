const status = document.getElementById('status')
const saveBtn = document.getElementById('save')

function setStatus(connected, message) {
  status.textContent = message
  status.className = connected ? 'status ok' : 'status err'
}

chrome.runtime.sendMessage({ type: 'PING' }, (res) => {
  if (res?.ok) {
    setStatus(true, 'Connected to Mycel')
  } else {
    setStatus(false, 'Open Mycel on your Mac first')
  }
})

saveBtn.addEventListener('click', () => {
  saveBtn.disabled = true
  saveBtn.textContent = 'Saving…'

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.id) {
      setStatus(false, 'No active tab')
      saveBtn.disabled = false
      saveBtn.textContent = 'Save this tab'
      return
    }

    chrome.tabs.sendMessage(tab.id, { type: 'SAVE_PAGE' }, (res) => {
      if (chrome.runtime.lastError || !res) {
        chrome.runtime.sendMessage({ type: 'SAVE', payload: {
          url: tab.url || '',
          title: tab.title || 'Page',
          source: 'web',
          mediaType: 'page',
          tags: []
        } }, (fallback) => {
          saveBtn.disabled = false
          saveBtn.textContent = 'Save this tab'
          if (fallback?.ok) {
            setStatus(true, 'Saved to Mindspace')
            setTimeout(() => window.close(), 400)
          } else {
            setStatus(false, fallback?.error?.slice(0, 40) || 'Save failed')
          }
        })
        return
      }

      saveBtn.disabled = false
      saveBtn.textContent = 'Save this tab'
      if (res.ok) {
        setStatus(true, 'Saved to Mindspace')
        setTimeout(() => window.close(), 400)
      } else {
        setStatus(false, res.error?.slice(0, 40) || 'Save failed')
      }
    })
  })
})
