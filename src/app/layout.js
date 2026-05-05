import './globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata = {
  title: 'UA CRM — AG026029',
  description: 'Union Assurance Advisor CRM',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Sidebar />
        <div className="main-content">
          {children}
        </div>
      </body>
    </html>
  )
}