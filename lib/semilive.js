'use babel';

import "babel-polyfill";
import {CompositeDisposable} from 'atom';

export default {

  subscriptions : null,
  stepCounter : 0,
  config : null,
  typeSpeed : 15,

  activate(state) {
    // TODO: allow dynamic file loading
    this.config = require('../config/test');

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that play the previous step in the script
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'semilive:prev': () => this.prev()
    }));

    // Register command that play the next step in the script
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'semilive:next': () => this.next()
    }));

    // Register command that resets the steo counter to 0
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'semilive:reset': () => this.reset()
    }));

    if (state.stepCounter) {
      this.stepCounter = state.stepCounter;
    }
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  serialize() {
    return {stepCounter: this.stepCounter}
  },

  prev() {
    if (this.stepCounter > 0) {
      this.stepCounter--;
      this.next();
    }
  },

  async next() {
    let currentScript = this.config[this.stepCounter];

    // no more steps
    if (!currentScript) {
      return;
    }

    if (Array.isArray(currentScript)) {
      for (let i = 0; i < currentScript.length; i++) {
        await this.performScript(currentScript[i]);
      }
    } else {
      this.performScript(currentScript);
    }

    this.stepCounter++;
  },

  performScript(script) {
    return new Promise((resolve, reject) => {
      let editor = atom.workspace.getActiveTextEditor();

      if (!script.hasOwnProperty('insert')) {
        reject('no intser statement found');
      } else if (!script.hasOwnProperty('highlight')) {
        script.highlight = true;
      } else if (!script.hasOwnProperty('instant')) {
        script.instant = false;
      }

      if (script.hasOwnProperty('after')) {
        // insert `insert` after `after`
        this.find(editor, script.after).then(() => {
          this.insert(editor, script.insert, script.highlight = true, script.instant = false).then(() => {
            resolve();
          });
        });
      } else if (script.hasOwnProperty('replace')) {
        // replace `replace` with `insert`
        this.replace(editor, script.replace, script.insert, script.highlight, script.instant).then(() => {
          resolve();
        });
      } else {
        // just insert `insert` at current position
        this.insert(editor, script.insert, script.highlight, script.instant).then(() => {
          resolve();
        });
      }
    });
  },

  find(editor, txt) {
    return new Promise((resolve, reject) => {
      editor.scan(new RegExp(txt, 'g'), (match) => {
        // look just for the first appearance
        match.stop();
        editor.setCursorBufferPosition([match.computedRange.end.row, match.computedRange.end.column]);
        editor.insertText('\n', {
          autoIndent: true,
          autoIndentNewline: true,
          autoDecreaseIndent: true
        });

        resolve();
      });
    });
  },

  replace(editor, oldTxt, newTxt, highlight, instant) {
    return new Promise((resolve, reject) => {
      editor.scan(new RegExp(oldTxt, 'g'), (match) => {
        // look just for the first appearance
        match.stop();

        editor.setSelectedScreenRange([
          [
            match.computedRange.start.row, match.computedRange.start.column
          ],
          [match.computedRange.end.row, match.computedRange.end.column]
        ]);

        this.insertElem(editor, newTxt, highlight, instant);
        resolve();
      });
    });
  },

  insert(editor, txt, highlight, instant) {
    return new Promise((resolve, reject) => {
      let content = '';

      if (Array.isArray(txt)) {
        txt.forEach(function(elem) {
          content += elem + '\n'
        });
      } else {
        content = txt;
      }

      this.insertElem(editor, content, highlight, instant, resolve);
    });
  },

  insertElem(editor, elem, highlight, instant, resolve) {
    if (instant) {
      editor.insertText(elem, {
        select: highlight,
        autoIndent: true,
        autoIndentNewline: true,
        autoDecreaseIndent: true
      });
      resolve();
    } else {
      this.slowLoop(editor, elem, 0, highlight, editor.getCursorScreenPosition(), resolve);
    }
  },

  slowLoop(editor, txt, i, highlight, startPos, resolve) {
    setTimeout(function() {
      this.typeChar(editor, txt.charAt(i));

      if (i++ < txt.length) {
        this.slowLoop(editor, txt, i, highlight, startPos, resolve);
      } else {
        if (highlight) {
          editor.setSelectedScreenRange([startPos, editor.getCursorScreenPosition()]);
          resolve();
        }
      }

    }.bind(this), this.typeSpeed);
  },

  typeChar(editor, ch) {
    editor.insertText(ch, {
      select: false,
      autoIndent: true,
      autoIndentNewline: true,
      autoDecreaseIndent: true
    });
  },

  reset() {
    this.stepCounter = 0;
  }

};
