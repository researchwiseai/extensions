import { View } from './types';

export class ApiEvent extends Event {
    constructor(
        type: string,
        public detail: any,
    ) {
        super(type);
    }
}

export class GoToViewEvent extends ApiEvent {
    static readonly type = 'goToView';

    constructor(public view: View) {
        super(GoToViewEvent.type, { view });
    }
}
