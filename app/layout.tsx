import type { Metadata } from "next";
import "./globals.css";
import { PayrollProvider } from "./lib/PayrollContext";
import NewRunModal from "./components/NewRunModal";
import AddEmployeeModal from "./components/AddEmployeeModal";

export const metadata: Metadata = {
  title: "Payroll Admin - Gov Division | Payroll Insight Pro",
  description: "Professional payroll management system for government and institutional use. Track payroll periods, manage employees, import Excel data, and generate detailed reports.",
  keywords: "payroll, HR, government, employee management, payroll processing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Google Fonts: Hanken Grotesk, Inter, JetBrains Mono */}
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Material Symbols Outlined Icon Font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="bg-[#f7fafc] text-[#181c1e] font-sans antialiased selection:bg-[#38b2ac] selection:text-white">
        <PayrollProvider>
          {children}
          <NewRunModal />
          <AddEmployeeModal />
        </PayrollProvider>
      </body>
    </html>
  );
}
