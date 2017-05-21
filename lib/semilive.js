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
    if(this.stepCounter > 0) {
      this.stepCounter--;
      this.next();
    }
  },

  next() {
    let currentScript = this.config[this.stepCounter];

    if (Array.isArray(currentScript)) {
      currentScript.forEach(function(substep) {
        // TODO: fix the race condition - use await
        this.performScript(substep);
      }.bind(this));
    } else {
      this.performScript(currentScript);
    }

    this.stepCounter++;
  },

  performScript(script) {
    let editor = atom.workspace.getActiveTextEditor();

    if (!script.hasOwnProperty('insert')) {
      return;
    } else if (!script.hasOwnProperty('highlight')) {
      script.highlight = true;
    } else if (!script.hasOwnProperty('instant')) {
      script.instant = false;
    }

    if (script.hasOwnProperty('after')) {
      // insert `insert` after `after`
      this.find(editor, script.after).then(() => {
        this.insert(editor, script.insert, script.highlight = true, script.instant = false);
      }).catch(err => {
        // ignore
      });
    } else if (script.hasOwnProperty('replace')) {
      // replace `replace` with `insert`
      this.replace(editor, script.replace, script.insert);
    } else {
      // just insert `insert` at current position
      this.insert(editor, script.insert, script.highlight, script.instant);
    }
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

  replace(editor, oldTxt, newTxt) {
    editor.scan(new RegExp(oldTxt, 'g'), (match) => {
      // look just for the first appearance
      match.stop();
      editor.setCursorBufferPosition([match.computedRange.end.row, match.computedRange.end.column]);

      // TODO: replace char-by-char
      match.replace(newTxt);
    });
  },

  insert(editor, txt, highlight, instant) {
    let content = '';

    if (Array.isArray(txt)) {
      txt.forEach(function(elem) {
        content += elem + '\n'
      });
    } else {
      content = txt;
    }

    this.insertElem(editor, content, highlight, instant);
  },

  insertElem(editor, elem, highlight, instant) {
    if (instant) {
      editor.insertText(elem, {
        select: highlight,
        autoIndent: true,
        autoIndentNewline: true,
        autoDecreaseIndent: true
      });
    } else {
      this.slowLoop(editor, elem, 0, highlight, editor.getCursorScreenPosition());
    }
  },

  slowLoop(editor, txt, i, highlight, startPos) {
    setTimeout(function() {
      this.typeChar(editor, txt.charAt(i));

      if (i++ < txt.length) {
        this.slowLoop(editor, txt, i, highlight, startPos);
      } else {
        if (highlight) {
          editor.setSelectedScreenRange([startPos, editor.getCursorScreenPosition()]);
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
