/* eslint-env browser */

import * as Y from 'yjs'
import { CodemirrorBinding } from 'y-codemirror'
import { WebrtcProvider } from 'y-webrtc'
import CodeMirror from 'codemirror'
import 'codemirror/mode/javascript/javascript.js'

window.addEventListener('load', () => {
  const ydoc = new Y.Doc()
  const provider = new WebrtcProvider('codemirror-demo-room-x', ydoc)
  const yText = ydoc.getText('codemirror')
  const yUndoManager = new Y.UndoManager(yText, {
    // Add all origins that you want to track. The editor binding adds itself automatically.
    trackedOrigins: new Set([])
  })

  const editorContainer = document.createElement('div')
  editorContainer.setAttribute('id', 'editor')
  document.body.insertBefore(editorContainer, null)
  const editor = CodeMirror(editorContainer, {
    mode: 'javascript',
    lineNumbers: true
  })

  const binding = new CodemirrorBinding(yText, editor, provider.awareness, {
    yUndoManager
  })

  const connectBtn = /** @type {HTMLElement} */ (document.getElementById('y-connect-btn'))
  connectBtn.addEventListener('click', () => {
    if (provider.shouldConnect) {
      provider.disconnect()
      connectBtn.textContent = 'Connect'
    } else {
      provider.connect()
      connectBtn.textContent = 'Disconnect'
    }
  })

  // @ts-ignore
  window.example = { provider, ydoc, yText, binding, yUndoManager }
})
