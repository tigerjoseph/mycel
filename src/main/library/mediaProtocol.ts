import { protocol, net } from 'electron'
import { pathToFileURL } from 'url'

export function registerLibraryMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'mycel-media',
      privileges: {
        secure: true,
        standard: true,
        supportFetchAPI: true,
        bypassCSP: true,
        stream: true,
        corsEnabled: true
      }
    }
  ])
}

export function setupLibraryMediaProtocol(): void {
  protocol.handle('mycel-media', (request) => {
    const prefix = 'mycel-media://local/'
    if (!request.url.startsWith(prefix)) {
      return new Response('Bad request', { status: 400 })
    }
    const filePath = decodeURIComponent(request.url.slice(prefix.length))
    return net.fetch(pathToFileURL(filePath).toString())
  })
}
