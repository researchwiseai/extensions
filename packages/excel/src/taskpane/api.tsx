import { GoToViewEvent } from './events';
import { View } from './types';

export class TaskpaneApi extends EventTarget {
    goToView(view: View) {
        this.dispatchEvent(new GoToViewEvent(view));
    }

    onViewChange(callback: (event: GoToViewEvent) => void) {
        const wrapper = (event: GoToViewEvent) => {
            callback(event);
        };
        this.addEventListener(GoToViewEvent.type, wrapper);
        return () => {
            this.removeEventListener(GoToViewEvent.type, wrapper);
        };
    }
}
