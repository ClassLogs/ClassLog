import type { ClassData, SessionData } from "@/app/teacher/dashboard/page" // Corrected import path

export function exportToExcel(sessions: SessionData[], selectedClass: ClassData | null) {
  if (!selectedClass) {
    console.error("No class selected for export.")
    return
  }

  const csvContent = [
    ["Session ID", "Date", "Subject", "Session Name", "Average Attendance (%)"],
    ...sessions.map((session) => {
      // Ensure date is in YYYY-MM-DD format for better Excel compatibility
      const sessionDate = new Date(session.date).toISOString().slice(0, 10)
      return [
        session.id,
        sessionDate,
        session.subject,
        session.name, // Session name should now be cleaner from backend/frontend
        session.percentage.toFixed(1), // Ensure percentage is formatted
      ]
    }),
  ]
    .map((row) => row.join(","))
    .join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `${selectedClass.subject}_${selectedClass.name}_attendance_sessions.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  console.log("Export Successful: Attendance session data has been exported to CSV file.")
}
