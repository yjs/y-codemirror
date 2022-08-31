
import * as t from 'lib0/testing'
import * as prng from 'lib0/prng'
import * as math from 'lib0/math'
import * as Y from 'yjs' // eslint-disable-line
import { applyRandomTests } from 'yjs/tests/testHelper.js'

import CodeMirror from 'codemirror'
import { CodemirrorBinding } from '../src/y-codemirror.js'

/**
 * @param {t.TestCase} tc
 */
export const testUndoManager = tc => {
  const editor = CodeMirror(document.createElement('div'), {
    mode: 'javascript',
    lineNumbers: true
  })
  const ydoc = new Y.Doc()
  const ytext = ydoc.getText()
  ytext.insert(0, 'abc')
  const yUndoManager = new Y.UndoManager(ytext)
  const binding = new CodemirrorBinding(ytext, editor, null, { yUndoManager })
  editor.setSelection(editor.posFromIndex(1), editor.posFromIndex(2))
  editor.replaceSelection('')
  const posAfterAnchor = editor.indexFromPos(editor.getCursor('anchor'))
  const posAfterHead = editor.indexFromPos(editor.getCursor('head'))
  yUndoManager.undo()
  const posBeforeAnchor = editor.indexFromPos(editor.getCursor('anchor'))
  const posBeforeHead = editor.indexFromPos(editor.getCursor('head'))
  t.assert(posBeforeAnchor === 1 && posBeforeHead === 2)
  yUndoManager.redo()
  t.assert(
    editor.indexFromPos(editor.getCursor('anchor')) === posAfterAnchor &&
    editor.indexFromPos(editor.getCursor('head')) === posAfterHead
  )
  yUndoManager.undo()
  t.assert(
    editor.indexFromPos(editor.getCursor('anchor')) === posBeforeAnchor &&
    editor.indexFromPos(editor.getCursor('head')) === posBeforeHead
  )
  // destroy binding and check that undo still works
  binding.destroy()
  yUndoManager.redo()
  t.assert(ytext.toString() === 'ac')
  yUndoManager.undo()
  t.assert(ytext.toString() === 'abc')
}

/**
 * @param {any} y
 * @return {CodeMirror.Editor}
 */
const createNewCodemirror = y => {
  const editor = CodeMirror(document.createElement('div'), {
    mode: 'javascript',
    lineNumbers: true
  })
  const binding = new CodemirrorBinding(y.getText('codemirror'), editor)
  return binding.cm
}

let charCounter = 0

const cmChanges = [
  /**
   * @param {Y.Doc} y
   * @param {prng.PRNG} gen
   * @param {CodeMirror.Editor} cm
   */
  (y, gen, cm) => { // insert text
    const insertPos = prng.int32(gen, 0, cm.getValue().length)
    const text = charCounter++ + prng.utf16String(gen, 6)
    const pos = cm.posFromIndex(insertPos)
    cm.replaceRange(text, pos, pos)
  },
  /**
   * @param {Y.Doc} y
   * @param {prng.PRNG} gen
   * @param {CodeMirror.Editor} cm
   */
  (y, gen, cm) => { // delete text
    const insertPos = prng.int32(gen, 0, cm.getValue().length)
    const overwrite = prng.int32(gen, 0, cm.getValue().length - insertPos)
    cm.replaceRange('', cm.posFromIndex(insertPos), cm.posFromIndex(insertPos + overwrite))
  },
  /**
   * @param {Y.Doc} y
   * @param {prng.PRNG} gen
   * @param {CodeMirror.Editor} cm
   */
  (y, gen, cm) => { // replace text
    const insertPos = prng.int32(gen, 0, cm.getValue().length)
    const overwrite = math.min(prng.int32(gen, 0, cm.getValue().length - insertPos), 3)
    const text = charCounter++ + prng.word(gen)
    cm.replaceRange(text, cm.posFromIndex(insertPos), cm.posFromIndex(insertPos + overwrite))
  },
  /**
   * @param {Y.Doc} y
   * @param {prng.PRNG} gen
   * @param {CodeMirror.Editor} cm
   */
  (y, gen, cm) => { // insert paragraph
    const insertPos = prng.int32(gen, 0, cm.getValue().length)
    const overwrite = math.min(prng.int32(gen, 0, cm.getValue().length - insertPos), 3)
    const text = '\n'
    cm.replaceRange(text, cm.posFromIndex(insertPos), cm.posFromIndex(insertPos + overwrite))
  }
]

/**
 * @param {any} result
 */
const checkResult = result => {
  for (let i = 1; i < result.testObjects.length; i++) {
    const p1 = result.testObjects[i - 1].getValue()
    const p2 = result.testObjects[i].getValue()
    t.compare(p1, p2)
  }
  // console.log(result.testObjects[0].getValue())
  charCounter = 0
}

/**
 * @param {t.TestCase} tc
 */
export const testRepeatGenerateProsemirrorChanges2 = tc => {
  checkResult(applyRandomTests(tc, cmChanges, 2, createNewCodemirror))
}

/**
 * @param {t.TestCase} tc
 */
export const testRepeatGenerateProsemirrorChanges3 = tc => {
  checkResult(applyRandomTests(tc, cmChanges, 3, createNewCodemirror))
}

/**
 * @param {t.TestCase} tc
 */
export const testRepeatGenerateProsemirrorChanges30 = tc => {
  checkResult(applyRandomTests(tc, cmChanges, 30, createNewCodemirror))
}

/**
 * @param {t.TestCase} tc
 */
export const testRepeatGenerateProsemirrorChanges40 = tc => {
  checkResult(applyRandomTests(tc, cmChanges, 40, createNewCodemirror))
}

/**
 * @param {t.TestCase} tc
 */
export const testRepeatGenerateProsemirrorChanges70 = tc => {
  checkResult(applyRandomTests(tc, cmChanges, 70, createNewCodemirror))
}

/**
 * @param {t.TestCase} tc
 */
export const testRepeatGenerateProsemirrorChanges100 = tc => {
  checkResult(applyRandomTests(tc, cmChanges, 100, createNewCodemirror))
}

/**
 * @param {t.TestCase} tc
 */
export const testRepeatGenerateProsemirrorChanges300 = tc => {
  checkResult(applyRandomTests(tc, cmChanges, 300, createNewCodemirror))
}
