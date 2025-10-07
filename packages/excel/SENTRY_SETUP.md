# Sentry Error Tracking Setup

## Overview

This Excel add-in now includes comprehensive Sentry error tracking, particularly focused on capturing Office.js error codes and authentication issues during signup.

## Configuration

1. Set your Sentry DSN in the environment variable `SENTRY_DSN`
2. The environment is automatically detected from `NODE_ENV`

## Error Types Tracked

### Office.js Errors

- Dialog creation failures
- Dialog event errors
- Office API errors with detailed error codes and context

### Authentication Errors

- Organization lookup failures
- Token exchange errors
- PKCE flow errors
- Invalid OAuth responses

### General Application Errors

- Unexpected errors with full context

## Error Context Captured

- Office.js error codes and names
- Office.js debug information and trace messages
- Auth0 error codes and descriptions
- User email and organization (sanitized)
- Operation context and flow step
- Browser and environment information

## Key Features

- Automatic error categorization with tags
- Sensitive information filtering (Authorization headers removed)
- Breadcrumb tracking for successful operations
- Enhanced console logging for development

## Usage

Sentry is automatically initialized when the Excel add-in starts. No additional setup required in components - just use the logging functions:

```typescript
import {
    logOfficeError,
    logAuthError,
    logError,
    logSuccess,
} from '../services/sentry';

// Log Office.js specific errors
logOfficeError('operation_name', error, { context });

// Log authentication errors
logAuthError('auth_operation', error, { context });

// Log general errors
logError('operation_name', error, { context });

// Log successful operations (creates breadcrumbs)
logSuccess('operation_name', { context });
```

## Error Display

Authentication errors are now displayed inline in the form instead of using browser alerts, providing a better user experience.
