import { Generate, chat, eventSource, event_types, messageFormatting, saveChatConditional, substituteParams } from '../../../../script.js';
import { ContextMenu } from './src/ContextMenu.js';
import { MenuItem } from './src/MenuItem.js';




const log = (...msg)=>console.log('[MFC]', ...msg);
const busy = ()=>{
    /**@type {HTMLElement} */
    const el = document.querySelector('.mes_stop');
    return el.offsetHeight !== 0 || el.offsetWidth !== 0;
};

let isListening = false;
let startMes;
eventSource.on(event_types.GENERATION_STARTED, async(type)=>{
    if (type != 'continue') return;
    isListening = true;
    const mes = chat.slice(-1)[0];
    if (!mes.continueHistory) {
        mes.continueHistory = mes.swipes.map(it=>({
            mes: it,
            swipes: [],
            parent: [],
        }));
        mes.continueSwipeId = mes.swipe_id;
        mes.continueSwipe = mes.continueHistory[mes.swipe_id];
    }
    startMes = mes.mes;
    log('[GENERATION_STARTED]', chat.slice(-1)[0].mes, chat.slice(-1)[0]);
});

const makeSwipeDom = ()=>{
    Array.from(document.querySelectorAll('#chat .mes:not(.last_mes) .mfc--root')).forEach(it=>it.remove());
    const el = document.querySelector('#chat .last_mes');
    if (!el.querySelector('.mfc--root')) {
        const dom = document.createElement('div'); {
            dom.classList.add('mfc--root');
            const undoTrigger = document.createElement('span'); {
                undoTrigger.classList.add('mfc--undo');
                undoTrigger.classList.add('mfc--action');
                undoTrigger.textContent = '↶';
                undoTrigger.title = 'Remove last continue';
                undoTrigger.addEventListener('click', ()=>{
                    if (busy()) return;
                    log('[UNDO]');
                    const mes = chat.slice(-1)[0];
                    if (mes.continueSwipe.parent.length > 0) {
                        let swipeIdx;
                        let swipe;
                        let swipes = mes.continueHistory;
                        let text = '';
                        mes.continueSwipe.parent.forEach(idx=>{
                            swipeIdx = idx;
                            swipe = swipes[idx];
                            swipes = swipe.swipes;
                            text += swipe.mes;
                        });
                        mes.mes = text;
                        mes.continueSwipe = swipe;
                        mes.continueSwipeId = swipeIdx;
                        let messageText = substituteParams(text);
                        messageText = messageFormatting(
                            messageText,
                            mes.name,
                            false,
                            mes.is_user,
                        );
                        document.querySelector('#chat .last_mes .mes_text').innerHTML = messageText;
                        saveChatConditional();
                    }
                });
                dom.append(undoTrigger);
            }
            const redoTrigger = document.createElement('span'); {
                redoTrigger.classList.add('mfc--redo');
                redoTrigger.classList.add('mfc--action');
                redoTrigger.textContent = '↷';
                // dom.append(redoTrigger);
            }
            const swipesTrigger = document.createElement('span'); {
                swipesTrigger.classList.add('mfc--swipes');
                swipesTrigger.classList.add('mfc--action');
                swipesTrigger.textContent = '▤';
                swipesTrigger.title = 'Show continues';
                swipesTrigger.addEventListener('click', (evt)=>{
                    if (busy()) return;
                    log('[SWIPES]');
                    const mes = chat.slice(-1)[0];
                    log(mes.continueSwipe?.swipes ?? []);
                    if (mes.continueSwipe?.swipes?.length) {
                        const menu = new ContextMenu(mes.continueSwipe?.swipes?.map((it,idx)=>new MenuItem(it, ()=>{
                            mes.mes += it.mes;
                            mes.continueSwipe = it;
                            mes.continueSwipeId = idx;
                            let messageText = substituteParams(mes.mes);
                            messageText = messageFormatting(
                                messageText,
                                mes.name,
                                false,
                                mes.is_user,
                            );
                            document.querySelector('#chat .last_mes .mes_text').innerHTML = messageText;
                            saveChatConditional();
                        })) ?? []);
                        menu.show(evt);
                    }
                });
                dom.append(swipesTrigger);
            }
            const regen = document.createElement('span'); {
                regen.classList.add('mfc--regen');
                regen.classList.add('mfc--action');
                regen.textContent = '↻';
                regen.title = 'Regenerate last continue';
                regen.addEventListener('click', async()=>{
                    if (busy()) return;
                    log('[REGEN]');
                    const mes = chat.slice(-1)[0];
                    if (mes.continueSwipe.parent.length > 0) {
                        let swipeIdx;
                        let swipe;
                        let swipes = mes.continueHistory;
                        let text = '';
                        mes.continueSwipe.parent.forEach(idx=>{
                            swipeIdx = idx;
                            swipe = swipes[idx];
                            swipes = swipe.swipes;
                            text += swipe.mes;
                        });
                        mes.mes = text;
                        mes.continueSwipe = swipe;
                        mes.continueSwipeId = swipeIdx;
                        let messageText = substituteParams(`${text} ...`);
                        messageText = messageFormatting(
                            messageText,
                            mes.name,
                            false,
                            mes.is_user,
                        );
                        document.querySelector('#chat .last_mes .mes_text').innerHTML = messageText;
                        await Generate('continue');
                        log('DONE');
                    }
                });
                dom.append(regen);
            }
            const cont = document.createElement('span'); {
                cont.classList.add('mfc--cont');
                cont.classList.add('mfc--action');
                cont.textContent = '➜';
                cont.title = 'Continue';
                cont.addEventListener('click', async()=>{
                    if (busy()) return;
                    log('[CONTINUE]');
                    await Generate('continue');
                    log('DONE');
                });
                dom.append(cont);
            }
            el.querySelector('.name_text').parentElement.append(dom);
        }
    }
};

