/**
 * @module bindings/textarea
 */

import { createMutex } from 'lib0/mutex.js'
import * as math from 'lib0/math.js'
import * as Y from 'yjs'
import * as func from 'lib0/function.js'

/**
 * @param {CodemirrorBinding} binding
 * @param {any} event
 */
const typeObserver = (binding, event) => {
  binding._mux(() => {
    const cmDoc = binding.cmDoc
    const cm = cmDoc.getEditor()
    const performChange = () => {
      const delta = event.delta
      let index = 0
      for (let i = 0; i < event.delta.length; i++) {
        const d = delta[i]
        if (d.retain) {
          index += d.retain
        } else if (d.insert) {
          const pos = cmDoc.posFromIndex(index)
          cmDoc.replaceRange(d.insert, pos, pos, 'prosemirror-binding')
          index += d.insert.length
        } else if (d.delete) {
          const start = cmDoc.posFromIndex(index)
          const end = cmDoc.posFromIndex(index + d.delete)
          cmDoc.replaceRange('', start, end, 'prosemirror-binding')
        }
      }
    }
    // if possible, bundle the changes using cm.operation
    if (cm) {
      cm.operation(performChange)
    } else {
      performChange()
    }
  })
}

const targetObserver = (binding, change) => {
  binding._mux(() => {
    binding.doc.transact(() => {
      const start = binding.cmDoc.indexFromPos(change.from)
      const delLen = change.removed.map(s => s.length).reduce(math.add) + change.removed.length - 1
      if (delLen > 0) {
        binding.type.delete(start, delLen)
      }
      if (change.text.length > 0) {
        binding.type.insert(start, change.text.join('\n'))
      }
    }, binding)
  })
}

const createRemoteCaret = (username, color) => {
  const caret = document.createElement('span')
  caret.classList.add('remote-caret')
  caret.setAttribute('style', `border-color: ${color}`)
  const userDiv = document.createElement('div')
  userDiv.setAttribute('style', `background-color: ${color}`)
  userDiv.insertBefore(document.createTextNode(username), null)
  caret.insertBefore(userDiv, null)
  setTimeout(() => {
    caret.classList.add('hide-name')
  }, 2000)
  return caret
}

const updateRemoteSelection = (y, cm, type, cursors, clientId, awareness) => {
  // redraw caret and selection for clientId
  const aw = awareness.getStates().get(clientId)
  // destroy current text mark
  const m = cursors.get(clientId)
  if (m !== undefined) {
    m.caret.clear()
    if (m.sel !== null) {
      m.sel.clear()
    }
    cursors.delete(clientId)
  }
  if (aw === undefined) {
    return
  }
  const user = aw.user || {}
  if (user.color == null) {
    user.color = '#ffa500'
  }
  if (user.name == null) {
    user.name = `User: ${clientId}`
  }
  const cursor = aw.cursor
  if (cursor == null || cursor.anchor == null || cursor.head == null) {
    return
  }
  const anchor = Y.createAbsolutePositionFromRelativePosition(JSON.parse(cursor.anchor), y)
  const head = Y.createAbsolutePositionFromRelativePosition(JSON.parse(cursor.head), y)
  if (anchor !== null && head !== null && anchor.type === type && head.type === type) {
    const headpos = cm.posFromIndex(head.index)
    const anchorpos = cm.posFromIndex(anchor.index)
    let from, to
    if (head.index < anchor.index) {
      from = headpos
      to = anchorpos
    } else {
      from = anchorpos
      to = headpos
    }
    const caretEl = createRemoteCaret(user.name, user.color)
    // if position was "relatively" the same, do not show name again and hide instead
    if (m && func.equalityFlat(aw.cursor.anchor, m.awCursor.anchor) && func.equalityFlat(aw.cursor.head, m.awCursor.head)) {
      caretEl.classList.add('hide-name')
    }
    const caret = cm.setBookmark(headpos, { widget: caretEl, insertLeft: true })
    let sel = null
    if (head.index !== anchor.index) {
      sel = cm.markText(from, to, { css: `background-color: ${user.color}70`, inclusiveRight: true, inclusiveLeft: false })
    }
    cursors.set(clientId, { caret, sel, awCursor: cursor })
  }
}

