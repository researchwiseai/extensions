import { SummarizePresetOptions } from 'pulse-common/summarize';

function renderPresets() {
    const container = document.getElementById('presets');
    if (!container) return;
    container.innerHTML = '';

    SummarizePresetOptions.forEach((opt, index) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'preset';
        input.value = opt.value;
        if (index === 0) input.checked = true;
        label.appendChild(input);
        label.appendChild(document.createTextNode(' ' + opt.label));
        container.appendChild(label);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderPresets);
} else {
    renderPresets();
}

