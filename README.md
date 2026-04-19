# NeuroChain AI
**Supply Chain Disruption Simulator with AI-Assisted Rerouting**

Live Demo: https://neurochain-ai.vercel.app

---

## Overview

NeuroChain AI is a web-based simulation platform that models real-time supply chain disruptions and demonstrates adaptive rerouting logic. Users can inject disruptions (traffic, weather, congestion) and observe how the system responds with alternative delivery paths and dynamic hub placement.

Built as a solo project to explore applied logistics optimization and interactive system design.

---

## Features

- **Disruption Simulation** — Inject traffic, weather, or congestion events and observe system response
- **Dynamic Rerouting** — Shipment agents recalculate paths when disruptions are detected
- **Temporary Hub Placement** — System proposes intermediate relay points to reduce bottlenecks
- **Risk Scoring Dashboard** — Each route displays an estimated risk score and rerouting rationale
- **Live Map Interface** — Real-time visualization of shipments and routes via Leaflet
- **Authentication** — Secure login with email/password and Google OAuth via Firebase

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Tailwind CSS |
| Backend / Auth | Firebase (Firestore, Cloud Functions, Auth) |
| Maps | Leaflet.js |
| Deployment | Vercel |

---

## How It Works

1. User defines a shipment route across a map
2. A disruption event is injected (manually or randomly)
3. The system evaluates alternate paths based on weighted cost factors
4. A rerouted path is displayed alongside a risk score and decision summary
5. Optional: temporary intermediate hubs are placed to simulate relay logistics

---

## Limitations & Honest Scope

- Routing logic is rule-based, not ML-driven
- Disruption data is simulated, not pulled from live APIs
- Designed as a proof-of-concept; not production-scale

---

## Roadmap

- [ ] Integrate live traffic / weather APIs
- [ ] Replace rule-based routing with reinforcement learning
- [ ] Multi-agent communication between shipment nodes
- [ ] Export rerouting reports as PDF

---

## Author

**Jaideep Singh Anand**  
