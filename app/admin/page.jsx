import CSVUploader from "@/components/admin/CSVUploader"

export default function UploadPage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Admin: Upload Student Data</h2>
      <CSVUploader />
    </div>
  )
}
