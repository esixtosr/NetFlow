# 🌐 NetFlow: Interactive Enterprise Topology & Core Segmentation Planner

NetFlow is an interactive, browser-native network topology design suite and documentation workbench engineered using vanilla HTML5, CSS3, and modern JavaScript. It is purpose-built to model multi-tier enterprise networks, visualize strict broadcast domain isolation (VLAN segmentation), map port-level physical layers, and export high-fidelity documentation matching rigorous auditing baselines.

This platform bridges the gap between software development and deep infrastructure security engineering, providing a responsive canvas interface for blueprinting defense-in-depth security architectures without the overhead of heavy third-party modeling applications.

---

## 🚀 Core Capabilities

NetFlow converts static diagramming into an active architectural layout directly inside the browser client sandbox:

- **Strict Network Segmentation Mapping:** Rapidly deploy visual logical network wrappers to clearly define security boundaries, demilitarized zones (DMZs), and isolated subnets.
- **Dynamic Network Profile Inheritance:** Devices automatically inherit subnets, domain name servers (DNS), default gateways, and DHCP operational states based on spatial containment inside a specific VLAN Zone.
- **Infrastructure Telemetry Overrides:** Explicitly configure dedicated production platforms (*e.g., Domain Controllers, Hypervisors, Storage Arrays*) with manual static IP bindings, custom routing paths, and duplicate IP conflict alerting.
- **Multi-VLAN Interface Accessibility Tracking:** Document advanced multi-homed infrastructure nodes (*such as Proxmox hypervisor clusters or managed Layer-2 switches*) that access distinct peripheral VLANs for management, storage, or staging.
- **Port-Aware Interface Interconnections:** Establish discrete, stateful port-to-port connections complete with line styling modifiers representing physical link media (e.g., Solid for physical lines, Dashed for wireless boundaries).
- **Automated Client-Side Media Rendering:** Export production-ready documentation as crisp PNG graphics, serialized JSON infrastructure backups, or fluid WebM/MP4 animated capture reels demonstrating mock packet paths.

---

## ✨ Engineering Spotlights

### 🧭 High-Performance HTML5 Canvas Editor
Features a hardware-accelerated drawing surface equipped with infinite multi-touch pan, dynamic contextual scroll wheel zooming, auto-snapping grid coordinates, and programmatic canvas auto-centering bounding boxes. It replicates the latency-free responsiveness of native desktop systems inside a single standard web viewport.

### 🔌 Micro-Segmented Broadcast Domains (VLANs)
Architect security perimeters cleanly by dragging infrastructure assets into distinct, color-coded boundaries. NetFlow natively handles spatial detection: shifting an endpoint into a new zone automatically prompts a VLAN move detection routine, purging or renewing lease allocations instantly to mirror standard real-world network operations.

### 🧠 Intelligently Suggested Network Variables
The platform reads the network prefix configuration assigned to any given VLAN zone and instantly populates contextual dropdown selectors with valid, unused IP allocations in that boundary pool. It flags duplicate structural errors to ensure accuracy across all physical and logical connection channels.

### 📐 Structural Orthogonal Line Engineering
Features smart vector rendering logic supporting snap-lock behaviors, absolute right-angle paths, and automatic alignment snapping. Connectors bypass layout blocks gracefully, establishing polished top-down system buses that prevent visual crowding or textual overlap.

---

## 🖧 Baseline Production Topology Architecture

NetFlow boots up out-of-the-box pre-configured with a comprehensive real-world multi-tier network baseline, documenting exact interface port mapping, virtual boundaries, and hypervisor allocations:

### 1. Physical Layer Port Specification
* **Edge Routing & Security:** UniFi Cloud Gateway Fiber (CGF)
  * `Port 2` ──> Windows 11 Workstation (Hardwired)
  * `Port 3` ──> Downlink connection to USW Flex Switch Port 1
  * `Port 4` ──> U7 Pro Wireless Access Point
* **Distribution Switching:** USW Flex 2.5G 8 PoE Switch
  * `Port 1` ──> Uplink from Cloud Gateway Fiber Port 3
  * `Port 2` ──> Proxmox VE Hardware Management Interface
  * `Port 3` ──> Enterprise Domain Controller (Dedicated SFF Hardware)
  * `Port 4` ──> Proxmox Hypervisor Host 1 (Core Enterprise Compute)
  * `Port 5` ──> Proxmox Hypervisor Host 2 (Lab & Projects Compute)
  * `Port 6` ──> Raspberry Pi (Dedicated Testing Node)
  * `Port 7` ──> Unassigned / Available Provisioning Port
  * `Port 8` ──> Testing MacBook Pro Interface