const codemirrorCursorActivity = (y, cm, type, awareness) => {
  const aw = awareness.getLocalState()
  if (!cm.hasFocus() || aw == null || !cm.display.wrapper.ownerDocument.hasFocus()) {
    return
  }
  const newAnchor = Y.createRelativePositionFromTypeIndex(type, cm.indexFromPos(cm.getCursor('anchor')))
  const newHead = Y.createRelativePositionFromTypeIndex(type, cm.indexFromPos(cm.getCursor('head')))
  let currentAnchor = null
  let currentHead = null
  if (aw.cursor != null) {
    currentAnchor = Y.createRelativePositionFromJSON(JSON.parse(aw.cursor.anchor))
    currentHead = Y.createRelativePositionFromJSON(JSON.parse(aw.cursor.head))
  }
  if (aw.cursor == null || !Y.compareRelativePositions(currentAnchor, newAnchor) || !Y.compareRelativePositions(currentHead, newHead)) {
    awareness.setLocalStateField('cursor', {
      anchor: JSON.stringify(newAnchor),
      head: JSON.stringify(newHead)
    })
  }
}

/**
 * A binding that binds a YText to a CodeMirror editor.
 *
 * @example
 *   const ytext = ydocument.define('codemirror', Y.Text)
 *   const editor = new CodeMirror(document.querySelector('#container'), {
 *     mode: 'javascript',
 *     lineNumbers: true
 *   })
 *   const binding = new CodemirrorBinding(ytext, editor)
 *
 */
export class CodemirrorBinding {
  /**
   * @param {Y.Text} textType
   * @param {import('codemirror').Editor} codeMirror
   * @param {any} [awareness]
   */
  constructor (textType, codeMirror, awareness) {
    const doc = textType.doc
    const cmDoc = codeMirror.getDoc()
    this.doc = doc
    this.type = textType
    this.cm = codeMirror
    this.cmDoc = cmDoc
    this.awareness = awareness
    // this.undoManager = new Y.UndoManager(textType, { trackedOrigins: new Set([this]) })
    this._mux = createMutex()
    // set initial value
    cmDoc.setValue(textType.toString())
    // observe type and target
    this._typeObserver = event => typeObserver(this, event)
    this._targetObserver = (_, change) => targetObserver(this, change)
    this._cursors = new Map()
    this._awarenessListener = event => {
      if (codeMirror.getDoc() !== cmDoc) {
        return
      }
      const f = clientId => {
        if (clientId !== doc.clientID) {
          updateRemoteSelection(doc, codeMirror, textType, this._cursors, clientId, awareness)
        }
      }

      event.added.forEach(f)
      event.removed.forEach(f)
      event.updated.forEach(f)
    }
    this._cursorListener = () => {
      if (codeMirror.getDoc() === cmDoc) {
        codemirrorCursorActivity(doc, codeMirror, textType, awareness)
      }
    }
    this._blurListeer = () => awareness.setLocalStateField('cursor', null)

    textType.observe(this._typeObserver)
    // @ts-ignore
    cmDoc.on('change', this._targetObserver)
    if (awareness) {
      codeMirror.on('swapDoc', this._blurListeer)
      awareness.on('change', this._awarenessListener)
      // @ts-ignore
      cmDoc.on('cursorActivity', this._cursorListener)
      codeMirror.on('blur', this._blurListeer)
      codeMirror.on('focus', this._cursorListener)
    }
  }

  destroy () {
    this.type.unobserve(this._typeObserver)
    this.cm.off('swapDoc', this._blurListeer)
    // @ts-ignore
    this.cmDoc.off('change', this._targetObserver)
    this.cm.off('cursorActivity', this._cursorListener)
    this.cm.off('focus', this._cursorListener)
    this.cm.off('blur', this._blurListeer)
    if (this.awareness) {
      this.awareness.off('change', this._awarenessListener)
    }
    this.type = null
    this.cm = null
    this.cmDoc = null
    // this.undoManager.destroy()
  }
}

export const CodeMirrorBinding = CodemirrorBinding
