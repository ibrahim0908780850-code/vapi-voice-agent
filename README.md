AI Voice Agent for Real Estate

An AI-powered voice and CRM backend designed for real-estate workflows.

The project combines voice-agent capabilities with backend services, AI intelligence modules, CRM-oriented workflows, integrations, background jobs, and persistent data management.

Overview

This project was built to explore how AI voice agents can be integrated into real-estate business workflows.

The system includes backend services for handling application logic, integrations, AI-related processing, background jobs, authentication, real-time communication, and data operations.

The repository currently contains dedicated modules for:

- AI context building
- Voice intelligence
- Deal intelligence
- Memory
- Recommendations
- Daily reporting
- WhatsApp automation
- Integration handling
- Webhooks
- Google Sheets integration
- n8n integration
- Background job processing
- Automated tests

Key Features

AI & Voice Intelligence

- AI context building
- Voice intelligence processing
- Conversation memory
- Deal intelligence
- Recommendation engine
- Daily reporting engine

CRM & Real-Estate Workflows

- Real-estate focused CRM architecture
- Lead and deal-oriented workflows
- Automated processing
- Business intelligence modules
- Workflow integrations

Integrations

- Vapi voice-agent integration
- Google Gemini integration
- Supabase
- n8n
- Google Sheets
- Webhooks
- External API integrations

Backend Infrastructure

- Express.js backend
- REST-style routes
- WebSocket support
- JWT authentication
- Password hashing with bcrypt
- Redis-based job processing
- BullMQ background jobs
- File upload handling
- HTTP/API integrations
- Automated tests

Technology Stack

Technology| Purpose
Node.js 20| Runtime
JavaScript / ESM| Application development
Express.js| Backend server
Supabase| Data and backend services
Redis| Queue and background processing
BullMQ| Job processing
WebSockets| Real-time communication
JWT| Authentication
bcryptjs| Password security
Axios| HTTP/API requests
Cheerio| Web/data processing
Multer| File uploads
Vapi| Voice-agent platform
Google Gemini| AI capabilities
n8n| Workflow automation

Project Structure

vapi-voice-agent/
├── ai/
│   ├── contextbuilder.js
│   ├── deal intelligence.js
│   ├── daily.report.engine.js
│   ├── memory.js
│   ├── recommendation.engine.js
│   ├── vapi.voice.intelligence.js
│   └── whatsapp.autopilot.js
│
├── backend/
│   └── routes/
│
├── server/
│   └── lib/
│
├── src/
├── routes/
├── jobs/
├── test/
│
├── n8n handler
├── google sheets integration
├── webhook integration
├── integration.service.js
├── integration.router.js
├── integration dispatcher
├── index.js
└── package.json

Architecture

The project is organized around several layers:

Voice / External Services
          │
          ▼
      API / Webhooks
          │
          ▼
     Express Backend
          │
    ┌─────┼─────┐
    ▼     ▼     ▼
   AI    CRM  Integrations
    │     │     │
    └─────┼─────┘
          ▼
     Data Services
          │
          ▼
   Background Jobs
   Redis + BullMQ

Getting Started

Requirements

- Node.js 20.x
- npm
- Supabase project
- Redis instance
- Required API credentials for the integrations you want to enable

Installation

Clone the repository:

git clone https://github.com/ibrahim0908780850-code/vapi-voice-agent.git

Enter the project directory:

cd vapi-voice-agent

Install dependencies:

npm install

Environment Variables

Create your environment configuration according to the services enabled in your deployment.

Do not commit API keys, database credentials, tokens, or other secrets to GitHub.

Typical integrations may require credentials for services such as:

Supabase
Redis
Vapi
Google Gemini
n8n
Google Sheets

Use your own project credentials when configuring these services.

Running the Project

Start the server:

npm start

The project uses Node.js 20.x.

Testing

Run the automated tests with:

npm test

The repository includes tests under the "test/" directory.

Integrations

Vapi

The project is designed around an AI voice-agent workflow using Vapi.

Vapi provides the voice-agent infrastructure for creating voice experiences that can interact with users through natural conversations and integrate with external systems.

Google Gemini

Gemini is used as part of the project's AI capabilities and intelligence workflows.

Supabase

Supabase is used as part of the project's data and backend infrastructure.

Redis & BullMQ

Redis and BullMQ are used for background job processing and asynchronous workflows.

n8n

The repository contains dedicated n8n and integration-handling components for workflow automation.

Google Sheets

The project includes a Google Sheets integration for external data workflows.

Why I Built This

I built this project to explore the practical application of AI voice technology in real-estate workflows and to understand how voice agents can connect with backend systems, databases, automation tools, and business processes.

The project evolved into a broader backend architecture containing AI modules, integrations, background processing, authentication, webhooks, and testing.

Project Status

This is an actively developed personal project and technical portfolio project.

The architecture may continue to evolve as new AI capabilities, integrations, and workflows are added.

Author

Ibrahim Ahmed

Freelance Web & AI Developer

GitHub:
https://github.com/ibrahim0908780850-code

License

This project is provided for educational and portfolio purposes. Check the repository contents for the applicable licensing information.