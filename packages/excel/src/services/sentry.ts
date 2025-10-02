import * as Sentry from '@sentry/browser';

// Sentry configuration for Excel add-in
export function initializeSentry() {
    Sentry.init({
        dsn: process.env.SENTRY_DSN || '', // Add your Sentry DSN here
        environment: process.env.NODE_ENV || 'development',
        integrations: [Sentry.browserTracingIntegration()],
        tracesSampleRate: 0.1,
        beforeSend(event) {
            // Filter out sensitive information
            if (event.request?.headers) {
                delete event.request.headers['Authorization'];
            }
            return event;
        },
    });
}

// Enhanced error logging specifically for Office.js errors
export function logOfficeError(
    operation: string,
    error: any,
    context?: Record<string, any>,
) {
    const errorInfo = {
        operation,
        officeErrorCode: error?.code,
        officeErrorName: error?.name,
        officeErrorMessage: error?.message,
        officeErrorStack: error?.stack,
        officeErrorDetails: error?.debugInfo,
        officeErrorTraceMessages: error?.traceMessages,
        context,
    };

    console.error(`Office.js Error in ${operation}:`, errorInfo);

    Sentry.captureException(error, {
        tags: {
            operation,
            errorType: 'office_js',
            errorCode: error?.code,
        },
        extra: errorInfo,
        level: 'error',
    });
}

// Enhanced error logging for auth-related errors
export function logAuthError(
    operation: string,
    error: any,
    context?: Record<string, any>,
) {
    const errorInfo = {
        operation,
        errorMessage: error?.message,
        errorStack: error?.stack,
        errorName: error?.name,
        authErrorCode: error?.error,
        authErrorDescription: error?.error_description,
        context,
    };

    console.error(`Auth Error in ${operation}:`, errorInfo);

    Sentry.captureException(error, {
        tags: {
            operation,
            errorType: 'authentication',
            errorCode: error?.error,
        },
        extra: errorInfo,
        level: 'error',
    });
}

// Generic error logging with context
export function logError(
    operation: string,
    error: any,
    context?: Record<string, any>,
) {
    const errorInfo = {
        operation,
        errorMessage: error?.message,
        errorStack: error?.stack,
        errorName: error?.name,
        context,
    };

    console.error(`Error in ${operation}:`, errorInfo);

    Sentry.captureException(error, {
        tags: {
            operation,
            errorType: 'general',
        },
        extra: errorInfo,
        level: 'error',
    });
}

// Log successful operations for debugging
export function logSuccess(operation: string, context?: Record<string, any>) {
    console.log(`Success: ${operation}`, context);

    Sentry.addBreadcrumb({
        message: `Success: ${operation}`,
        category: 'operation',
        level: 'info',
        data: context,
    });
}
