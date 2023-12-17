import { delay } from '../../../../utils.js';
// eslint-disable-next-line no-unused-vars
import { MenuItem } from './MenuItem.js';




export class ContextMenu {
    /**@type {MenuItem[]}*/ itemList = [];
    /**@type {Boolean}*/ isActive = false;

    /**@type {HTMLElement}*/ root;
    /**@type {HTMLElement}*/ menu;




    constructor(/**@type {MenuItem[]}*/items) {
        this.itemList = items;
    }

    render() {
        if (!this.root) {
            const blocker = document.createElement('div'); {
                this.root = blocker;
                blocker.classList.add('mfc--ctx-blocker');
                blocker.addEventListener('click', () => this.hide());
                const menu = document.createElement('ul'); {
                    this.menu = menu;
                    menu.classList.add('list-group');
                    menu.classList.add('mfc--ctx-menu');
                    this.itemList.forEach(it => menu.append(it.render()));
                    blocker.append(menu);
                }
            }
        }
        return this.root;
    }




    async show({ clientX, clientY }) {
        if (this.isActive) return;
        this.isActive = true;
        this.render();
        this.menu.style.top = `${clientY}px`;
        this.menu.style.left = `${clientX}px`;
        document.body.append(this.root);
        await delay(50);
        const rect = this.menu.getBoundingClientRect();
        if (rect.bottom > window.innerHeight) {
            this.menu.style.top = `${clientY - (rect.bottom - window.innerHeight)}px`;
        }
    }
    hide() {
        if (this.root) {
            this.root.remove();
        }
        this.isActive = false;
    }
    toggle(/**@type {PointerEvent}*/evt) {
        if (this.isActive) {
            this.hide();
        } else {
            this.show(evt);
        }
    }
}
