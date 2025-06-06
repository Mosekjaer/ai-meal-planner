import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LogOut, Globe } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { logout, getProfile, updateProfile } from "@/lib/api"

const languages = [
  { code: "en", name: "English" },
  { code: "dk", name: "Dansk" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" }
]

interface ProfilePageProps {
  onLogout: () => void
}

export function ProfilePage({ onLogout }: ProfilePageProps) {
  const [selectedLanguage, setSelectedLanguage] = useState("en")
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getProfile()
        setSelectedLanguage(response.data.language || "en")
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to fetch profile:', error)
        toast({
          title: "Error",
          description: "Failed to load profile settings.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [toast])

  const handleLanguageChange = async (value: string) => {
    try {
      await updateProfile({ language: value })
      setSelectedLanguage(value)
      toast({
        title: "Language Updated",
        description: "Your language preference has been saved.",
      })
    } catch (error) {
      console.error('Failed to update language:', error)
      toast({
        title: "Error",
        description: "Failed to update language. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      onLogout()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-sm text-gray-500">Manage your account preferences</p>
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y divide-gray-100">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="language" className="text-base">Language</Label>
                <p className="text-sm text-gray-500">Select your preferred language</p>
              </div>
              <Globe className="h-5 w-5 text-gray-400" />
            </div>
            <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger id="language" className="w-full">
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-6 bg-gray-50">
            <Button
              variant="destructive"
              className="w-full flex items-center justify-center gap-2 hover:bg-red-600 transition-colors"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
} 