import React, { Component, ReactNode } from 'react';
import {
    Stack,
    Text,
    PrimaryButton,
    DefaultButton,
    MessageBar,
    MessageBarType,
    IStackTokens,
    Icon,
} from '@fluentui/react';

interface Props {
    children: ReactNode;
    onFallback?: () => void;
    onRetry?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

const stackTokens: IStackTokens = {
    childrenGap: 16,
};

export class DictionaryMergerErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Dictionary Merger Error Boundary caught an error:', error, errorInfo);

        this.setState({
            error,
            errorInfo,
        });

        // Log error details for debugging
        const errorDetails = {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
        };

        console.error('Dictionary Merger Error Details:', errorDetails);
    }

    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });

        if (this.props.onRetry) {
            this.props.onRetry();
        }
    };

    handleFallback = () => {
        if (this.props.onFallback) {
            this.props.onFallback();
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <Stack tokens={stackTokens} styles={{ root: { height: '100%', padding: '24px' } }}>
                    {/* Error Header */}
                    <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="center">
                        <Icon
                            iconName="ErrorBadge"
                            styles={{
                                root: {
                                    fontSize: '24px',
                                    color: '#D13438'
                                }
                            }}
                        />
                        <Text variant="xxLarge" styles={{ root: { fontWeight: 600, color: '#D13438' } }}>
                            Dictionary Merger Error
                        </Text>
                    </Stack>

                    {/* Error Message */}
                    <MessageBar messageBarType={MessageBarType.error} isMultiline>
                        <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
                            The dictionary merger encountered an unexpected error and cannot continue.
                        </Text>
                        <Text variant="medium" styles={{ root: { marginTop: '8px' } }}>
                            {this.state.error?.message || 'An unknown error occurred'}
                        </Text>
                    </MessageBar>

                    {/* User-friendly explanation */}
                    <Stack tokens={{ childrenGap: 8 }}>
                        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                            What happened?
                        </Text>
                        <Text variant="medium" styles={{ root: { color: '#605E5C' } }}>
                            The dictionary merger dialog encountered a technical issue while processing your data.
                            This could be due to unexpected data format, memory constraints, or a temporary system issue.
                        </Text>
                    </Stack>

                    {/* Recovery options */}
                    <Stack tokens={{ childrenGap: 8 }}>
                        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                            What can you do?
                        </Text>
                        <Stack tokens={{ childrenGap: 4 }}>
                            <Text variant="medium" styles={{ root: { color: '#605E5C' } }}>
                                • Try again - the issue might be temporary
                            </Text>
                            <Text variant="medium" styles={{ root: { color: '#605E5C' } }}>
                                • Skip merging - continue with original extraction data
                            </Text>
                            <Text variant="medium" styles={{ root: { color: '#605E5C' } }}>
                                • Check your data - ensure extraction results are valid
                            </Text>
                        </Stack>
                    </Stack>

                    {/* Technical details (collapsible) */}
                    {(typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') && (
                        <Stack tokens={{ childrenGap: 8 }}>
                            <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                                Technical Details (Development Mode)
                            </Text>
                            <div style={{
                                padding: '12px',
                                backgroundColor: '#F8F8F8',
                                border: '1px solid #E1DFDD',
                                borderRadius: '4px',
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                maxHeight: '200px',
                                overflow: 'auto'
                            }}>
                                <div><strong>Error:</strong> {this.state.error?.message}</div>
                                {this.state.error?.stack && (
                                    <div style={{ marginTop: '8px' }}>
                                        <strong>Stack:</strong>
                                        <pre style={{ whiteSpace: 'pre-wrap', margin: '4px 0' }}>
                                            {this.state.error.stack}
                                        </pre>
                                    </div>
                                )}
                                {this.state.errorInfo?.componentStack && (
                                    <div style={{ marginTop: '8px' }}>
                                        <strong>Component Stack:</strong>
                                        <pre style={{ whiteSpace: 'pre-wrap', margin: '4px 0' }}>
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </Stack>
                    )}

                    {/* Action buttons */}
                    <Stack
                        horizontal
                        tokens={{ childrenGap: 12 }}
                        horizontalAlign="center"
                        styles={{ root: { marginTop: 'auto', paddingTop: '24px' } }}
                    >
                        <PrimaryButton
                            text="Try Again"
                            onClick={this.handleRetry}
                            iconProps={{ iconName: 'Refresh' }}
                            styles={{ root: { minWidth: 120 } }}
                        />
                        <DefaultButton
                            text="Skip Merging"
                            onClick={this.handleFallback}
                            iconProps={{ iconName: 'Forward' }}
                            styles={{ root: { minWidth: 120 } }}
                        />
                    </Stack>
                </Stack>
            );
        }

        return this.props.children;
    }
}