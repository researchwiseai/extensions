import { createRoot } from 'react-dom/client';
import { modalApi } from './api';
import './modal.css';
import { ModalRoot } from '../themes/components/ModalRoot';
import { initializeLocalStorage } from '../services/localStorage';
import { initializeIcons } from '@fluentui/font-icons-mdl2';

Office.onReady().then(() => {
    const modal = document.getElementById('modal-root')!;
    createRoot(modal).render(<ModalRoot api={modalApi} />);

    initializeLocalStorage();

    initializeIcons();

    // Receive data from parent and switch views accordingly
    Office.context.ui.addHandlerAsync(
        Office.EventType.DialogParentMessageReceived,
        (arg: any) => {
            try {
                const msg = JSON.parse(arg.message || '{}');
                if (msg && msg.type === 'themeSets-choice' && msg.themeSets) {
                    modalApi.goToView('themeSetsChoice', 'show', {
                        themeSets: msg.themeSets,
                    });
                }
            } catch (e) {
                console.error('Failed to parse parent message', e);
            }
        },
    );

    // Notify parent that dialog is ready to receive data
    try {
        Office.context.ui.messageParent(
            JSON.stringify({ type: 'ready' }),
        );
    } catch (e) {
        console.warn('Failed to notify parent dialog is ready', e);
    }
});
