export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-md relative z-10">
        {children}
      </div>
    </div>
  )
}
