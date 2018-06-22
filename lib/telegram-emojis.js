'use babel';

import TelegramEmojisView from './telegram-emojis-view';
import {
    CompositeDisposable
} from 'atom';
import request from 'request'

export default {
    config: {
        'botToken': {
            type: 'string',
            default: ''
        },
        someSet:{
          type: 'array',
          default: ['asdf','asdfsddf'],
          items:{
            type: 'string'
          }
        },
        someSetting:{
          type: 'object',
          properties:{
            myChildIntOption:{
              type: 'integer',
              default: 5,
              minimum: 0.5,
              maximum: 11.5
            }
          }
        }

    },
    telegramEmojisView: null,
    modalPanel: null,
    subscriptions: null,
    last_message_id: 0,
    marker: null,
    botUrl : '',

    activate(state) {
        this.telegramEmojisView = new TelegramEmojisView(state.telegramEmojisViewState);
        this.modalPanel = atom.workspace.addModalPanel({
            item: this.telegramEmojisView.getElement(),
            visible: false
        });

        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // Register command that toggles this view
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'telegram-emojis:bind': () => this.bind()
        }));

    },

    deactivate() {
        this.modalPanel.destroy();
        this.subscriptions.dispose();
        this.telegramEmojisView.destroy();
    },

    serialize() {
        return {
            telegramEmojisViewState: this.telegramEmojisView.serialize()
        };
    },

    bind() {

        let token = atom.config.get('telegram-emojis.botToken')

        if(token===''){
            atom.notifications.addWarning("Falta configurar el token de telegram en settings.")
            return
        }

        this.botUrl = `https://api.telegram.org/${token}/getUpdates?offset=-1`

        const editor = atom.workspace.getActiveTextEditor()

        if(this.marker==null){
          let range = editor.getSelectedBufferRange()
          this.marker = editor.markBufferRange(range, {invalidate: 'never'})
          editor.decorateMarker(this.marker, {type: 'highlight', class: "highlight-green"})
        }
        this.fetch()

    },

    fetch() {
        this.download().then((message) => {
            if(this.last_message_id!==message.message_id){
              this.last_message_id=message.message_id

              let ago = Math.round(Date.now()/1000) - message.date
              let text = "Mensaje de <b>"
              text += message.from.first_name + " " + message.from.last_name
              text += '</b><br/><br/><p style="font-size:1.5em"> '
              text += message.text
              text += "</p><br/><br/>"
              text += `<i>hace ${Math.round(ago/60)}' ${ago%60}''</i>`
              atom.notifications.addSuccess(text)

              this.updateMarker(message.text)

            }
            setTimeout(this.fetch(),5000)
        }).catch((error) => {
            //atom.notifications.addWarning(error.reason)
            console.log(error)
        })


    },

    updateMarker(text){
      const editor = atom.workspace.getActiveTextEditor()

      let curPos = editor.getCursorBufferPosition()
      let editorView = atom.views.getView(editor)

      editor.selectMarker(this.marker)
      editor.insertText(text)
      atom.commands.dispatch(editorView, "tidalcycles:eval")

      editor.setCursorBufferPosition(curPos)

    },

    download() {
        return new Promise((resolve, reject) => {
            request(this.botUrl, (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    let data = JSON.parse(body)
                    let message = data.result[0].message
                    //todo: check errors
                    resolve(message)
                } else {
                    reject({
                        reason: 'Unable to download page'
                    })
                }
            })
        })



    }


};
