
# FinanceFlow - AI-Powered Personal Finance Manager

A modern, full-stack web application designed to provide users with a clear and intelligent way to manage their personal finances. FinanceFlow leverages AI to go beyond simple tracking, offering predictive insights and interactive scenario planning.

**Live Demo**: [Your Vercel Deployment URL Here]

---

### Key Features:

*   **Interactive Dashboard**: At-a-glance overview of total income, expenses, net savings, and budget progress. Includes a responsive bar chart visualizing spending by category.
*   **Comprehensive Transaction Management**:
    *   Log income, expenses, and dedicated "Subscription" type transactions.
    *   Sort, filter (by date range and type), and search through all financial activities.
    *   Secure CRUD (Create, Read, Update, Delete) operations for all transactions.
*   **Dynamic & Intelligent Budgeting**:
    *   Create budgets for specific spending categories.
    *   Set **Recurring Monthly/Yearly** budgets that visually track spending for the current period.
    *   Set budgets for specific periods (e.g., "July 2024 Vacation Fund") or ongoing goals.
*   **AI-Powered Insights Suite**:
    *   **Spending Analysis**: Provides an overall summary, areas for improvement, positive habits, and actionable tips based on user data.
    *   **Future Expense Prediction**: Forecasts future spending based on historical data analysis.
    *   **Financial Scenario Simulator**: A unique feature allowing users to ask "what-if" questions (e.g., "What if I save an extra ₹5000 per month?") and receive an AI-generated projection of the potential impact.
    *   **Subscription & Recurring Expense Auditor**: AI scans transactions to identify potential recurring payments and subscriptions, helping users find and manage "subscription creep".
*   **Secure User Authentication**:
    *   Robust sign-up and login system using email/password.
    *   Seamless integration with Google Sign-In for one-click access.
    *   Secure profile and password management.
*   **Guest Mode**: Fully functional demo mode that utilizes browser local storage for data persistence, allowing users to test all features without creating an account.
*   **Modern, Responsive UI**:
    *   Built with ShadCN UI and Tailwind CSS for a clean, modern aesthetic.
    *   Fully responsive design that works flawlessly on desktop and mobile devices.
    *   Includes user-toggleable Light and Dark themes.

---

### Tech Stack:

*   **Framework**: Next.js (with App Router)
*   **Language**: TypeScript
*   **Frontend**: React
*   **Styling**: Tailwind CSS
*   **UI Components**: ShadCN UI
*   **AI Integration**: Google AI with Genkit
*   **Authentication & Database**: Firebase (Authentication, Firestore)
*   **Deployment**: Vercel
