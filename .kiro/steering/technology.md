# Technology Architecture & Approach

## Architecture Overview

Pulse follows a **monorepo architecture** with shared libraries and
platform-specific implementations:

- **Monorepo Structure**: Bun workspaces managing multiple packages
- **Shared Common Library**: Core business logic, API clients, and utilities
- **Platform-Specific Add-ins**: Excel (Office.js) and Google Sheets
  implementations
- **Microservice Backend**: ResearchWiseAI API for text processing

## Technology Stack

### Core Technologies

- **Runtime**: Bun (package manager, test runner, bundler)
- **Language**: TypeScript with strict typing
- **Build System**: Webpack 5 with custom configuration
- **UI Framework**: React 19 with Fluent UI components

### Excel Add-in Stack

- **Platform**: Office.js APIs with SharedRuntime
- **Bundling**: Webpack with multiple entry points
- **Styling**: TailwindCSS with PostCSS processing
- **Authentication**: OAuth2 with PKCE flow
- **Error Tracking**: Sentry integration
- **NLP**: Wink-NLP for client-side text processing

### Development Tools

- **Linting**: ESLint with Office Add-ins plugin
- **Testing**: Jest with TypeScript support
- **Type Checking**: TypeScript compiler with strict mode
- **Code Formatting**: Prettier with Office Add-ins config

## Key Architectural Patterns

### 1. Shared Runtime Architecture

- Single JavaScript context across all Office components
- Persistent state management between ribbon and task pane
- Event-driven communication between UI components

### 2. Flow-Based Processing

- Modular processing flows for each feature (sentiment, themes, summarization)
- Consistent error handling and user feedback patterns
- Async/await patterns for API communication

### 3. Authentication & Security

- OAuth2 with PKCE for secure API access
- Token storage in Office.js persistent storage
- Auth guards protecting sensitive operations

### 4. Data Processing Pipeline

```
User Selection → Input Validation → API Processing → Result Formatting → Sheet Output
```

## Package Structure

### `packages/common`

**Purpose**: Shared business logic and API abstractions

- API client with authentication
- Data transformation utilities
- Theme management and storage
- Input/output formatting
- PKCE authentication helpers

### `packages/excel`

**Purpose**: Excel-specific implementation

- Office.js integration and ribbon commands
- React-based task pane and dialogs
- Webpack configuration for Office Add-ins
- Platform-specific UI components

### `packages/sheets` (Future)

**Purpose**: Google Sheets implementation

- Apps Script integration
- Shared common library usage

## Build & Deployment

### Development Workflow

1. **Local Development**: Webpack dev server with HTTPS certificates
2. **Hot Reloading**: Live updates during development
3. **Type Safety**: Continuous TypeScript checking
4. **Testing**: Jest unit tests with coverage

### Production Build

1. **Asset Optimization**: Minification and tree shaking
2. **Manifest Transformation**: URL rewriting for production domains
3. **Static Hosting**: GitHub Pages deployment
4. **CDN Distribution**: Optimized asset delivery

## Integration Points

### Office.js APIs

- **Workbook API**: Reading/writing Excel data
- **Ribbon API**: Custom tab and button controls
- **Dialog API**: Modal dialogs for complex interactions
- **Storage API**: Persistent settings and authentication

### ResearchWiseAI Backend

- **REST API**: HTTP-based text processing services
- **Authentication**: Bearer token authorization
- **Rate Limiting**: Credit-based usage tracking
- **Error Handling**: Structured error responses

## Performance Considerations

### Client-Side Optimization

- **Code Splitting**: Separate bundles for different features
- **Lazy Loading**: On-demand component loading
- **Caching**: Persistent storage for themes and settings
- **Batch Processing**: Efficient Excel range operations

### Network Optimization

- **Request Batching**: Multiple text entries in single API calls
- **Compression**: Gzipped responses from backend
- **Retry Logic**: Resilient error handling
- **Offline Fallbacks**: Local NLP processing where possible

## Security & Privacy

### Data Protection

- **No Data Persistence**: Text data not stored on servers
- **Encrypted Transit**: HTTPS for all communications
- **Token Security**: Secure OAuth2 implementation
- **Minimal Permissions**: Least privilege access model

### Compliance

- **GDPR Ready**: Privacy-first data handling
- **Enterprise Security**: Compatible with corporate environments
- **Audit Logging**: Comprehensive operation tracking

## Development Standards

### Code Quality

- **TypeScript Strict Mode**: Enhanced type safety
- **ESLint Rules**: Consistent code style
- **Test Coverage**: Unit tests for critical paths
- **Error Boundaries**: Graceful failure handling

### Documentation

- **API Documentation**: Comprehensive function documentation
- **Architecture Decisions**: Documented design choices
- **Deployment Guides**: Step-by-step setup instructions
- **User Guides**: Feature usage documentation
