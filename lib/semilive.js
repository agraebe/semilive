'use babel';

import SemiliveView from './semilive-view';
import { CompositeDisposable } from 'atom';

export default {

  semiliveView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.semiliveView = new SemiliveView(state.semiliveViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.semiliveView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'semilive:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.semiliveView.destroy();
  },

  serialize() {
    return {
      semiliveViewState: this.semiliveView.serialize()
    };
  },

  toggle() {
    console.log('Semilive was toggled!');
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
