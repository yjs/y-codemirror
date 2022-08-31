// @ts-nocheck

import fs from 'fs'
import jsdom from 'jsdom'

const documentContent = fs.readFileSync('test.html')
const { window } = new jsdom.JSDOM(documentContent)

global.window = window
global.document = window.document
global.innerHeight = 0
global.navigator = {}
document.getSelection = () => ({ })

document.createRange = () => ({
  setStart () {},
  setEnd () {},
  getClientRects () {
    return {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0
    }
  },
  getBoundingClientRect () {
    return {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0
    }
  }
})

import('./index.js').then(() => {
  console.log('')
})
