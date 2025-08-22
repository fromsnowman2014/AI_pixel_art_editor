AI Pixel Art Editor Improvement Plan
This document outlines a concrete development plan to resolve current issues and enhance the user experience by adding new features. Each phase can be executed independently or sequentially to ensure systematic development.

Phase 1: Frontend UI/UX Enhancement
Improve the convenience of the user's initial interface for more intuitive operation.

# 1. Toolbar Design Optimization
## Goal: Convert primary functions (Undo, Redo, Zoom) into icon buttons, place them in a top toolbar, and add tooltips to improve usability.

## Execution Plan:

### 1. Add an Icon Library: Add a library like react-icons or lucide-react to the project to import icons for Undo, Redo, Zoom In, and Zoom Out.

### 2. Modify Component Structure:
- Replace the existing text buttons with icon button components.
- keep current style and language to align the buttons horizontally in a toolbar at the top of the screen.

### 3. Implement Tooltips:
- Implement functionality so that when a user hovers over an icon button (onMouseEnter), a tooltip appears with a description of the function and its shortcut key.
- This can be created with simple CSS or by using a tooltip component from a UI library like Tippy.js, Shadcn/UI, or MUI.

## Expected Outcome: Provides a visually clean interface, allows for quick recognition of functions through icons, and increases user convenience by providing additional information via tooltips.

# 2. Quick Style Options UI Improvement
## Goal: Condense the multi-line style options into shorter line and use checkboxes instead of buttons to increase spatial efficiency.

## Execution Plan:

### Change HTML Structure: Change the structure for each option from a <div> and <button> combination to a <label> and <input type="checkbox"> combination.

### CSS Styling:
- Use Flexbox or Grid to style the checkboxes and labels so they display neatly in a single line.
- Custom-style the checkboxes to resemble the other button design to maintain overall design consistency.

### Update State Management Logic: Change the button's click event handler to the checkbox's onChange event handler, and modify the logic so that the React state is synchronized with the checkbox's checked property.

## Expected Outcome: Reduces the vertical space occupied by the UI to provide more canvas area and offers a more intuitive experience for selecting and viewing multiple options simultaneously.

# 3. Transparent Background Support
## Goal: Set the default canvas background to transparent and visually represent transparent areas with a checkerboard pattern.

## Execution Plan:

### Create Checkerboard Background:
- Make a better idea to create a checkerboard pattern for this.
- Structure it so the actual drawing canvas is placed on top of this container.

### Modify Canvas Initialization Logic:
- When first drawing or initializing the canvas, use clearRect to start with a transparent state instead of filling it with a specific color ('#FFFFFF') using fillStyle.
- Verify and update the logic to ensure that when exporting image data, it is saved in a PNG format that supports transparency.

## Expected Outcome: Enables users to accurately edit pixel art with transparency and predict the final result, leading to higher precision in their work.

**Phase 2: Core Feature Advancement**
Enhance image and video processing capabilities and improve the completeness of the editing experience.

# 1. Import and Convert External Media (Image/Video) from Links
## Goal: Allow users to import images or videos via a URL and automatically convert them into multiple frames that match the currently set canvas size and color palette.

## Execution Plan:

### dd URL Input UI or 파일 불러오기: Add an <input> field for the URL and an "Import" button.
### Resolve CORS Issues: Implement a server-side proxy (e.g., using Netlify Functions, Vercel Serverless Functions, or a simple Node.js/Express server) to handle potential Cross-Origin Resource Sharing (CORS) errors when fetching external resources.

### Media Decoding:
- Image/GIF: Process using the JavaScript Image object or the canvas API. For GIFs, use a library like gif.js or gifuct-js to decode frame by frame.
- Video: It is highly recommended to use the ffmpeg.wasm library for client-side video processing. This allows for extracting the first second of a video into an image sequence (e.g., PNGs). max video length is 1 sec.

### Apply Pixelation Logic:
- Draw each decoded frame onto an invisible <canvas> and retrieve the pixel data using getImageData.
- Apply resizing and color quantization algorithms to each frame based on the current pixel size (e.g., 64x64) and color count settings.
- Add the processed frames to the project's timeline as new frames.

## Expected Outcome: Automates the process of converting external media into pixel art, greatly assisting users' creative activities and enabling the creation of dynamic pixel art (e.g., animated GIFs) from videos.


# 2. Synchronize Canvas and Timeline Playback
## Goal: When the "Play" button is pressed, ensure the currently active frame in the timeline is rendered in real-time on the main canvas.

## Execution Plan:

### Review State Management Structure: It is recommended to manage the active frame's index (activeFrameIndex) as a global state (using React Context, Zustand, Redux, etc.).

### Implement Playback Logic:
- When the "Play" button is clicked, use setInterval to increment the activeFrameIndex by 1 at regular intervals (e.g., 100ms).
- When the "Stop" button is clicked, clear the interval using clearInterval.

### Canvas Rendering:
- Have the main canvas component subscribe to the activeFrameIndex state.
- Use the useEffect hook to write logic that re-renders the canvas with the appropriate frame data whenever activeFrameIndex changes.

## Expected Outcome: Allows users to preview their animations in real-time, making the editing process of checking and modifying transitions between frames much more intuitive and efficient.

**Phase 3: Backend Integration and User Features**
Implement a user account system and project-saving functionality to provide a personalized work environment.

# 1. Implement Social Login
## Goal: Provide easy login functionality using Google and Facebook accounts.

## Execution Plan (Based on Firebase Authentication):

### Firebase Project Setup: Enable Authentication in the Firebase console and add Google and Facebook as sign-in providers.

### Frontend Integration:
- Install and initialize the firebase SDK in your project.
- Create "Sign in with Google" and "Sign in with Facebook" buttons. On click, call the signInWithPopup function provided by Firebase.
- After a successful login, store the returned user information in a global state and update the UI to a "logged-in" state.
- Set up an onAuthStateChanged listener to detect and handle changes in the user's login state in real-time.

## Expected Outcome: Lowers the barrier to entry by allowing users to use the service with their existing social accounts without a separate registration process.

# 2. Project Save and Load Functionality
## Goal: When the "Save Project" button is clicked, the current work is saved to the backend and can be loaded again later.

## Execution Plan:

### Create API Endpoints (for a Custom Backend):
- POST /api/projects: Create and save a new project.
- PUT /api/projects/:id: Update an existing project.
- GET /api/projects: Fetch a list of all projects for the currently logged-in user.

### Implement Frontend Logic:
- On "Save" button click, serialize all current frame data and settings into a JSON object.
- Send this data to the backend API (or Firestore) to be saved/updated.
- Implement a feature where users can view their project list and click on a project to load its data into the editor.

## Expected Outcome: Provides a core user experience where users do not lose their progress if they stop working and can manage and continue multiple projects.

# 3. Backend and Database Setup
### Goal: Build a backend server and database to store user data and projects.

### Recommended Tech Stack:

### Firebase: The fastest and most efficient choice, as it provides Authentication, Firestore (database), and Storage all in one.

### Custom Backend: A more flexible backend can be built with a combination like Node.js + Express + MongoDB/PostgreSQL.

## Database Schema Design (Firestore Example):

### users collection:
- doc (userId): { uid, email, displayName, photoURL }

### projects collection:
- doc (projectId): { uid (owner), projectName, width, height, frames: [...], createdAt, updatedAt }
- The frames field will store an array of pixel data for each frame (e.g., as a stringified JSON).
