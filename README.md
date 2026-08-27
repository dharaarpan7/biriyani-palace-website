# 🍛 Biriyani Palace

> A cinematic, premium biryani experience brought to life through immersive scroll-driven animations and rich visual storytelling.

**Biriyani Palace** is a premium restaurant website concept built to deliver an immersive digital dining experience. Instead of following a conventional restaurant website layout, the project uses cinematic visuals, smooth scrolling, sophisticated typography, and scroll-controlled animations to turn the entire website into a visual story.

---

## ✨ Features

- 🎬 **Cinematic scroll-driven experience**
- 🌀 **Premium GSAP animations**
- 📜 **ScrollTrigger-powered interactions**
- 🌊 **Smooth scrolling with Lenis**
- 🍛 **Immersive biryani-focused storytelling**
- 🎨 **Premium editorial-style UI/UX**
- 📱 **Responsive design**
- ⚡ **Modern React + TypeScript architecture**
- 🎞️ **Video and media-driven sections**
- 🧩 **Reusable React components**
- 🧪 **Automated testing with Vitest**
- 🚀 **Production-ready Vite setup**

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| ⚛️ React | UI and component architecture |
| 🔷 TypeScript | Type-safe development |
| ⚡ Vite | Development and build tooling |
| 🎞️ GSAP | High-performance animations |
| 🎯 ScrollTrigger | Scroll-based animation control |
| 🌊 Lenis | Smooth scrolling |
| 🧪 Vitest | Testing |
| 🎨 CSS | Styling and responsive design |

---

# 🚀 Getting Started

Follow the steps below to run **Biriyani Palace** locally.

## 📋 Prerequisites

Make sure the following are installed:

- **Git**
- **Node.js**
- **npm**

Check Node.js:

```bash
node --version
```

Check npm:

```bash
npm --version
```

Check Git:

```bash
git --version
```

---

# 📥 1. Clone the Repository

Open a terminal and run:

```bash
git clone https://github.com/dharaarpan7/biriyani-palace-website.git
```

Enter the project directory:

```bash
cd biriyani-palace-website
```

---

# 📦 2. Install Dependencies

Install all required dependencies:

```bash
npm install
```

This automatically installs the packages defined in `package.json`.

You do **not** need to manually install React, GSAP, Lenis, Vite, or other project dependencies.

---

# ▶️ 3. Run the Website Locally

Start the Vite development server:

```bash
npm run dev
```

Vite will display a local URL, usually:

```text
http://localhost:5173/
```

Open that URL in your browser.

🎉 The website is now running locally.

---

# 🛑 Stop the Development Server

Press:

```text
Ctrl + C
```

in the terminal.

---

# 🌐 Run on Your Local Network

To access the website from another device on the same Wi-Fi network:

```bash
npm run dev -- --host
```

Vite will display a network URL that can be opened from another device.

---

# 🏗️ Production Build

Create an optimized production build:

```bash
npm run build
```

The generated files will be placed in:

```text
dist/
```

The workflow is:

```text
Source Code
     ↓
npm install
     ↓
npm run build
     ↓
dist/
     ↓
Deploy
```

---

# 🔍 Preview the Production Build

After building:

```bash
npm run preview
```

Vite will provide a local URL for previewing the production build.

---

# 🧪 Running Tests

The project uses **Vitest** for testing.

Run tests:

```bash
npm run test
```

Run tests in watch mode:

```bash
npm run test -- --watch
```

---

# 📁 Project Structure

```text
biriyani-palace-website/
│
├── public/
│   └── assets/
│       └── ...
│
├── src/
│   │
│   ├── components/
│   │   ├── ChapterIndicator/
│   │   ├── CinematicStage/
│   │   ├── Loader/
│   │   ├── Navigation/
│   │   ├── ReservationSection/
│   │   │
│   │   └── sections/
│   │       ├── Experience.tsx
│   │       ├── FinalCTA.tsx
│   │       ├── Footer.tsx
│   │       ├── MenuSection.tsx
│   │       ├── Philosophy.tsx
│   │       └── Signature.tsx
│   │
│   ├── data/
│   │   ├── chapters.ts
│   │   └── menu.ts
│   │
│   ├── lib/
│   │   ├── cinematicTimeline.ts
│   │   ├── scrollController.ts
│   │   └── videoManager.ts
│   │
│   ├── test/
│   │   └── setup.ts
│   │
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── docs/
│   └── testing/
│       └── cinematic-scroll.tdd.md
│
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── .gitignore
└── README.md
```

