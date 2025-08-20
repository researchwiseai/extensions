export function enableRibbonButtons() {
    Office.ribbon.requestUpdate({
        tabs: [
            {
                id: 'TabPulse',
                groups: [
                    {
                        id: 'SentimentGroup',
                        controls: [
                            {
                                id: 'AnalyzeSentimentButton',
                                enabled: true,
                            },
                        ],
                    },
                    {
                        id: 'SummarizeGroup',
                        controls: [
                            {
                                id: 'SummarizeButton',
                                enabled: true,
                            },
                        ],
                    },
                    {
                        id: 'ThemesGroup',
                        controls: [
                            {
                                id: 'GenerateThemesButton',
                                enabled: true,
                            },
                            {
                                id: 'AllocateThemesButton',
                                enabled: true,
                            },
                            {
                                id: 'MatrixThemesButton',
                                enabled: true,
                            },
                            {
                                id: 'SimilarityMatrixThemesButton',
                                enabled: true,
                            },
                        ],
                    },
                ],
            },
        ],
    });
}

export function disableRibbonButtons() {
    Office.ribbon.requestUpdate({
        tabs: [
            {
                id: 'TabPulse',
                groups: [
                    {
                        id: 'SentimentGroup',
                        controls: [
                            {
                                id: 'AnalyzeSentimentButton',
                                enabled: false,
                            },
                        ],
                    },
                    {
                        id: 'SummarizeGroup',
                        controls: [
                            {
                                id: 'SummarizeButton',
                                enabled: false,
                            },
                        ],
                    },
                    {
                        id: 'ThemesGroup',
                        controls: [
                            {
                                id: 'GenerateThemesButton',
                                enabled: false,
                            },
                            {
                                id: 'AllocateThemesButton',
                                enabled: false,
                            },
                            {
                                id: 'MatrixThemesButton',
                                enabled: false,
                            },
                            {
                                id: 'SimilarityMatrixThemesButton',
                                enabled: false,
                            },
                        ],
                    },
                ],
            },
        ],
    });
}

export function updateHomeStartButtonLabel(label: string) {
    Office.ribbon.requestUpdate({
        tabs: [
            {
                id: 'TabPulse',
                groups: [
                    {
                        id: 'PulseGroup',
                        controls: [
                            {
                                id: 'HomePulseStartButton',
                                label,
                            },
                        ],
                    },
                ],
            },
        ],
    });
}

export function updateHomeStartButtonIcon(useSettingsIcon: boolean) {
    const base = window.location.origin;
    const prefix = useSettingsIcon ? 'icons/cog' : 'icon';
    Office.ribbon.requestUpdate({
        tabs: [
            {
                id: 'TabPulse',
                groups: [
                    {
                        id: 'PulseGroup',
                        controls: [
                            {
                                id: 'HomePulseStartButton',
                                icon: [
                                    { size: 16, sourceLocation: `${base}/assets/${prefix}-16.png` },
                                    { size: 32, sourceLocation: `${base}/assets/${prefix}-32.png` },
                                    { size: 80, sourceLocation: `${base}/assets/${prefix}-80.png` },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    });
}
