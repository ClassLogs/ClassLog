"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect } from "react"


const CSVUploader = () => {
  const [file, setFile] = useState<File | null>(null)
  const [userType, setUserType] = useState<"student" | "teacher" | "">("")
  const { toast } = useToast()


  const [API_BASE_URL, setApiBaseUrl] = useState("")
  

  useEffect(() => {
    const url =
      window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://classlog-e5h3.onrender.com" ; 
    setApiBaseUrl(url)
  }, [])


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file || !userType) {
      toast({ title: "Select file and user type", variant: "destructive" })
      return
    }

    const formData = new FormData()
    formData.append("csv", file)
    formData.append("type", userType)

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/upload-csv`, {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (data.success) {
        toast({ title: "Upload Successful", description: data.message })
      } else {
        toast({ title: "Upload Failed", description: data.message, variant: "destructive" })
      }
    } catch (err) {
      toast({
        title: "Upload Error",
        description: "Something went wrong while uploading.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-6 border rounded-md bg-white dark:bg-gray-900 shadow max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Upload CSV</h2>

      <Label className="mb-2 block">Select User Type</Label>
      <Select onValueChange={(value) => setUserType(value as "student" | "teacher")}>
        <SelectTrigger className="mb-4">
          <SelectValue placeholder="Select user type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="student">Student</SelectItem>
          <SelectItem value="teacher">Teacher</SelectItem>
        </SelectContent>
      </Select>

      <Input type="file" accept=".csv" onChange={handleFileChange} className="mb-4" />
      <Button onClick={handleUpload}>
        Upload {userType ? userType.charAt(0).toUpperCase() + userType.slice(1) : ""} CSV
      </Button>
    </div>
  )
}

export default CSVUploader