### 2. Logical Network Segmentation (VLAN Matrix)
* **Default VLAN (Blue | 192.168.1.0/24):** Hosts core network routing elements, the physical Windows 11 workstation, and the primary wireless network broadcast.
  * *SSID:* `CIA` (Broadcasting concurrently on 2.4 GHz, 5 GHz, and 6 GHz spectrums).
* **Enterprise VLAN (Green | 10.20.20.0/26):** Production-tier compute block containing the hardware Active Directory Domain Controller, the dedicated testing Pi, a testing MacBook Pro, and the virtualized enterprise core instances running on Proxmox Host 1.
  * *Host 1 Guests:* TrueNAS Core Storage, Ubuntu Server 24.04 (Node 1), Ubuntu Server 24.04 (Node 2), Windows Server 2025 Domain Controller 2, Windows 11 Enterprise VM.
* **Projects VLAN (Orange | 10.30.30.0/26):** Dedicated testing sandbox containing the virtualized environments hosted on Proxmox Host 2.
  * *Host 2 Guests:* Ubuntu Server 24.04 (Jellyfin Media), Windows 11 Dev Environment, Kali Linux Penetration Testing Suite.
* **IoT VLAN (Teal | 10.40.40.0/27):** Isolated broadcast domain for legacy and smart systems.
  * *SSID:* `FBI` (Restricted explicitly to the 2.4 GHz spectrum to maximize edge device compatibility and network isolation).
* **Management VLAN (Gray | 10.10.10.0/26):** High-security out-of-band management loop isolating the underlying Proxmox hypervisor bare-metal control interfaces from general user traffic.

---

## 🗂️ Project Repository Structure

```text
NetFlow/
├── assets/
│   └── icons/
│       ├── favicon-32x32.png
│       └── netflow-favicon.png
├── css/
│   └── styles.css
├── js/
│   ├── app.js            # Core orchestration layer
│   ├── canvas.js         # Canvas state rendering and viewport math
│   ├── config.js         # Network type definitions and global structural rules
│   ├── connections.js    # Port-aware mapping and vector lines routing
│   ├── devices.js        # Node lifecycle and hardware profile logic
│   ├── export.js         # Canvas recording pipelines and serialization engine
│   ├── history.js        # Undo/Redo historical snapshot array controls
│   ├── icons.js          # Programmatic SVGs and graphic templates
│   ├── main.js           # Launch sequencer and initialization
│   ├── modals.js         # Window interfaces and validation screens
│   ├── sidebar.js        # Element controls handler
│   ├── state.js          # Unified runtime data state tracking
│   ├── storage.js        # LocalStorage serialization rules
│   ├── zones.js          # VLAN containment and boundary handling
│   └── vendor/
│       ├── gif.js        # Multithreaded background gif compression workers
│       └── gif.worker.js
├── index.html            # Main canvas presentation wrapper
└── README.md             # Systems documentation
```

---

## 🛠️ Security & Networking Implementation Stack

- **Graphics Processing:** Raw HTML5 2D Canvas API (Zero external design framework dependencies).
- **Traffic Capture Engineering:** Native Browser MediaRecorder API.
- **Persistence Engine:** LocalStorage system state caching.
- **Portability Format:** Structured JSON state schema.

---

## ▶️ Setup & Local Operations

To launch NetFlow locally while preserving modern script modularity, run the application using a standard local development server:

### Using VS Code Live Server Extension:
1. Open the project root folder inside VS Code.
2. Right-click on `index.html`.
3. Choose **Open with Live Server**.
4. Access the loopback endpoint inside your web browser:
   ```text
   http://127.0.0.1:5500/index.html
   ```

---

## 🎯 Strategic Portfolio Purpose

NetFlow is engineered to demonstrate applied competence in **Systems Security Engineering**, **Network Segmentation**, and **Interactive Client-Side Software Design**. It highlights core engineering domains, including:

- **Enterprise Baseline Configuration:** Mapping and blueprinting complex network environments utilizing recognized architecture standards.
- **Zero-Trust Network Isolation:** Visualizing macro and micro-segmentation models (*e.g., isolating production environments, management loops, and untrusted IoT devices*).
- **Asynchronous Front-End State Management:** Maintaining a single, complex source of truth handling intersecting device matrix states, connection tables, and physical canvas properties synchronously.

---

## 👤 Author

Engineered by Edwin I. Sixtos Ruiz as part of an advanced cybersecurity and enterprise network engineering portfolio.# NetFlow
