import { ApiEvent } from '../taskpane/events';
import { ModalView, ModalViewAction } from './types';

export class UpdateModalViewEvent extends ApiEvent {
    static readonly type = 'updateModalView';

    constructor(
        public view: ModalView,
        public action: 'show' | 'hide' | 'toggle' = 'toggle',
    ) {
        super(UpdateModalViewEvent.type, { view, action });
    }
}

export class ModalApi extends EventTarget {
    goToView(view: ModalView, action?: ModalViewAction) {
        this.dispatchEvent(new UpdateModalViewEvent(view, action));
    }

    onViewChange(callback: (event: UpdateModalViewEvent) => void) {
        const wrapper = (event: UpdateModalViewEvent) => {
            callback(event);
        };
        this.addEventListener(UpdateModalViewEvent.type, wrapper);
        return () => {
            this.removeEventListener(UpdateModalViewEvent.type, wrapper);
        };
    }
}

export const modalApi = new ModalApi();
