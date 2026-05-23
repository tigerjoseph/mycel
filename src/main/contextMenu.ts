import { Menu, MenuItem, type WebContents } from 'electron'

const MAX_SPELL_SUGGESTIONS = 5

/** Native context menu with spellcheck suggestions (Electron does not add these automatically). */
export function setupContextMenu(webContents: WebContents): void {
  webContents.on('context-menu', (_event, params) => {
    const menu = new Menu()

    if (params.misspelledWord) {
      const suggestions = params.dictionarySuggestions.slice(0, MAX_SPELL_SUGGESTIONS)
      if (suggestions.length > 0) {
        for (const suggestion of suggestions) {
          menu.append(
            new MenuItem({
              label: suggestion,
              click: () => webContents.replaceMisspelling(suggestion)
            })
          )
        }
      } else {
        menu.append(new MenuItem({ label: 'No suggestions', enabled: false }))
      }
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(
        new MenuItem({
          label: 'Add to Dictionary',
          click: () => {
            if (params.misspelledWord) {
              webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
            }
          }
        })
      )
      menu.append(new MenuItem({ type: 'separator' }))
    }

    if (params.editFlags.canCut) menu.append(new MenuItem({ role: 'cut' }))
    if (params.editFlags.canCopy) menu.append(new MenuItem({ role: 'copy' }))
    if (params.editFlags.canPaste) menu.append(new MenuItem({ role: 'paste' }))
    if (params.editFlags.canSelectAll) menu.append(new MenuItem({ role: 'selectAll' }))

    if (menu.items.length > 0) {
      menu.popup()
    }
  })
}
