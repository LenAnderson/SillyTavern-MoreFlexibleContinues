import { Generate, chat, eventSource, event_types, messageFormatting, saveChatConditional, saveSettingsDebounced, substituteParams } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { ContextMenu } from './src/ContextMenu.js';
import { MenuItem } from './src/MenuItem.js';




const log = (...msg)=>console.log('[MFC]', ...msg);
const busy = ()=>{
    /**@type {HTMLElement} */
    const el = document.querySelector('.mes_stop');
    return el.offsetHeight !== 0 || el.offsetWidth !== 0;
};




let settings;
if (!extension_settings.moreFlexibleContinues) {
    extension_settings.moreFlexibleContinues = {
        buttonsTop: true,
        buttonsBottom: true,
    };
}
settings = extension_settings.moreFlexibleContinues;




let isListening = false;
let startMes;
const onGenerationStarted = async(type)=>{
    if (type != 'continue') return;
    isListening = true;
    const mes = chat.slice(-1)[0];
    if (!mes.continueHistory || !mes.continueHistory[mes.swipe_id]) {
        if (!mes.continueHistory) {
            mes.continueHistory = mes.swipes.map(it=>({
                mes: it,
                swipes: [],
                parent: [],
                active: null,
            }));
        } else if (!mes.continueHistory[mes.swipe_id]) {
            mes.continueHistory[mes.swipe_id] = {
                mes: mes.swipes[mes.swipe_id],
                swipes: [],
                parent: [],
            };
        }
        mes.continueSwipeId = mes.swipe_id;
        mes.continueSwipe = mes.continueHistory[mes.swipe_id];
        mes.continueHistory[mes.swipe_id].active = [...mes.continueSwipe.parent, mes.continueSwipeId];
    }
    startMes = mes.mes;
    log('[GENERATION_STARTED]', chat.slice(-1)[0].mes, chat.slice(-1)[0]);
};

let hoverMes;
let hoverOverlay;
const onUnhover = ()=>{
    // log('[UNHOVER]');
    hoverOverlay?.remove();
    hoverMes?.classList?.remove('mfc--hover');
};
const onHover = ()=>{
    if (busy()) return;
    // log('[HOVER]');
    const mes = chat.slice(-1)[0];
    if (mes.continueSwipe?.parent?.length) {
        let swipe;
        let swipes = mes.continueHistory;
        let text = '';
        mes.continueSwipe.parent.forEach(idx=>{
            swipe = swipes[idx];
            swipes = swipe.swipes;
            text += swipe.mes;
        });
        let messageText = substituteParams(text);
        messageText = messageFormatting(
            messageText,
            mes.name,
            false,
            mes.is_user,
        );
        const el = document.querySelector('#chat .last_mes .mes_text');
        hoverMes = el;
        const html = document.createElement('div');
        hoverOverlay = html;
        html.classList.add('mfc--hoverOverlay');
        html.innerHTML = messageText;
        html.style.padding = window.getComputedStyle(el).padding;
        el.classList.add('mfc--hover');
        el.append(html);
    }
};

