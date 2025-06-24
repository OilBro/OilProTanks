# API 653 Inspector - Tank Inspection Management System

## Overview

This is a full-stack web application built for managing API 653 tank inspection reports. The system enables inspectors to create, manage, and generate professional inspection reports for storage tanks, with features for thickness measurements, inspection checklists, and PDF report generation.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon Database)
- **Validation**: Zod schemas shared between client and server
- **Development**: tsx for TypeScript execution in development

### Data Storage Solutions
- **Primary Database**: PostgreSQL with the following schema:
  - `inspection_reports`: Main report records with metadata
  - `thickness_measurements`: Corrosion and thickness data points
  - `inspection_checklists`: Standardized inspection items
  - `report_templates`: Reusable report configurations
- **Database Migrations**: Drizzle Kit for schema management
- **Connection**: Neon Database serverless PostgreSQL

## Key Components

### Core Features
1. **Dashboard**: Overview of all inspection reports with status tracking
2. **Report Creation**: Step-by-step report generation with form validation
3. **Comprehensive Thickness Management**: 
   - Shell course measurements
   - Bottom plate readings with grid references
   - Internal annular ring measurements
   - Critical zone assessments
   - External repad inspections
   - Roof thickness readings (center, edge, nozzle areas)
   - Chime area measurements
   - Nozzle and flange inspections
4. **Settlement Surveys**: Internal and external elevation measurements
5. **Dyke & Secondary Containment**: Primary/secondary containment inspections
6. **Checklist System**: Standardized inspection items for external/internal components
7. **Excel Import**: Smart field detection for existing inspection reports
8. **PDF Generation**: Professional report output using jsPDF
9. **Template System**: Reusable report templates for different tank services

### Calculation Engine
- **Corrosion Rate Calculation**: Based on original vs current thickness over time
- **Remaining Life Estimation**: Predictive analysis for maintenance planning
- **Status Classification**: Automatic categorization (acceptable, monitor, action required)

### UI Components
- Custom React components built on shadcn/ui foundation
- Responsive design with mobile support
- Dark/light theme support through CSS custom properties
- Accessible components following ARIA guidelines

## Data Flow

1. **Report Creation**: User fills out basic tank information and inspection details
2. **Thickness Measurements**: Inspector adds measurement data with automatic calculations
3. **Inspection Checklist**: Standardized items are checked off during inspection
4. **Report Generation**: All data is compiled into a professional PDF report
5. **Data Persistence**: All information is stored in PostgreSQL for future reference

## External Dependencies

### Frontend Dependencies
- **UI Framework**: React, React DOM, Vite
- **UI Components**: Radix UI primitives, Lucide React icons
- **Forms**: React Hook Form, Hookform Resolvers
- **Styling**: Tailwind CSS, class-variance-authority, clsx
- **Date Handling**: date-fns for date formatting
- **PDF Generation**: jsPDF for client-side PDF creation
- **State Management**: TanStack React Query

### Backend Dependencies
- **Server**: Express.js for HTTP server
- **Database**: Drizzle ORM, Neon Database serverless driver
- **Validation**: Zod for runtime type checking
- **Development**: tsx for TypeScript execution

### Development Tools
- **TypeScript**: Full type safety across the stack
- **ESLint/Prettier**: Code formatting and linting
- **Vite Plugins**: Development experience enhancements
- **Replit Integration**: Cartographer plugin for Replit environment

## Deployment Strategy

### Development Environment
- **Local Development**: `npm run dev` runs both client and server
- **Hot Reload**: Vite HMR for frontend, tsx watch mode for backend
- **Port Configuration**: Server on port 5000, proxied through Vite

### Production Build
- **Frontend Build**: Vite builds optimized static assets
- **Backend Build**: esbuild bundles server code for Node.js
- **Output**: Compiled assets in `dist/` directory
- **Deployment Target**: Replit Autoscale with PostgreSQL module

### Database Management
- **Schema Migrations**: `npm run db:push` applies schema changes
- **Environment Variables**: `DATABASE_URL` for database connection
- **Connection Pooling**: Neon Database handles connection management

## Changelog

```
Changelog:
- June 23, 2025. Initial setup
- June 23, 2025. Added PostgreSQL database with persistent storage
- June 23, 2025. Fixed report generation errors and PDF export functionality
- June 23, 2025. Application deployed and ready for production use
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
File handling: User has existing Excel-based inspection reports (XLSM format) that may need import functionality.
```

## Recent Changes

```
✓ Database successfully integrated with PostgreSQL
✓ Report generation errors fixed (PDF export working) 
✓ Template system working with 3 pre-configured tank types
✓ Excel import functionality added with comprehensive data extraction
✓ Enhanced import system recognizes API 653 inspection report formats
✓ Automatic extraction of tank data, thickness measurements, and checklist items
✓ Form navigation issue fixed (Enter key no longer jumps to "years in service")
✓ COMPREHENSIVE API 653 AUDIT RESPONSE IMPLEMENTED:
  - Added detailed appurtenance inspection tracking (nozzles, manways, vents, etc.)
  - Implemented repair recommendations with priority tracking and API 653 references
  - Added venting system inspection for safety-critical components
  - Created supporting document/photo attachment system
  - Enhanced PDF generator with professional multi-page reports
  - Added corrosion rate calculations and remaining life assessments
  - Integrated comprehensive inspection workflow addressing all audit findings
✓ PROFESSIONAL API 653 REPORT BUILDER FEATURES ADDED:
  - CML (Corrosion Monitoring Location) data entry with auto-numbering
  - Component and Nozzle CML records with import/export capabilities
  - Shell course remaining life calculations per API 653 requirements
  - Settlement survey analysis with cosine curve fitting and R² validation
  - Advanced calculation appendix with tabbed interface
  - Material specifications from API 650 standards
  - Joint efficiency calculations and stress analysis
  - Professional multi-page PDF reports with certification pages
✓ Application now matches commercial API 653 inspection software capabilities
```