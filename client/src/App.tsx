import { useState, useEffect } from "react"
import { MealPlanner } from "@/components/meal-planner"
import { AuthPage } from "@/components/auth-page"
import { ProfilePage } from "@/components/profile-page"
import { Button } from "@/components/ui/button"
import { Calendar, User } from "lucide-react"
import { Toaster } from "@/components/ui/toaster"
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'planner' | 'profile'>('planner')

  useEffect(() => {
    
    const token = localStorage.getItem('token')
    if (token) {
      console.log('Found token on load:', token.substring(0, 10) + '...')
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  const handleAuthSuccess = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    window.location.reload()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {isAuthenticated ? (
        <div className="pb-24"> {/* Increased padding for navigation */}
          <div className="container mx-auto max-w-md px-4 py-6">
            {activeTab === 'planner' ? (
              <MealPlanner />
            ) : (
              <ProfilePage onLogout={handleLogout} />
            )}
          </div>

          {/* Mobile Navigation Bar */}
          <div className="fixed bottom-0 left-0 right-0 z-50">
            <nav className="bg-white/90 backdrop-blur-lg shadow-lg">
              <div className="container mx-auto max-w-md">
                <div className="grid grid-cols-2">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      className={`
                        w-full rounded-none flex flex-col items-center justify-center py-2.5 px-2 h-auto
                        ${activeTab === 'planner' ? 'text-purple-600' : 'text-gray-600 hover:text-purple-600'}
                      `}
                      onClick={() => setActiveTab('planner')}
                    >
                      <Calendar className="h-6 w-6 mb-0.5" />
                      <span className="text-sm font-medium leading-none">Meal Planner</span>
                    </Button>
                    <div
                      className={`
                        absolute bottom-0 left-0 right-0 h-[2px] bg-purple-600
                        transition-transform duration-200 ease-out
                        ${activeTab === 'planner' ? 'scale-x-100' : 'scale-x-0'}
                      `}
                    />
                  </div>

                  <div className="relative">
                    <Button
                      variant="ghost"
                      className={`
                        w-full rounded-none flex flex-col items-center justify-center py-2.5 px-2 h-auto
                        ${activeTab === 'profile' ? 'text-purple-600' : 'text-gray-600 hover:text-purple-600'}
                      `}
                      onClick={() => setActiveTab('profile')}
                    >
                      <User className="h-6 w-6 mb-0.5" />
                      <span className="text-sm font-medium leading-none">Profile</span>
                    </Button>
                    <div
                      className={`
                        absolute bottom-0 left-0 right-0 h-[2px] bg-purple-600
                        transition-transform duration-200 ease-out
                        ${activeTab === 'profile' ? 'scale-x-100' : 'scale-x-0'}
                      `}
                    />
                  </div>
                </div>
              </div>
            </nav>
          </div>
        </div>
      ) : (
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      )}
      <Toaster />
    </div>
  )
}

export default App