const buildSwipeDom = (mfc)=>{
    const dom = document.createElement('div'); {
        dom.classList.add('mfc--root');
        dom.setAttribute('data-mfc', mfc);
        const undoTrigger = document.createElement('span'); {
            undoTrigger.classList.add('mfc--undo');
            undoTrigger.classList.add('mfc--action');
            undoTrigger.textContent = '↶';
            undoTrigger.title = 'Remove last continue';
            undoTrigger.addEventListener('pointerenter', onHover);
            undoTrigger.addEventListener('pointerleave', onUnhover);
            undoTrigger.addEventListener('click', ()=>{
                if (busy()) return;
                log('[UNDO]');
                const mes = chat.slice(-1)[0];
                if (mes.continueSwipe?.parent?.length) {
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
        const regen = document.createElement('span'); {
            regen.classList.add('mfc--regen');
            regen.classList.add('mfc--action');
            regen.textContent = '↻';
            regen.title = 'Regenerate last continue';
            regen.addEventListener('pointerenter', onHover);
            regen.addEventListener('pointerleave', onUnhover);
            regen.addEventListener('click', async()=>{
                if (busy()) return;
                log('[REGEN]');
                const mes = chat.slice(-1)[0];
                if (mes.continueSwipe?.parent?.length) {
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
    }
    return dom;
};
const makeSwipeDom = ()=>{
    Array.from(document.querySelectorAll('#chat .mes:not(.last_mes) .mfc--root')).forEach(it=>it.remove());
    const el = document.querySelector('#chat .last_mes');
    const elTop = el.querySelector('.name_text').parentElement;
    const elBot = el;

    if (settings.buttonsTop && !el.querySelector('.mfc--root[data-mfc="top"]')) {
        elTop.append(buildSwipeDom('top'));
    } else if (!settings.buttonsTop && el.querySelector('.mfc--root[data-mfc="top"]')) {
        el.querySelector('.mfc--root[data-mfc="top"]').remove();
    }

    if (settings.buttonsBottom && !el.querySelector('.mfc--root[data-mfc="bottom"]')) {
        elBot.append(buildSwipeDom('bottom'));
    } else if (!settings.buttonsBottom && el.querySelector('.mfc--root[data-mfc="bottom"]')) {
        el.querySelector('.mfc--root[data-mfc="bottom"]').remove();
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
    mes.continueHistory[mes.swipe_id].active = [...mes.continueSwipe.parent, mes.continueSwipeId];
    log(mes);
    makeSwipeDom();
};

const onMessageEdited = async(mesIdx)=>{
    log('[MESSAGE_EDITED]', mesIdx);
    if (Number(mesIdx) + 1 == chat.length) {
        const mes = chat.slice(-1)[0];
        chat[mesIdx].continueHistory[mes.swipe_id] = undefined;
        chat[mesIdx].continueSwipeId = undefined;
        chat[mesIdx].continueSwipe = undefined;
    }
};

const onSwipe = async(...args)=>{
    log('swipe');
    const mes = chat.slice(-1)[0];
    if (mes.continueHistory) {
        let swipes = mes.continueHistory;
        let swipe;
        let swipeIdx;
        mes.continueHistory[mes.swipe_id]?.active?.forEach(idx=>{
            swipeIdx = idx;
            swipe = swipes[idx];
            swipes = swipe.swipes;
        });
        mes.continueSwipeId = swipeIdx ?? mes.swipe_id;
        mes.continueSwipe = swipe;
    }
};




eventSource.on(event_types.APP_READY, ()=>{
    const addSettings = () => {
        const html = `
		<div class="mfc--settings">
			<div class="inline-drawer">
				<div class="inline-drawer-toggle inline-drawer-header">
					<b>More Flexible Continues</b>
					<div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
				</div>
				<div class="inline-drawer-content" style="font-size:small;">
                    <label class="flex-container">
                        <input type="checkbox" id="mfc--buttonsTop"> <span>Show buttons at the top of a message</span>
                    </label>
                    <label class="flex-container">
                        <input type="checkbox" id="mfc--buttonsBottom"> <span>Show buttons at the bottom of a message</span>
                    </label>
				</div>
			</div>
		</div>
		`;
        $('#extensions_settings').append(html);

        /**@type {HTMLInputElement} */
        const top = document.querySelector('#mfc--buttonsTop');
        top.checked = settings.buttonsTop ?? true;
        top.addEventListener('click', ()=>{
            settings.buttonsTop = top.checked;
            saveSettingsDebounced();
            makeSwipeDom();
        });

        /**@type {HTMLInputElement} */
        const bot = document.querySelector('#mfc--buttonsBottom');
        bot.checked = settings.buttonsBottom ?? true;
        bot.addEventListener('click', ()=>{
            settings.buttonsBottom = bot.checked;
            saveSettingsDebounced();
            makeSwipeDom();
        });
    };
    addSettings();

    eventSource.on(event_types.GENERATION_STARTED, onGenerationStarted);
    eventSource.on(event_types.GENERATION_STOPPED, onMessageDone);
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, onMessageDone);
    eventSource.on(event_types.USER_MESSAGE_RENDERED, onMessageDone);
    eventSource.on(event_types.MESSAGE_EDITED, onMessageEdited);
    eventSource.on(event_types.CHAT_CHANGED, makeSwipeDom);
    eventSource.on(event_types.MESSAGE_DELETED, makeSwipeDom);
    eventSource.on(event_types.MESSAGE_SWIPED, onSwipe);
});
