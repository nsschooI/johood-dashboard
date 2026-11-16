const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  getSettings:  ()  => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  startMacro:   (s) => ipcRenderer.invoke('start-macro', s),
  stopMacro:    ()  => ipcRenderer.invoke('stop-macro'),
  macroStatus:  ()  => ipcRenderer.invoke('macro-status'),
  openAhkSite:  ()  => ipcRenderer.invoke('open-ahk-site'),

  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowClose:    () => ipcRenderer.send('window-close'),

  onSettingsLoaded: (cb) => ipcRenderer.on('settings-loaded', (_, data) => cb(data)),
  onMacroStatus:    (cb) => ipcRenderer.on('macro-status',    (_, data) => cb(data))
})
