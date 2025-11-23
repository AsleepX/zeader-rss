# Zeader RSS Reader

A modern, personal RSS reader application built with React and Node.js.

## Features

- **Feed Management**: Subscribe to RSS/Atom feeds and organize them into folders.
- **Multiple Views**:
  - **Article View**: Traditional list view for reading articles.
  - **Waterfall View**: Grid layout optimized for image-heavy feeds.
- **OPML Support**: Import your feed subscriptions from other readers via OPML.
- **Local Storage**: All data is stored locally on your machine (JSON based), ensuring privacy and ownership of your data.
- **Responsive Design**: Collapsible sidebar and responsive layout.
- **Drag & Drop**: Organize feeds and folders easily.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Zustand (State Management), Framer Motion, Lucide React (Icons).
- **Backend**: Node.js, Express.
- **Data Storage**: Local JSON files.

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   \\\ash
   git clone <repository-url>
   cd rss-reader
   \\\`n
2. Install dependencies:
   \\\ash
   npm install
   \\\`n
### Running the Application

Start both the backend server and the frontend development server with a single command:

\\\ash
npm run dev
\\\`n
- Frontend will be available at \http://localhost:5173\`n- Backend API runs on \http://localhost:3001\`n
## Project Structure

- \src/\: Frontend React application.
- \server/\: Backend Express server and file storage logic.
- \data/\: Local data storage (feeds and cached articles). **Note**: This folder is ignored by git to protect your privacy.

## License

MIT
