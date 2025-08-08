# API 653 Inspector - Tank Inspection Management System

## Overview
This is a full-stack web application designed for managing API 653 tank inspection reports. Its primary purpose is to enable inspectors to efficiently create, manage, and generate professional inspection reports for storage tanks. Key capabilities include comprehensive thickness measurements, detailed inspection checklists, settlement surveys, dyke and secondary containment inspections, and automated PDF report generation. The system aims to streamline the inspection process, ensure compliance with API 653 standards, and provide predictive analysis for maintenance planning, ultimately enhancing safety and efficiency in tank management.

## User Preferences
Preferred communication style: Simple, everyday language.
File handling: User has existing Excel-based inspection reports (XLSM format) that may need import functionality.
Excel field mappings:
- Equipment ID = Tank Number/Tank ID
- Report Write Up = Comprehensive findings (Foundation, Shell, Roof, Floor/Bottom, Nozzles, NDE Results)
- Nominal Thickness = Original Thickness
- Findings section includes: Executive Summary with repair recommendations and next inspection date
Business Rules: NO cost estimation for repair recommendations

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack React Query
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation
- **UI/UX Decisions**: Custom React components, responsive design, dark/light theme support, accessible components following ARIA guidelines.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL (configured for Neon Database)
- **Validation**: Zod schemas shared between client and server
- **Development**: tsx for TypeScript execution

### Data Storage Solutions
- **Primary Database**: PostgreSQL with schema including `inspection_reports`, `thickness_measurements`, `inspection_checklists`, `report_templates`, and `checklist_templates`.
- **Database Migrations**: Drizzle Kit
- **Connection**: Neon Database serverless PostgreSQL

### Core Features
- **Dashboard**: Overview of all inspection reports.
- **Report Creation**: Step-by-step generation with form validation.
- **Comprehensive Thickness Management**: Includes various measurement types (shell, bottom, roof, nozzles, etc.), CML data entry, and remaining life calculations.
- **Settlement Surveys**: Internal and external elevation measurements with cosine curve fitting.
- **Dyke & Secondary Containment**: Primary/secondary containment inspections with EPA compliance checking.
- **Checklist System**: Standardized and custom inspection items.
- **Excel/PDF Import**: Smart field detection and AI-powered data extraction (OpenRouter AI) for existing inspection reports, supporting various formats and field name variations.
- **PDF Generation**: Professional, multi-page report output using jsPDF, supporting OilPro Tanks branding and industry standards (e.g., TEAM Tank Consultants format), including comprehensive data loading (measurements, checklists, appurtenances, repairs, venting, attachments).
- **Template System**: Reusable report and checklist templates.
- **Calculation Engine**: Corrosion rate calculation, remaining life estimation, and status classification (acceptable, monitor, action required). Includes component-specific thickness calculations and API 653 standard calculation engine.
- **Editing and Deletion**: Comprehensive edit functionality for all report aspects and delete capability for reports and associated data.

## External Dependencies

### Frontend Dependencies
- **UI Framework**: React, React DOM, Vite
- **UI Components**: Radix UI primitives, Lucide React icons
- **Forms**: React Hook Form, Hookform Resolvers
- **Styling**: Tailwind CSS, class-variance-authority, clsx
- **Date Handling**: date-fns
- **PDF Generation**: jsPDF
- **State Management**: TanStack React Query

### Backend Dependencies
- **Server**: Express.js
- **Database**: Drizzle ORM, Neon Database serverless driver
- **Validation**: Zod
- **Development**: tsx
- **AI Integration**: OpenRouter AI (using `anthropic/claude-3.5-sonnet:beta` model) for intelligent spreadsheet/PDF analysis.

### Development Tools
- **TypeScript**: For full type safety.
- **ESLint/Prettier**: For code formatting and linting.
- **Vite Plugins**: For development experience enhancements.
- **System Dependencies for PDF Processing**: GraphicsMagick and ImageMagick.