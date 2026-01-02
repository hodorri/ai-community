'use client'

import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'
import ApprovalBanner from '@/components/ApprovalBanner'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 bg-gray-50 min-h-screen">
          <ApprovalBanner />
          {children}
        </main>
      </div>
    </>
  )
}
