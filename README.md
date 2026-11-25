# Cloud City

A 3D, browser-based trainer for the AWS Solutions Architect Associate (SAA-C03) exam. No build step, built with Three.js.

- **Explore:** fly over a city of 8 districts and click any of 68 AWS services (each a unique 3D model) for an exam-focused flashcard.
- **Architect Missions:** design architectures for client scenarios (DDoS, traffic spikes, AZ outages) with hints, then deploy and watch traffic flow.
- **Exam Drill:** 45 exam-style questions with explanations.

## Run

    python3 -m http.server 8765

Then open http://127.0.0.1:8765/ (Three.js loads from a CDN, so you need internet).

Touchpad: two-finger scroll to move, pinch to zoom, drag to rotate. Progress is saved in localStorage.

Note: flashcard, mission and quiz content was AI-written and not fact-checked; verify against the official AWS docs.
