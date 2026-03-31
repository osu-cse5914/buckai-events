## Main Pages

### Home Page (Social OSU)

The Home Page is the main landing page after login, accessible via the "Social OSU" item in the navigation bar. This page focuses on content discovery and presents events and gigs through a combination of AI recommendations and simple ranking strategies.

#### Content Structure

The page is divided into three main sections:

- Recommended
- Popular
- Upcoming

Each section includes both Events and Gigs.

#### Recommended

- displays AI-recommended events and gigs based on user preferences and past interactions
- serves as the primary personalized content section

Subsections:

- Recommended Events
- Recommended Gigs

#### Popular

- displays trending events and gigs based on simple metrics (e.g., number of applications or bookmarks)
- helps users discover widely engaged content

Subsections:

- Popular Events
- Popular Gigs

#### Upcoming

- displays events and gigs that will happen soon (e.g., within the next few days or a week)
- helps users find time-relevant opportunities

Subsections:

- Upcoming Events
- Upcoming Gigs

#### User Actions

Users can:

- click on an event card → navigate to Event Detail Page
- click on a gig card → navigate to Gig Detail Page
- browse different sections to discover content

#### Notes

- Event and Gig items are displayed using the existing Card component
- recommendation logic is handled by the backend recommendation system
- ranking logic for "Popular" and "Upcoming" is based on simple rules and does not require AI

### Events Page

The Events Page displays all ongoing events and is accessible from the "Events" item in the navigation bar. This page focuses on browsing and filtering events without AI-based ranking.

#### Content

- displays all ongoing events using the Card component
- events are shown in a list or grid layout

#### Sorting

Users can sort events by:

- date/time (newest first or oldest first)
- number of applications
- number of bookmarks

#### Filtering

Users can filter events by category:

- supports selecting one or multiple categories
- filtering is applied dynamically to the event list

#### User Actions

Users can:

- click on an event card → navigate to Event Detail Page
- apply sorting options
- apply category filters to refine results

### Event Detail Page

The Event Detail Page is opened when a user clicks on an event card. This page displays detailed information about a selected event.

#### Content

- title
- categories/tags
- organizer / creator of the event
- date and time
- location
- participant count / capacity (if applicable)
- full event description
- additional notes (if provided)

#### User Actions

Users can:

- bookmark the event
- apply or sign up for the event (if applicable)
- close the detail view and return to the previous list

#### Notes

- the detail view may be implemented as a modal/dialog overlay or a separate page
- uses existing UI components such as Card and Dialog

### Gigs Page

The Gigs Page displays all ongoing gigs and is accessible from the "Gigs" item in the navigation bar. This page focuses on browsing and filtering gigs without AI-based ranking.

#### Content

- displays all ongoing gigs using the Card component
- gigs are shown in a list or grid layout

#### Sorting

Users can sort gigs by:

- date/time (newest first or oldest first)
- number of applications
- number of bookmarks

#### Filtering

Users can filter gigs by category:

- supports selecting one or multiple categories
- filtering is applied dynamically to the gig list

#### User Actions

Users can:

- click on a gig card → navigate to Gig Detail Page
- apply sorting options
- apply category filters to refine results

### Gig Detail Page

The Gig Detail Page is opened when a user clicks on a gig card.

This page displays detailed information about a selected gig.

#### Content

- title
- categories/tags
- organizer / creator of the gig
- date and time
- location
- participant count / capacity (number of participants required)
- full gig description
- additional notes (if provided)

#### User Actions

Users can:

- bookmark the gig
- apply or express interest in the gig (if applicable)
- close the detail view and return to the previous list

#### Notes

- the detail view may be implemented as a modal/dialog overlay or a separate page
- uses existing UI components such as Card and Dialog

### My Page

The My Page displays user-related content and is accessible from the "My Page" item in the navigation bar. This page serves as a central place for users to manage their activities and saved content.

#### Content

The page includes the following sections:

- Collections
  - displays events and gigs the user has saved or bookmarked

- Applications
  - displays events the user has signed up for
  - displays gigs the user has applied to

- Created
  - displays events and gigs created by the user

#### User Actions

Users can:

- click on an event or gig card → navigate to the corresponding Detail Page
- remove events or gigs from Collections
- withdraw from signed-up events or applied gigs
- open created events or gigs for editing
- delete created events or gigs

#### Notes

- items are displayed using the existing Card component
- this page aggregates data from user, event, and gig modules
- editing created items navigates to the corresponding management flow or edit view

### Search Results Page

The Search Results Page displays results based on the user's search input from the global search bar. This page supports keyword-based search for events and gigs.

#### Content

- displays matching events and gigs using the Card component
- results are based on the keywords entered by the user
- may include both Events and Gigs in the same result list

#### User Actions

Users can:

- click on an event card → navigate to Event Detail Page
- click on a gig card → navigate to Gig Detail Page
- refine their search by entering a new query

#### Notes

- this page only supports traditional keyword-based search
- AI interaction is handled separately through the AI Agent Page
- the exact search logic is handled by the backend system

### AI Agent Page

The AI Agent Page provides a dedicated space for users to interact with the AI assistant.

This page is accessible from the AI Agent button in the top navigation bar, located next to the search input and profile icon.

#### Content

The page is divided into two main areas:

- Conversation History Sidebar
  - displays previous chat sessions
  - allows users to select a previous conversation and continue it
  - allows users to delete conversation history

- Chat Area
  - displays the current conversation between the user and the AI agent
  - allows users to type and send messages
  - displays AI-generated responses in a chat-style layout

#### User Actions

Users can:

- start a new conversation with the AI agent
- continue an existing conversation from the history sidebar
- delete previous conversations
- send messages and receive responses from the AI agent

#### Notes

- this page is separate from the traditional Search Results Page
- the overall interaction style is similar to a standard chatbot interface
- the left side contains conversation history, and the right side contains the active chat session

### Profile Page

The Profile Page provides access to user account information and settings, and is accessible from the profile icon in the navigation bar.

#### Content

The page includes the following options:

- My Profile
  - displays basic user information

- Manage Account
  - allows users to update account settings

- Sign Out
  - allows users to log out of the application

#### User Actions

Users can:

- view their profile information
- manage account settings
- sign out of the application

#### Notes

- this page may be implemented as a dropdown menu or a dedicated page
- authentication and account management are handled by the existing auth system

## Management Pages

### Add New Event Page

The Add New Event Page allows users to create a new event.

#### Content

- title
- categories/tags
- date and time
- location
- description
- participant capacity (optional)
- additional notes (optional)

#### User Actions

Users can:

- fill in event details
- submit the form to create a new event
- cancel and return to the previous page

#### Notes

- participant capacity is optional for events
- uses existing form-related UI components (e.g., Input, Textarea, Select)

### Add New Gig Page

The Add New Gig Page allows users to create a new gig.

#### Content

- title
- categories/tags
- date and time
- location
- description
- required number of participants (required)
- additional notes (optional)

#### User Actions

Users can:

- fill in gig details
- specify the required number of participants
- submit the form to create a new gig
- cancel and return to the previous page

#### Notes

- the required number of participants must be provided for gigs
- uses existing form-related UI components (e.g., Input, Textarea, Select)
