# Zeader RSS Reader

A modern, personal RSS reader application built with React and Node.js.

![Zeader Screenshot](images/zeader_Gallery.png)

![Zeader Screenshot](images/zeader_Article.png)

## Features

- **Feed Management**: Subscribe to RSS/Atom feeds and organize them into folders.
- **Multiple Views**:
  - **Article View**: Traditional list view for reading articles.
  - **Waterfall View**: Grid layout optimized for image-heavy feeds.
- **OPML Support**: Import your feed subscriptions from other readers via OPML.
- **Local Storage**: All data is stored locally on your machine (JSON based), ensuring privacy and ownership of your data.
- **Responsive Design**: Collapsible sidebar and responsive layout.
- **Drag & Drop**: Organize feeds and folders easily.
- **Keyboard Shortcuts**: Press `[` to toggle the sidebar.

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
   ```bash
   git clone https://github.com/AsleepX/zeader-rss.git
   cd rss-reader
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

Start both the backend server and the frontend development server with a single command:

```bash
npm run dev
```

- Frontend will be available at `http://localhost:5173`
- Backend API runs on `http://localhost:3001`

## Project Structure

- `src/`: Frontend React application.
- `server/`: Backend Express server and file storage logic.
- `data/`: Local data storage (feeds and cached articles). **Note**: This folder is ignored by git to protect your privacy.

## License

MIT
