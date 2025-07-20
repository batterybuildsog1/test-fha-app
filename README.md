# FHA Loan Calculator

A comprehensive mortgage calculator application with advanced DTI (Debt-to-Income) analysis features, built with React, TypeScript, and Convex.

## Features

### 🏠 Mortgage Calculator
- FHA and Conventional loan calculations
- Real-time payment breakdowns (Principal, Interest, Taxes, Insurance, PMI)
- Property tax and insurance estimations by location
- Support for different loan terms and down payment scenarios

### 📊 DTI Analysis System
- **DTI Wizard**: Step-by-step guided interface for financial data collection
- **Income Assessment**: Annual income input with employment type tracking
- **Debt Management**: Detailed debt categorization (car loans, student loans, credit cards, etc.)
- **Compensating Factors**: Evaluation of factors that can qualify for higher DTI ratios
- **Credit Score Integration**: Credit-based loan qualification analysis

### 💾 Data Persistence
- **Borrower Profiles**: Save and manage multiple borrower profiles
- **Calculation History**: Full audit trail of all DTI calculations
- **Session Management**: Resume incomplete DTI wizard sessions
- **Scenario Comparison**: Save and compare multiple loan scenarios

### 🎨 Modern UI/UX
- Clean, responsive design with Tailwind CSS
- Component library using shadcn/ui
- Real-time validation and feedback
- Mobile-optimized interface
- Accessibility-compliant components

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Convex (serverless database and functions)
- **Styling**: Tailwind CSS, shadcn/ui components
- **State Management**: React Context API
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Convex account (free tier available)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/batterybuildsog1/test-fha-app.git
cd test-fha-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up Convex:
```bash
npx convex dev
```
This will prompt you to log in to Convex and set up your project.

4. Copy the `.env.example` to `.env` and add your API keys:
```bash
cp .env.example .env
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── dti/           # DTI calculator components
│   │   ├── ui/            # Reusable UI components
│   │   └── calculator/    # Mortgage calculator components
│   ├── context/          # React Context providers
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and validations
│   └── utils/            # Helper functions
├── convex/
│   ├── schema.ts         # Database schema
│   ├── functions.ts      # Serverless functions
│   └── domain/           # Business logic
└── public/               # Static assets
```

## Database Schema

### Core Tables:
- **borrowerProfiles**: Stores borrower financial information
- **dtiCalculations**: Audit trail of all DTI calculations
- **scenarios**: Saved mortgage scenarios
- **dtiWizardSessions**: Multi-step form session persistence

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Convex](https://www.convex.dev/) for real-time backend
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)