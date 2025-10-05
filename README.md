<p align="center">
  <img src="./assets/syncfleet-logo.png" alt="SyncFleet Logo" width="120"/>
</p>

<h1 align="center">🚀 SyncFleet</h1>
<p align="center">Real-time group tracking & anomaly detection for fleets, teams, and travel groups.</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-active-success" />
  <img src="https://img.shields.io/badge/license-MIT-blue" />
  <img src="https://img.shields.io/badge/frontend-React-61DAFB" />
  <img src="https://img.shields.io/badge/backend-Node.js-339933" />
  <img src="https://img.shields.io/badge/realtime-Socket.IO-black" />
  <img src="https://img.shields.io/badge/database-MongoDB-47A248" />
</p>

---

## 📑 Table of Contents
- [📑 Table of Contents](#-table-of-contents)
- [🧭 About](#-about)
- [🌟 Why SyncFleet?](#-why-syncfleet)
- [🔑 Key Features](#-key-features)
- [🛠️ Tech Stack](#️-tech-stack)
  - [Frontend](#frontend)
  - [Backend](#backend)
- [⚙️ How It Works](#️-how-it-works)
- [🚧 Future Enhancements](#-future-enhancements)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

---

## 🧭 About
**SyncFleet** is a **real-time group tracking and alert system** designed for scenarios where multiple people or vehicles move together — rides, deliveries, rescue missions, or group travel.  

Users can:  
- Create or join rooms  
- Share live locations  
- Send alerts (including SOS)  
- Detect anomalies such as when a member strays from the group or remains stationary for too long  

---

## 🌟 Why SyncFleet?
Traditional tracking apps focus on **individual location sharing**. SyncFleet solves a **group-level coordination problem**:

- Teams need to know not just *where* someone is, but also *how they’re moving compared to the group*.  
- In critical use cases (rescue, fleet management, school buses, travel groups), **real-time anomalies matter** — e.g., if a member stops moving, deviates from the path, or triggers an SOS.  
- Communication is **context-aware**: location data is integrated with chat and alerts for seamless coordination.  

---

## 🔑 Key Features
- 🗺️ **Full-screen real-time map** with live user markers  
- 📍 **Unique pins & trails** showing each user’s movement path  
- 📡 **Live socket updates** for location and chat  
- 🚨 **SOS alerts & anomaly detection** (stationary too long, deviating from group)  
- 💬 **Room-based chat** for quick coordination  
- 👥 **User panel** showing active users, last-seen status, and SOS triggers  
- 🎨 **Clean, modern UI** with Tailwind + ShadCN  

---

## 🛠️ Tech Stack

### Frontend
- **React.js** → component-based UI  
- **TailwindCSS + ShadCN** → responsive, modern styling  
- **Leaflet.js** → interactive maps, markers, trails  
- **Socket.IO Client** → real-time communication  
- **LocalStorage / JWT** → lightweight user/session management  

### Backend
- **Node.js + Express.js** → REST API & server logic  
- **Socket.IO** → real-time event-driven communication  
- **MongoDB** → persistent storage for rooms, users, and logs  
- **JWT Authentication** → secure route & room access  

---

## ⚙️ How It Works
1. 🔐 **User Authentication** → Login/signup with email & password  
2. 🏠 **Room Creation / Join** → Users create or join existing rooms  
3. 📍 **Location Sharing** → Devices send live GPS updates to the server  
4. ⚡ **Real-Time Updates** → Socket.IO broadcasts positions to all members  
5. 🚨 **Anomaly Detection** → Detects stationary users or deviations  
6. 💬 **Communication** → Room chat with alerts & SOS integration  

---

## 🚧 Future Enhancements
- 📱 Mobile app (React Native) with background location tracking  
- 🧭 Smarter anomaly detection using ML (predict group paths)  
- 🛡️ End-to-end encryption for chat & location  
- 📊 Analytics dashboard for fleet admins  

---

## 🤝 Contributing
Contributions are welcome! You can:  
- Open issues for bugs or feature requests  
- Submit PRs with fixes or improvements  
- Suggest better anomaly detection strategies  

---

## 📜 License
This project is licensed under the **MIT License**.  

---

💡 *SyncFleet is built to make group coordination smarter, safer, and faster. If you like this project, don’t forget to ⭐ the repo!*  


# What Changes are Done
Better Navbar
Better Room Map
Restructured it Fully
All Things are Working Fine 
Implemented Redux 
Better Footer 
Better UI 
Made it Responsive 
