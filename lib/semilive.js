'use babel';

import 'babel-polyfill';
import { CompositeDisposable } from 'atom';

export default {
  subscriptions: null,
  stepCounter: 0,
  config: {
    scriptFile: {
      type: 'string',
      default: 'semilive/script.json',
    },
    typeSpeed: {
      type: 'integer',
      default: 15,
    },
  },
  scriptFile: null,

  activate(state) {
    this.scriptFile = require(`../${atom.config.get('semilive.scriptFile')}`);

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that play the previous step in the script
    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'semilive:prev': () => this.prev(),
      }),
    );

    // Register command that play the next step in the script
    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'semilive:next': () => this.next(),
      }),
    );

    // Register command that resets the steo counter to 0
    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'semilive:reset': () => this.reset(),
      }),
    );

    if (state.stepCounter) {
      this.stepCounter = state.stepCounter;
    }
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  serialize() {
    return { stepCounter: this.stepCounter };
  },

  prev() {
    if (this.stepCounter > 0) {
      this.stepCounter = this.stepCounter - 1;
      this.next();
    }
  },

  async next() {
    const currentScript = this.scriptFile[this.stepCounter];

    // no more steps
    if (!currentScript) {
      return;
    }

    if (Array.isArray(currentScript)) {
      for (let i = 0; i < currentScript.length; i += 1) {
        await this.performScript(currentScript[i]);
      }
    } else {
      this.performScript(currentScript);
    }

    this.stepCounter = this.stepCounter + 1;
  },

  performScript(script) {
    return new Promise((resolve, reject) => {
      const editor = atom.workspace.getActiveTextEditor();

      if (!script.insert) {
        reject('no intser statement found');
      } else if (!script.highlight) {
        script.highlight = true;
      } else if (!script.instant) {
        script.instant = false;
      }

      if (script.after) {
        // insert `insert` after `after`
        this.find(editor, script.after).then(() => {
          this.insert(editor, script.insert, (script.highlight = true),
          (script.instant = false)).then(() => {
            resolve();
          });
        });
      } else if (script.replace) {
        // replace `replace` with `insert`
        this.replace(editor, script.replace, script.insert,
          script.highlight, script.instant).then(() => {
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
    return new Promise((resolve) => {
      editor.scan(new RegExp(txt, 'g'), (match) => {
        // look just for the first appearance
        match.stop();
        editor.setCursorBufferPosition([
          match.computedRange.end.row,
          match.computedRange.end.column,
        ]);
        editor.insertText('\n', {
          autoIndent: true,
          autoIndentNewline: true,
          autoDecreaseIndent: true,
        });

        resolve();
      });
    });
  },

  replace(editor, oldTxt, newTxt, highlight, instant) {
    return new Promise((resolve) => {
      editor.scan(new RegExp(oldTxt, 'g'), (match) => {
        // look just for the first appearance
        match.stop();

        editor.setSelectedScreenRange([
          [match.computedRange.start.row, match.computedRange.start.column],
          [match.computedRange.end.row, match.computedRange.end.column],
        ]);

        this.insertElem(editor, newTxt, highlight, instant);
        resolve();
      });
    });
  },

  insert(editor, txt, highlight, instant) {
    return new Promise((resolve) => {
      let content = '';

      if (Array.isArray(txt)) {
        txt.forEach((elem) => {
          content += `${elem}\n`;
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
        autoDecreaseIndent: true,
      });
      resolve();
    } else {
      this.slowLoop(editor, elem, 0, highlight, editor.getCursorScreenPosition(), resolve);
    }
  },

  slowLoop(editor, txt, i, highlight, startPos, resolve) {
    setTimeout(() => {
      this.typeChar(editor, txt.charAt(i));
      const next = i + 1;

      if (next < txt.length) {
        this.slowLoop(editor, txt, next, highlight, startPos, resolve);
      } else if (highlight) {
        editor.setSelectedScreenRange([startPos, editor.getCursorScreenPosition()]);
        resolve();
      }
    }, atom.config.get('semilive.typeSpeed'));
  },

  typeChar(editor, ch) {
    editor.insertText(ch, {
      select: false,
      autoIndent: true,
      autoIndentNewline: true,
      autoDecreaseIndent: true,
    });
  },

  reset() {
    this.stepCounter = 0;
  },
};
