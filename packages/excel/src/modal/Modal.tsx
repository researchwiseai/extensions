import { createRoot } from 'react-dom/client';
import { ModalRoot } from './components/ModalRoot';
import { modalApi } from './api';
import './modal.css';

Office.onReady().then(() => {
    const modal = document.getElementById('modal-root')!;
    createRoot(modal).render(<ModalRoot api={modalApi} />);
});
