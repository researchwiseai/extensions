import { jest } from '@jest/globals';

describe('openFeedHandler', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        (global as any).Office = {
            onReady: jest.fn().mockReturnValue({ then: jest.fn() }),
            addin: {
                setStartupBehavior: jest.fn(),
                showAsTaskpane: jest.fn(),
            },
            StartupBehavior: { load: 'load' },
            actions: { associate: jest.fn() },
        };
        (global as any).document = { getElementById: jest.fn().mockReturnValue({}) };
    });

    afterEach(() => {
        jest.useRealTimers();
        // cleanup globals
        delete (global as any).Office;
        delete (global as any).document;
    });

    it.skip('shows the taskpane for consecutive invocations', async () => {
        const { openFeedHandler } = await import('./Taskpane');
        const event = { completed: jest.fn() };

        openFeedHandler(event);
        jest.advanceTimersByTime(60);

        openFeedHandler(event);
        jest.advanceTimersByTime(60);

        const show = (global as any).Office.addin.showAsTaskpane;
        expect(show).toHaveBeenCalledTimes(2);
        expect(event.completed).toHaveBeenCalledTimes(2);
    });
});
