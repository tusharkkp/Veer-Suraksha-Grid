# Veer Suraksha Grid  
## स्वच्छता वीर Integrated Safety & Governance Platform

Veer Suraksha Grid is a smart municipal safety and governance platform designed to improve the safety, monitoring, and management of sanitation operations in Solapur Municipal Corporation.

This project focuses on protecting **sanitation workers / स्वच्छता वीर** by combining **worker safety monitoring, machine-first enforcement, digital manual-entry approval, map-based command visibility, emergency response, and incident accountability** into one integrated platform.



## Problem Statement

Sanitation workers involved in sewer and manhole operations face serious risks such as:

- toxic gas exposure
- oxygen-deficient environments
- unsafe manual entry
- poor real-time visibility
- delayed emergency response
- weak coordination between field teams and command authorities

Although mechanized cleaning systems exist, field operations often lack an integrated digital workflow that connects worker safety, asset risk, machine allocation, manual-entry control, and municipal command visibility.

Veer Suraksha Grid addresses this gap.

---

## Solution Overview

Veer Suraksha Grid is a **Marathi-first, map-centric, field-to-command municipal operating platform**.

It connects:

- workers
- sewer/manhole assets
- machine inventory
- live telemetry
- approval workflows
- communication
- SOS response
- municipal command dashboard
- incident logging
- preventive planning

The platform is designed around two main user roles:

- **Worker / स्वच्छता वीर**
- **Commander/Admin**

---

## Key Features

- **Worker Safety Monitoring** through VeerGuard
- **Pre-Entry Hazard Inspection** through VeerProbe
- **Remote Risky Zone Inspection** through VeerCrawler
- **Machine-First Enforcement** through FleetEye
- **Digital Manual-Entry Approval** through VeerPass
- **Dynamic Risk Scoring** through VeerRisk
- **AI-Assisted Hazard Support** through VeerVision
- **Incident Logging & Replay** through VeerBlackBox
- **Preventive Planning** through VeerPlan
- **Map-Based Command Monitoring** through SwachhCommander Dashboard
- **Worker-Admin Communication**
- **SOS Emergency Escalation**
- **Grievance-to-Task Integration**
- **Marathi + English Interface Support**

---

## System Modules

### 1. VeerGuard
Worker-side wearable safety system for monitoring gas and oxygen conditions and sending SOS alerts.

### 2. VeerProbe
Pre-entry inspection kit for checking manhole/sewer conditions before manual intervention.

### 3. VeerCrawler
Portable robotic inspection support for remote inspection in high-risk environments.

### 4. VeerEdge
Field communication gateway for device-to-platform connectivity.

### 5. FleetEye
Machine tracking, allocation, and machine-first governance system.

### 6. VeerRegistry
Digital registry for sewer/manhole assets, zone mapping, and asset history.

### 7. VeerRisk
Dynamic risk scoring engine based on zone, inspection, telemetry, and context.

### 8. VeerVision
AI-assisted visual hazard detection and anomaly support.

### 9. VeerPlan
Preventive maintenance and planning engine.

### 10. VeerPass
Digital authorization workflow for manual-entry approval.

### 11. VeerBlackBox
Incident logging, traceability, and replay system.

### 12. SwachhCommander Dashboard
Central command dashboard for Commander/Admin.

### 13. Grievance Integration
Complaint intake and complaint-to-task workflow integration.

---

## Architecture Summary

The system is built as a layered architecture:

- **Field Operations Layer**
- **IoT / Device Layer**
- **Communication Layer**
- **Backend / Application Logic Layer**
- **Data & Intelligence Layer**
- **Authorization & Governance Layer**
- **User Interface Layer**
- **Database Layer**
- **External Integration Layer**

---

## Technology Stack

### Frontend
- HTML
- CSS
- JavaScript
- Bootstrap
- Leaflet

### Backend
- Node.js
- Express.js

### Databases
- **Firebase** for operational and governance data
- **InfluxDB Cloud** for time-series telemetry

### IoT / Device Layer
- ESP32-based device logic
- gas sensing integration
- wearable / probe / crawler data flow

### AI / Intelligence
- AI-assisted logic for VeerVision
- rule-based recommendation support for VeerPass

### Tools / Platforms
- VS Code
- Git
- GitHub
- Firebase Hosting

---

## Pilot Prototype Scope

The current prototype is designed around a pilot-scale Solapur model:

- **6 sewer/manhole assets**
  - 2 High-Risk (Red)
  - 2 Medium-Risk (Yellow)
  - 2 Low-Risk (Green)

- **10 workers**
- assumed machine inventory including:
  - Jetting Machines
  - Rodding Machines
  - Sludge Removal Machines
  - Robotic Inspection Units

---

## Workflow

1. A task enters the system through complaint, admin entry, or planned maintenance.
2. The asset is identified through VeerRegistry.
3. Zone logic is applied.
4. Safety and inspection data are collected.
5. VeerRisk calculates the risk level.
6. FleetEye checks machine availability and machine-first compliance.
7. VeerPass prepares the manual-entry approval workflow.
8. Commander/Admin takes the final decision.
9. Worker receives task status and instructions.
10. Live monitoring continues during the task.
11. SOS can trigger emergency escalation.
12. VeerBlackBox stores all important events.

---

## Zone Logic

- **Red / High Risk** → Machine Only
- **Yellow / Medium Risk** → Machine First
- **Green / Low Risk** → Conditional Manual Entry

> Final manual-entry approval always remains with **Commander/Admin**.

---

## User Roles

### Worker / स्वच्छता वीर
Worker-side interface includes:

- assigned task
- risk status
- approval result
- PPE checklist
- alerts and instructions
- communication with admin
- SOS button

### Commander/Admin
Dashboard includes:

- Solapur map view
- asset status
- worker monitoring
- machine monitoring
- approval workflow
- communication panel
- alerts and SOS handling
- incident log access
- planning support

---

## Results / Prototype Demonstration

The prototype demonstrates:

- end-to-end field-to-command workflow
- zone-based operating logic
- machine-first decision flow
- digital manual-entry approval
- worker-admin communication
- SOS emergency response workflow
- incident logging and traceability
- map-based command visibility
- modular municipal deployment readiness

---

## Reproducibility

### Basic Setup Flow

1. Clone the repository
2. Install frontend dependencies
3. Install backend dependencies
4. Configure Firebase
5. Configure InfluxDB Cloud
6. Set environment variables
7. Connect IoT/device-side logic
8. Start backend server
9. Start frontend
10. Open in browser and test Worker / Commander roles

---

## Future Scope

- full Solapur-wide deployment
- live municipal integration
- stronger field hardware deployment
- real emergency system integration
- predictive maintenance expansion
- deeper AI-based hazard analytics
- stronger edge/offline communication support

---

## Current Limitations

- pilot-scale implementation
- some machine and asset values are prototype assumptions
- real IoT deployment requires waterproofing and ruggedization
- underground connectivity remains a field challenge
- sensors require calibration and maintenance
- emergency escalation is currently workflow-level, not full live dispatch integration

---

## Social Impact

This project aims to improve:

- worker safety
- dignity of sanitation workers
- municipal accountability
- faster emergency response
- better machine utilization
- reduced unsafe manual exposure
- stronger field-to-command coordination

---

## Project Vision

To transform sanitation operations from fragmented manual supervision into a **connected, accountable, bilingual, and municipally adoptable safety operating platform**.

---

## Acknowledgement

This project is developed as part of the **SAMVED Hackathon** and is inspired by the need to build safer, smarter, and more accountable sanitation systems for Solapur Municipal Corporation.
