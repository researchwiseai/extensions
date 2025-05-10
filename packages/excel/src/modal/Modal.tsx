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
});