const onMessageDone = async(mesIdx)=>{
    makeSwipeDom();
    if (!isListening) return;
    const mes = chat[mesIdx];
    if (mes.mes == startMes) return;
    isListening = false;
    log(mes.mes, mes);
    // eslint-disable-next-line no-unused-vars
    const [_, ...rest] = mes.mes.split(startMes);
    const newMes = rest.join(startMes);
    const swipe = {
        mes: newMes,
        swipes: [],
        parent: [...mes.continueSwipe.parent, mes.continueSwipeId],
    };
    let swipes = mes.continueHistory;
    swipe.parent.forEach(it=>swipes = swipes[it].swipes);
    swipes.push(swipe);
    mes.continueSwipe = swipe;
    mes.continueSwipeId = swipes.length - 1;
    log(mes);
    makeSwipeDom();
};
eventSource.on(event_types.GENERATION_STOPPED, onMessageDone);
eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, onMessageDone);
eventSource.on(event_types.USER_MESSAGE_RENDERED, onMessageDone);
eventSource.on(event_types.MESSAGE_EDITED, async(mesIdx)=>{
    log('[MESSAGE_EDITED]', mesIdx);
    if (Number(mesIdx) + 1 == chat.length) {
        chat[mesIdx].continueHistory = undefined;
        chat[mesIdx].continueSwipeId = undefined;
        chat[mesIdx].continueSwipe = undefined;
    }
});
eventSource.on(event_types.CHAT_CHANGED, makeSwipeDom);
eventSource.on(event_types.MESSAGE_DELETED, makeSwipeDom);







// registerSlashCommand('sc-up', ()=>jumpUp(), [], 'jump to nearest branch point upwards', true, true);




$(document).ready(function () {
    const addSettings = () => {
        const html = `
		<div class="stmfc--settings">
			<div class="inline-drawer">
				<div class="inline-drawer-toggle inline-drawer-header">
					<b>Swipe Continue</b>
					<div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
				</div>
				<div class="inline-drawer-content" style="font-size:small;">
					Stuff...
				</div>
			</div>
		</div>
		`;
        $('#extensions_settings').append(html);
    };
    addSettings();
});
