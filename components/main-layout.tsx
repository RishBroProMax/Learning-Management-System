import type { ReactNode } from "react"
import Header from "./header"

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="border-t py-4 text-center text-sm">
        <div className="container mx-auto px-4">
          <p>© {new Date().getFullYear()} MRCM ICT Society. All rights reserved.</p>
          <div className="mt-2 text-xs">
            This application uses local storage to enhance your experience.{" "}
            <a href="#" className="underline">
              Learn more
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

