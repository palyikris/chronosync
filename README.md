# ChronoSync

ChronoSync is a modern, role-aware workforce and company operations platform designed to help organizations manage time tracking, team administration, client and project structures, and business reporting from a single, polished interface. Built with React, TypeScript, and Supabase, the application combines operational clarity with a user experience that is both practical and scalable.

At its core, ChronoSync is intended to support the everyday rhythm of a company: employees record their time, managers monitor progress, administrators configure systems, and super administrators oversee the broader organizational layer. The product is not merely a timesheet tool; it is a carefully structured operational workspace that brings essential business workflows into one coherent system.

## Overview

ChronoSync provides a secure and multilingual web application for:

- time entry and monthly timesheet review
- dashboard-based performance and workload insights
- company-level client and project configuration
- user onboarding, role assignment, and account administration
- company lifecycle management for super administrators
- personal account settings and language preferences

The application is organized around user roles, ensuring each persona sees the tools and information relevant to their responsibilities.

## Core Features

### 1. Role-Based Access

The platform supports multiple user roles, including:

- regular users, who manage their own timesheets
- company administrators, who oversee company users, settings, and reporting
- super administrators, who manage companies at a higher level

Role-aware navigation and access control help ensure that sensitive operations remain appropriately scoped.

### 2. Timesheet Management

Users can:

- create, edit, and delete timesheet entries
- select a day or month view for their work log
- assign entries to clients and projects
- review daily and monthly totals in a structured calendar-based interface

This provides a practical foundation for team accountability and payroll preparation.

### 3. Analytics and Dashboard Reporting

The dashboard experience gives administrators visibility into:

- summary KPIs
- daily trend data
- breakdowns by user
- breakdowns by client and project

These views help teams understand productivity patterns and operational health without relying on separate reporting tools.

### 4. Company and Project Configuration

Company administrators can manage:

- clients
- projects
- company branding assets such as a logo

This makes the platform suitable not only for time tracking, but also for maintaining the internal structure of a business.

### 5. User Administration

Company administrators can:

- invite users
- assign roles
- activate or deactivate accounts
- reset passwords
- remove users when needed

The interface is designed to make day-to-day administration straightforward and controlled.

### 6. Internationalization

ChronoSync supports multilingual usage through a built-in i18n layer, with English and Hungarian translations available.

## Technology Stack

ChronoSync is built with a modern frontend stack:

- React 19 with TypeScript
- Vite for fast development and build tooling
- React Router for navigation
- TanStack Query for server state and caching
- Tailwind CSS for styling
- Supabase for authentication and data storage
- Zod for schema validation
- Recharts for dashboard visualizations
- i18next for localization

## Project Structure

The application is organized into clear domain-based areas:

- src/pages: top-level application screens and route-level views
- src/components: reusable UI components grouped by feature domain
- src/services: API and data access logic for Supabase-backed operations
- src/context: application state such as authentication context
- src/types: shared TypeScript definitions
- src/lib: core integrations such as Supabase and i18n configuration
- src/locales: translation resources
- src/utils: shared helpers and navigation utilities

## Getting Started

### Prerequisites

Make sure the following are available on your machine:

- Node.js 18 or newer
- npm

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd chronosync
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables.

Create a `.env` file in the project root with the following values:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
```

These values are required because the application initializes Supabase directly from the browser environment.

### Development Server

Start the development server:

```bash
npm run dev
```

Then open the local Vite URL in your browser.

### Production Build

To build the application for production:

```bash
npm run build
```

### Linting

Run the linter with:

```bash
npm run lint
```

## Available Scripts

- npm run dev — starts the Vite development server
- npm run build — compiles TypeScript and creates a production build
- npm run preview — previews the production build locally
- npm run lint — runs ESLint against the project

## Application Flow

A typical user journey in ChronoSync looks like this:

1. A user signs in through the authentication flow.
2. The app identifies the user role and redirects them to the appropriate home route.
3. Regular users manage their timesheets and review their work history.
4. Company administrators maintain the company structure, users, and settings.
5. Super administrators oversee broader company-level operations.

## Design Philosophy

ChronoSync is designed around clarity, accountability, and operational cohesion. Rather than treating time tracking as an isolated function, the application positions it within a broader ecosystem of management, administration, and reporting. That approach makes the platform useful not only for recording hours, but also for supporting stronger organizational decision-making.

## Notes for Contributors

When contributing to the project:

- keep changes aligned with the existing domain-based component structure
- preserve role-based access expectations
- maintain the current TypeScript typing discipline
- respect the localization workflow when adding user-facing text
- test UI changes thoughtfully in the context of the relevant feature page

## Status

The current workspace builds successfully with Vite and TypeScript. The application is ready for further feature development and refinement.

