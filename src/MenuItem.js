export class MenuItem {
    /**@type {{mes:'',swipes:[],parent:Number[]}}*/ swipe;
    /**@type {Function}*/ callback;

    /**@type {HTMLElement}*/ root;




    constructor(/**@type{Object}*/swipe, /**@type {Function}*/callback) {
        this.swipe = swipe;
        this.callback = callback;
    }



    render() {
        if (!this.root) {
            const item = document.createElement('li'); {
                this.root = item;
                item.classList.add('list-group-item');
                item.classList.add('mfc--ctx-item');
                if (this.callback) {
                    item.addEventListener('click', (evt) => this.callback(evt, this));
                }
                item.textContent = this.swipe.mes;
            }
        }
        return this.root;
    }
}
