import { Generate, callPopup, chat, eventSource, event_types, messageFormatting, saveChatConditional, saveSettingsDebounced, substituteParams } from '../../../../script.js';
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
const insertContinueData = (mes)=>{
    if (!mes.continueHistory || !mes.continueHistory[mes.swipe_id ?? 0]) {
        if (!mes.continueHistory) {
            mes.continueHistory = (mes.swipes ?? [mes.mes]).map(it=>({
                mes: it,
                swipes: [],
                parent: [],
                active: null,
            }));
        } else if (!mes.continueHistory[mes.swipe_id ?? 0]) {
            mes.continueHistory[mes.swipe_id ?? 0] = {
                mes: mes.swipe_id === undefined ? mes.mes : mes.swipes[mes.swipe_id],
                swipes: [],
                parent: [],
            };
        }
        mes.continueSwipeId = mes.swipe_id ?? 0;
        mes.continueSwipe = mes.continueHistory[mes.swipe_id ?? 0];
        mes.continueHistory[mes.swipe_id ?? 0].active = [...mes.continueSwipe.parent, mes.continueSwipeId];
    }
};
const onGenerationStarted = async(type, namedArgs, dryRun)=>{
    log('onGenerationStarted', { type, dryRun });
    if (dryRun || !['continue', 'normal', 'swipe'].includes(type)) return;
    const mes = chat.slice(-1)[0];
    insertContinueData(mes);
    if (type == 'continue') {
        isListening = true;
        startMes = mes.mes;
    } else if (type == 'swipe') {
        isListening = true;
        startMes = '';
    }
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
                    swipes[mes.continueSwipe.parent[0]].active.pop();
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
                    eventSource.emit(event_types.MESSAGE_EDITED, chat.length - 1);
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
                if (mes.continueHistory[mes.swipe_id ?? 0]) {
                    const renderTree = (swipe, act, isRoot=false)=>{
                        const el = document.createElement('div'); {
                            el.classList.add('mfc--tree');
                            el.classList.add('list-group');
                            el.classList.add('mfc--ctx-item');
                            const txt = document.createElement('div'); {
                                txt.classList.add('mfc--treeText');
                                txt.textContent = swipe.mes;
                                txt.addEventListener('click', ()=>{
                                    let mesmes = '';
                                    let ss = mes.continueHistory;
                                    for (const idx of swipe.parent) {
                                        const s = ss[idx];
                                        mesmes += s.mes;
                                        ss = s.swipes;
                                    }
                                    mesmes += swipe.mes;
                                    log('NEW MES', mesmes);
                                    mes.mes = mesmes;
                                    mes.continueSwipe = swipe;
                                    mes.continueSwipeId = ss.indexOf(swipe);
                                    mes.continueHistory[mes.swipe_id ?? 0].active = [...swipe.parent, ss.indexOf(swipe)];
                                    let messageText = substituteParams(mesmes);
                                    messageText = messageFormatting(
                                        messageText,
                                        mes.name,
                                        false,
                                        mes.is_user,
                                    );
                                    document.querySelector('#chat .last_mes .mes_text').innerHTML = messageText;
                                    saveChatConditional();
                                    eventSource.emit(event_types.MESSAGE_EDITED, chat.length - 1);
                                });
                                el.append(txt);
                            }
                            if (swipe.swipes.length > 0) {
                                const ul = document.createElement('ul'); {
                                    ul.classList.add('mfc--children');
                                    let i = 0;
                                    for (const s of swipe.swipes) {
                                        const li = document.createElement('li'); {
                                            li.classList.add('list-group-item');
                                            if (i === act[0]) {
                                                li.classList.add('mfc--active');
                                            }
                                            li.append(renderTree(s, i === act[0] ? act.slice(1) : []));
                                            ul.append(li);
                                        }
                                        i++;
                                    }
                                    el.append(ul);
                                }
                            }
                        }
                        return el;
                    };
                    const blocker = document.createElement('div'); {
                        blocker.classList.add('mfc--ctx-blocker');
                        blocker.addEventListener('click', ()=>{
                            blocker.remove();
                        });
                        const content = renderTree(mes.continueHistory[mes.swipe_id ?? 0], mes.continueHistory[mes.swipe_id ?? 0].active.slice(1), true);
                        blocker.append(content);
                        content.style.top = `${swipesTrigger.getBoundingClientRect().bottom}px`;
                        content.style.left = `${swipesTrigger.getBoundingClientRect().right}px`;
                        document.body.append(blocker);
                    }
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
    for (const mes of chat) {
        insertContinueData(mes);
    }
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
    addSwipesButton(mesIdx, true);
    makeSwipeDom();
    const mes = chat[mesIdx];
    insertContinueData(mes);
    if (!isListening) return;
    if (mes.mes == startMes) return;
    if (mes.mes == '...') return;
    isListening = false;
    log(mes.mes, mes);
    // eslint-disable-next-line no-unused-vars
    if (startMes == '') {
        mes.continueHistory[mes.swipe_id ?? 0].mes = mes.mes;
    } else {
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
        mes.continueHistory[mes.swipe_id ?? 0].active = [...mes.continueSwipe.parent, mes.continueSwipeId];
        log(mes);
    }
    makeSwipeDom();
};

const onMessageEdited = async(mesIdx)=>{
    log('[MESSAGE_EDITED]', mesIdx);
    if (Number(mesIdx) + 1 == chat.length) {
        // check how much of the beginning of the message is still intact
        let swipes = chat[mesIdx].continueHistory;
        let swipe;
        let text = '';
        const active = [];
        for (const idx of chat[mesIdx].continueHistory[chat[mesIdx].swipe_id ?? 0].active) {
            swipe = swipes[idx];
            const newText = `${text}${swipes[idx].mes}`;
            if (!chat[mesIdx].mes.startsWith(newText)) {
                const newSwipe = {
                    mes: chat[mesIdx].mes.substring(text.length),
                    parent: swipe.parent,
                    swipes: [],
                };
                const newIdx = swipes.length;
                swipes.push(newSwipe);
                active.push(newIdx);
                chat[mesIdx].continueHistory[chat[mesIdx].swipe_id ?? 0].active = active;
                chat[mesIdx].continueSwipe = newSwipe;
                chat[mesIdx].continueSwipeId = newIdx;
                text = chat[mesIdx].mes;
                break;
            }
            active.push(idx);
            swipes = swipe.swipes;
            text = newText;
        }

        if (text.length < chat[mesIdx].mes.length) {
            const newSwipe = {
                mes: chat[mesIdx].mes.substring(text.length),
                parent: [...swipe.parent, active.slice(-1)[0]],
                swipes: [],
            };
            swipe.swipes.push(newSwipe);
            chat[mesIdx].continueSwipe = newSwipe;
            chat[mesIdx].continueSwipeId = swipe.swipes.length - 1;
            chat[mesIdx].continueHistory[chat[mesIdx].swipe_id ?? 0].active = [...newSwipe.parent, swipe.swipes.length - 1];
        }
    }
};

const onSwipe = async(...args)=>{
    log('swipe');
    const mes = chat.slice(-1)[0];
    if (mes.continueHistory) {
        let swipes = mes.continueHistory;
        let swipe;
        let swipeIdx;
        mes.continueHistory[mes.swipe_id ?? 0]?.active?.forEach(idx=>{
            swipeIdx = idx;
            swipe = swipes[idx];
            swipes = swipe.swipes;
        });
        mes.continueSwipeId = swipeIdx ?? mes.swipe_id ?? 0;
        mes.continueSwipe = swipe;
    }
};

const addSwipesButtons = ()=>{
    Array.from(document.querySelectorAll('#chat > .mes[mesid]')).forEach(it=>addSwipesButton(it.getAttribute('mesid')));
};
const addSwipesButton = (mesIdx, isForced = false)=>{
    const container = document.querySelector(`#chat > .mes[mesid="${mesIdx}"] .extraMesButtons`);
    if (!isForced && container.querySelector('.mfc--button')) return;
    Array.from(container.querySelectorAll('.mfc--button')).forEach(it=>it.remove());
    const mes = chat[mesIdx];
    const btn = document.createElement('div'); {
        btn.classList.add('mfc--button', 'mes_swipes', 'fa-solid', 'fa-arrows-left-right-to-line');
        btn.title = `View swipes (${mes.swipes?.length ?? 0})`;
        btn.addEventListener('click', async(evt)=>{
            const dom = document.createElement('div'); {
                dom.classList.add('mfc--swipesModal');
                (mes.swipes ?? []).forEach((text, idx)=>{
                    const swipe = document.createElement('div'); {
                        swipe.classList.add('mfc--swipe');
                        swipe.classList.add('mes_text');
                        if (idx == mes.swipe_id) {
                            swipe.classList.add('mfc--current');
                        }
                        let messageText = substituteParams(text);
                        messageText = messageFormatting(
                            messageText,
                            mes.name,
                            false,
                            mes.is_user,
                        );
                        swipe.innerHTML = messageText;
                        dom.append(swipe);
                    }
                });
            }
            await callPopup(dom, 'text', null, { wide:true, large:true });
        });
        container.firstElementChild.insertAdjacentElement('beforebegin', btn);
    }
};

const onChatChanged = ()=>{
    makeSwipeDom();
    addSwipesButtons();
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

    eventSource.on(event_types.GENERATION_STARTED, (...args)=>{log('GENERATION_STARTED', args);onGenerationStarted(...args)});
    eventSource.on(event_types.GENERATION_STOPPED, (...args)=>{log('GENERATION_STOPPED', args);onMessageDone(...args)});
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (...args)=>{log('CHARACTER_MESSAGE_RENDERED', args);onMessageDone(...args)});
    eventSource.on(event_types.USER_MESSAGE_RENDERED, (...args)=>{log('USER_MESSAGE_RENDERED', args);onMessageDone(...args)});
    eventSource.on(event_types.MESSAGE_EDITED, (...args)=>{log('MESSAGE_EDITED', args);onMessageEdited(...args)});
    eventSource.on(event_types.CHAT_CHANGED, (...args)=>{log('CHAT_CHANGED', args);onChatChanged();});
    eventSource.on(event_types.MESSAGE_DELETED, (...args)=>{log('MESSAGE_DELETED', args);makeSwipeDom(...args)});
    eventSource.on(event_types.MESSAGE_SWIPED, (...args)=>{log('MESSAGE_SWIPED', args);onSwipe(...args)});
});
