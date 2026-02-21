export default function EmployeeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center">
            {children}
        </div>
    );
}
