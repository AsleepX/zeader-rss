# Zeader RSS Reader

English | [简体中文](./README_zh-CN.md)

A modern, personal RSS reader application built with React and Node.js, designed for privacy, performance, and a great user experience.

![Zeader Screenshot](images/zeader_Gallery.png)

![Zeader Screenshot](images/zeader_Article1.png)

![Zeader Screenshot](images/zeader_Article2.png)

## Features

- **Smart Feed Management**: Easily subscribe to RSS/Atom feeds and organize them into custom folders to keep your reading list tidy.
- **Dual View Modes**:
  - **Article View**: A traditional, clean list layout optimized for reading text-heavy articles efficiently.
  - **Waterfall View**: An immersive grid layout perfect for browsing image-centric feeds like art galleries or photography blogs.
- **Privacy First**: All your data is stored locally on your machine using JSON files. No external servers tracking your reading habits—you own your data.
- **OPML Support**: Seamlessly migrate your feed subscriptions from other RSS readers using OPML import.
- **Interactive UI**:
  - **Collapsible Sidebar**: Maximize your reading space with a toggleable sidebar.
  - **Drag & Drop**: Intuitively organize your feeds and folders with drag-and-drop support.
  - **Smooth Animations**: Enjoy a fluid user experience powered by Framer Motion.
- **Keyboard Navigation**: Browse through your feeds and articles without leaving the keyboard.
- **AI Assistant**: Built-in AI integration to summarize articles or explain selected text instantly.
- **Custom CSS**: Inject your own CSS to personalize the appearance of Zeader to your liking.

## AI Features

- **Z YAML (Gallery View)**: Automatically generates a structured YAML info bar for image galleries, extracting key details like Title, Creator, and Tags.
- **Z Summary (Article View)**: Automatically generates a concise 3-sentence summary with tags for articles, helping you grasp the core content quickly.
- **AI Unread Summary (Shortcut: `Z` or `]`)**: Analyzes all your unread articles and synthesizes them into an intelligent news digest. It identifies common themes, trends, and connections across articles, presenting key highlights and notable insights. Clickable references let you jump directly to any mentioned article.


## Keyboard Shortcuts

Master these shortcuts to navigate Zeader like a pro:

### Global
| Key  | Action                                  |
| :--- | :-------------------------------------- |
| `[`  | Toggle Sidebar                          |
| `]`  | Toggle AI Unread Summary Panel          |
| `1`  | Switch to Article View (All Articles)   |
| `2`  | Switch to Photo View (All Photos)       |
| `3`  | Switch to Video View (All Videos)       |

### Article View
| Key       | Action                                |
| :-------- | :------------------------------------ |
| `↑` / `↓` | Navigate through the article list     |
| `Enter`   | Open the selected article             |
| `Space`   | Mark current as read and move to next |
| `Z` / `]` | Toggle AI Unread Summary Panel        |


### Photo / Video View
| Key                   | Action                          |
| :-------------------- | :------------------------------ |
| `↑` / `↓` / `←` / `→` | Navigate through the grid cards |
| `Enter`               | Open the selected item          |

### General
| Key   | Action                            |
| :---- | :-------------------------------- |
| `Esc` | Close open modals or details view |

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Zustand (State Management), Framer Motion, Lucide React.
- **Backend**: Node.js, Express.
- **Data Storage**: Local JSON files.

## Local Development

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

## Deployment

### Deploy to Server

To deploy Zeader on a server, follow these steps:

1.  **Clone the repository** on your server:
    ```bash
    git clone https://github.com/AsleepX/zeader-rss.git
    cd rss-reader
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Build the frontend**:
    ```bash
    npm run build
    ```

4.  **Start the server**:
    ```bash
    npm start
    ```
    The server will start on port 3001 by default. You can access the application at `http://your-server-ip:3001`.

    > **Note**: In production, the backend server (port 3001) serves the built frontend files. This is different from development mode where Vite uses port 5173.

    *Optional*: You can set the `PORT` and `PASSWORD` environment variables to customize the port and enable password protection.
    ```bash
    export PORT=8080
    export PASSWORD=your_secure_password
    npm start
    ```

### Deploy on Railway

You can easily deploy Zeader to Railway with a single click:

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/pCRDAl?referralCode=0OR46e&utm_medium=integration&utm_source=template&utm_campaign=generic)

### Deploy on Zeabur

If you prefer to deploy manually on Zeabur, follow these steps:

[Sign up/Login](https://zeabur.com/referral?referralCode=AsleepX): Go to Zeabur and log in with your GitHub account.

Fork the Repository: Click the Fork button at the top right of this repository to copy it to your own GitHub account.

Create Service:

In the Zeabur Dashboard, click Create Project.

Click Deploy New Service, select Git, and choose the zeader-rss repository you just forked.

Configure Settings (Important): Before accessing the service, go to the service dashboard:

Volume (Storage): Click on the Settings tab -> Volumes. Click "Add Volume".

- Name: Any name (e.g., zeader-data).

- Mount Path: Enter /app/data. (This is crucial for saving your data).

Environment Variables: Click on the Variables tab.

- Key: PASSWORD

- Value: Set your desired access password.

Enable Networking:

Click on the Networking tab.

Click Generate Domain (or bind your custom domain).

Visit the generated URL to start using Zeader!

## Project Structure

- `src/`: Frontend React application.
- `server/`: Backend Express server and file storage logic.
- `data/`: Local data storage (feeds and cached articles).

## License

MIT
