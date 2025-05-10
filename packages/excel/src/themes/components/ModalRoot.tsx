import { ThemeSetManager } from './ThemeSetManager';
import { ModalApi } from '../../modal/api';

export function ModalRoot({ api }: { api: ModalApi }) {
    return (
        <div className="p-10">
            <ThemeSetManager />
        </div>
    );
}