---

# 🎬 Cinematic Scroll Experience

The core feature of Biriyani Palace is its **scroll-driven cinematic experience**.

Scrolling controls the progression of the visual story instead of simply moving between static sections.

```text
User Scroll
     ↓
Lenis Smooth Scrolling
     ↓
Scroll Position
     ↓
GSAP ScrollTrigger
     ↓
Cinematic Timeline
     ↓
Visual Transformations
     ↓
Next Story Moment
```

Different elements can respond to scroll progress:

```text
Scroll
  │
  ├── Background movement
  ├── Image / video scaling
  ├── Typography reveal
  ├── Element rotation
  ├── Opacity transitions
  └── Section transitions
```

The result is an interactive cinematic experience rather than a conventional restaurant webpage.

---

# 🌀 GSAP + ScrollTrigger

**GSAP** handles the high-performance animation system.

**ScrollTrigger** connects animations to the user's scroll position.

This enables:

- Fade-in animations
- Scale transitions
- Image movement
- Text reveals
- Pinned sections
- Scroll-synchronized timelines
- Layered transitions
- Cinematic scene changes

The primary cinematic timeline logic is organized in:

```text
src/lib/cinematicTimeline.ts
```

---

# 🌊 Lenis Smooth Scrolling

The website uses **Lenis** to create smooth scrolling.

Conceptually:

```text
Mouse / Trackpad
       ↓
     Lenis
       ↓
Smooth Scroll
       ↓
ScrollTrigger
       ↓
GSAP Timeline
       ↓
Cinematic Experience
```

The combination of Lenis, GSAP, and ScrollTrigger creates the premium scrolling feel of the website.

---

# 🎞️ Video & Media

Video-related functionality is separated into:

```text
src/lib/videoManager.ts
```

When adding or replacing media, make sure:

- The file exists.
- The path is correct.
- The filename matches exactly.
- Uppercase/lowercase characters match.
- The format is browser-compatible.
- Large media files are compressed appropriately.

---

# 🎨 Website Sections

### Hero

Introduces the Biriyani Palace brand through cinematic visuals and motion.

### Experience

Introduces the restaurant's overall dining experience.

### Philosophy

Communicates the story and philosophy behind the food.

### Signature

Highlights signature dishes and the restaurant's visual identity.

### Menu

Presents the menu in an immersive format.

### Reservation

Provides the reservation experience and call-to-action.

### Final CTA

Brings the experience toward a final conversion-focused section.

### Footer

Provides final navigation and supporting information.

---

# 🧩 Component Architecture

The website is divided into reusable React components:

```text
App
│
├── Navigation
├── Loader
├── CinematicStage
├── ChapterIndicator
├── Experience
├── Philosophy
├── Signature
├── MenuSection
├── ReservationSection
├── FinalCTA
└── Footer
```

This makes the project easier to:

- Maintain
- Debug
- Extend
- Reuse
- Customize

---

# 🍽️ Updating Menu Items

Menu data is located at:

```text
src/data/menu.ts
```

Modify this file to update menu-related content.

---

# 📖 Updating Chapters

Cinematic chapter information is located at:

```text
src/data/chapters.ts
```

This can be used to modify chapter names, story progression, and navigation indicators.

---

# 🎨 Global Styling

Global styles are located at:

```text
src/index.css
```

Use this file to modify global typography, spacing, layout rules, responsive behavior, and base styles.

---

# 📱 Responsive Design

Test the website across different screen sizes.

### Desktop

```text
1920 × 1080
1440 × 900
1366 × 768
```

### Tablet

```text
1024 × 1366
768 × 1024
```

### Mobile

```text
430 × 932
390 × 844
375 × 812
```

Pay particular attention to:

- Scroll performance
- Video positioning
- Text wrapping
- Navigation
- Button sizes
- Section spacing
- Animation timing

---

# ⚡ Performance

Because the website uses cinematic animations and media, performance is important.

Recommended practices:

- Compress large videos.
- Optimize images.
- Use modern image formats where appropriate.
- Avoid unnecessarily large media files.
- Keep animations GPU-friendly.
- Prefer `transform` and `opacity` for animations.
- Avoid unnecessary React re-renders.
- Test animations on real mobile devices.
- Avoid loading unnecessary assets.

---

# 🐛 Troubleshooting

## `npm` is not recognized

If you see:

```text
'npm' is not recognized as an internal or external command
```

Node.js is either not installed or is not available in your system PATH.

Install Node.js and restart your terminal.

