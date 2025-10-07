# Requirements Document

## Introduction

The Dictionary Merger feature enhances the extract named entities functionality
in the Excel add-in by providing intelligent suggestions for merging similar
dictionary items and allowing users to manually merge items through an intuitive
visual interface. This feature addresses the common issue where semantically
similar entities (like "Microsoft Copilot" and "Copilot", or "Coke" and "Coca
Cola") are extracted as separate items but should be treated as the same entity
for analysis purposes. The core matching logic will be implemented in the common
package to enable future reuse in other platforms.

## Requirements

### Requirement 1

**User Story:** As a researcher analyzing extracted named entities, I want the
system to automatically suggest mergers for similar dictionary items, so that I
can quickly consolidate semantically related entities without manual
identification.

#### Acceptance Criteria

1. WHEN the extract named entities process completes AND the user has enabled
   "expand dictionary" THEN the system SHALL analyze all dictionary items using
   fuzzy matching algorithms
2. WHEN fuzzy matching identifies items with similarity scores above a
   configurable threshold THEN the system SHALL create merger suggestions for
   those items
3. WHEN creating merger suggestions THEN the system SHALL group items like
   "Microsoft Copilot" with "Copilot" and "Coke" with "Coca Cola"
4. WHEN generating suggestions THEN the system SHALL NOT suggest mergers for
   items that are clearly different entities despite spelling similarities
5. WHEN merger suggestions are created THEN the system SHALL preserve the
   original extraction arrays for each suggested merger group

### Requirement 2

**User Story:** As a user reviewing merger suggestions, I want a visual
interface similar to contact merger suggestions on Android phones, so that I can
easily review and approve suggested mergers in a familiar format.

#### Acceptance Criteria

1. WHEN merger suggestions are available THEN the system SHALL display a modal
   dialog before writing data to the sheet
2. WHEN the merger dialog opens THEN the system SHALL present suggestions in a
   visual format similar to Android contact merger interfaces
3. WHEN displaying each merger suggestion THEN the system SHALL show all items
   proposed for merging with their associated extraction counts
4. WHEN a user reviews a suggestion THEN the system SHALL allow them to accept,
   reject, or modify the merger
5. WHEN a user accepts a merger THEN the system SHALL combine the extraction
   arrays from all merged items
6. WHEN a user rejects a merger THEN the system SHALL keep the items separate in
   the final output

### Requirement 3

**User Story:** As a user who wants more control over merging, I want to
manually select any two or more dictionary items to create custom mergers, so
that I can handle edge cases that automatic suggestions might miss.

#### Acceptance Criteria

1. WHEN the user has finished reviewing automatic suggestions THEN the system
   SHALL provide an interface for manual merger creation
2. WHEN in manual merger mode THEN the system SHALL display all remaining
   dictionary items in a selectable list
3. WHEN the user selects multiple items THEN the system SHALL allow them to
   create a custom merger group
4. WHEN creating a custom merger THEN the system SHALL allow the user to specify
   the final merged name
5. WHEN a custom merger is created THEN the system SHALL combine the extraction
   arrays from all selected items
6. WHEN the user creates multiple custom mergers THEN the system SHALL update
   the dictionary and extraction data accordingly

### Requirement 4

**User Story:** As a user completing the merger process, I want to finalize my
changes and have the merged data written to the sheet, so that my analysis
reflects the consolidated entities.

#### Acceptance Criteria

1. WHEN the user indicates they are done with merging THEN the system SHALL
   process all approved mergers
2. WHEN processing mergers THEN the system SHALL update dictionary items to
   reflect merged names
3. WHEN processing mergers THEN the system SHALL combine extraction arrays for
   cells that reference merged items
4. WHEN all mergers are processed THEN the system SHALL write the updated data
   to the Excel sheet
5. WHEN writing to the sheet THEN the system SHALL maintain the original data
   structure but with merged entity references
6. WHEN the process completes THEN the system SHALL provide confirmation that
   mergers have been applied

### Requirement 5

**User Story:** As a user working with the merger feature, I want the system to
handle edge cases gracefully, so that I don't lose data or encounter errors
during the merger process.

#### Acceptance Criteria

1. WHEN no merger suggestions are found THEN the system SHALL proceed directly
   to writing data without showing the merger dialog
2. WHEN the user cancels the merger dialog THEN the system SHALL write the
   original unmerged data to the sheet
3. WHEN merger processing encounters an error THEN the system SHALL preserve the
   original data and notify the user
4. WHEN fuzzy matching takes too long THEN the system SHALL timeout gracefully
   and proceed without suggestions
5. WHEN the user attempts to merge items with conflicting data THEN the system
   SHALL provide clear resolution options
