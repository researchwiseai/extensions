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