---

## `npm install` fails

Try:

```bash
npm cache clean --force
```

Then:

```bash
npm install
```

If the problem continues, remove `node_modules` and reinstall.

### Windows PowerShell

```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

### macOS / Linux

```bash
rm -rf node_modules
npm install
```

---

## Port 5173 is already in use

Run Vite on another port:

```bash
npm run dev -- --port 3000
```

Then open:

```text
http://localhost:3000/
```

---

## Animations are not working

Make sure the website is running through Vite:

```bash
npm run dev
```

Do **not** open `index.html` directly by double-clicking it.

---

## Assets or videos are missing

If an image or video is not appearing:

1. Check that the file exists.
2. Check the file path.
3. Check the filename.
4. Check uppercase/lowercase characters.
5. Check the browser console for errors.
6. Check the Network tab for `404` errors.

Open Developer Tools with:

```text
F12
```

Then inspect:

```text
Console
Network
```

---

# 🔧 Development Workflow

```bash
# Clone repository
git clone https://github.com/dharaarpan7/biriyani-palace-website.git

# Enter project
cd biriyani-palace-website

# Install dependencies
npm install

# Start development server
npm run dev
```

After making changes:

```bash
# Run tests
npm run test

# Create production build
npm run build

# Preview production build
npm run preview
```

---

# 📦 Available npm Commands

| Command | Description |
|---|---|
| `npm install` | Install project dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests |

---

# 🚀 Deployment

The project uses Vite and can be deployed to modern static hosting platforms such as:

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages
- Any static web server

Build the project:

```bash
npm run build
```

The deployment directory is:

```text
dist/
```

### Generic deployment configuration

```text
Build Command:
npm run build

Output Directory:
dist
```

---

# 🔐 Environment Variables

If environment variables are introduced in the future, create:

```text
.env.local
```

Do **not** commit private API keys, passwords, tokens, or other secrets to GitHub.

For Vite applications, client-side environment variables generally use the:

```text
VITE_
```

prefix.

Example:

```text
VITE_API_URL=your_api_url
```

Never expose sensitive server-side secrets through client-side environment variables.

---

# 🤝 Contributing

Contributions and improvements are welcome.

### 1. Fork the repository

Create your own fork.

### 2. Create a feature branch

```bash
git checkout -b feature/my-new-feature
```

### 3. Make your changes

Implement your feature or improvement.

### 4. Run tests

```bash
npm run test
```

### 5. Build the project

```bash
npm run build
```

### 6. Commit your changes

```bash
git add .
git commit -m "feat: add new feature"
```

### 7. Push your branch

```bash
git push origin feature/my-new-feature
```

### 8. Open a Pull Request

Create a pull request and describe the changes.

---

# 📸 Screenshots

Add screenshots of the website here.

Example:

```markdown
![Biriyani Palace Hero](./screenshots/hero.png)
```

You can also add a GIF or short video demonstrating the cinematic scroll experience.

---

# 🎥 Demo

If you deploy the website, add your live demo here:

```text
Live Demo: YOUR_DEPLOYED_WEBSITE_URL
```

---

# 💡 Design Philosophy

Biriyani Palace was designed around a simple idea:

> **A restaurant website shouldn't just display food. It should create an experience.**

The website treats scrolling as a storytelling mechanism.

```text
Storytelling
     +
Typography
     +
Cinematic Visuals
     +
Motion
     +
Interaction
     ↓
Premium Digital Experience
```

Every section contributes to the overall visual narrative rather than behaving as an isolated webpage section.

---

# 📚 Learning Goals

This project demonstrates practical implementation of:

- React component architecture
- TypeScript
- Vite
- GSAP
- ScrollTrigger
- Lenis smooth scrolling
- Scroll-based storytelling
- Cinematic UI/UX
- Responsive web design
- Video-driven interfaces
- Component-based development
- Frontend performance optimization
- Automated frontend testing

---

# ⭐ Support

If you like this project, consider giving the repository a ⭐ on GitHub.

It helps the project gain visibility and supports further development.

---

# 👨‍💻 Author

**Arpan Dhara**

GitHub: [@dharaarpan7](https://github.com/dharaarpan7)

---

# 📄 License

This project is licensed under the **MIT License**.

See the [`LICENSE`](./LICENSE) file for the complete license text.

---

<div align="center">

### 🍛 Biriyani Palace

**A restaurant website designed as a cinematic experience — not just a webpage.**

⭐ If you enjoyed the project, consider starring the repository.

</div>
