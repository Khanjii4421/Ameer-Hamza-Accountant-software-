'use client';
import { Card } from "@/components/ui/Card";
import Link from 'next/link';

export default function HRPage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">HR Management</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link href="/hr/file-record">
                    <Card className="hover:border-blue-500 cursor-pointer h-full border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                            <div className="p-4 bg-blue-50 rounded-full text-4xl">
                                📋
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">File Record Checklist</h3>
                            <p className="text-gray-500">Create new employee file record, checklists, and generate PDF.</p>
                        </div>
                    </Card>
                </Link>

                <Link href="/hr/joining-report">
                    <Card className="hover:border-green-500 cursor-pointer h-full border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                            <div className="p-4 bg-green-50 rounded-full text-4xl">
                                🤝
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Joining Report</h3>
                            <p className="text-gray-500">Generate and print employee joining report form with approval section.</p>
                        </div>
                    </Card>
                </Link>

                <Link href="/hr/bio-data">
                    <Card className="hover:border-purple-500 cursor-pointer h-full border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                            <div className="p-4 bg-purple-50 rounded-full text-4xl">
                                📝
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Bio Data Form</h3>
                            <p className="text-gray-500">Detailed employee bio-data form with education and service records.</p>
                        </div>
                    </Card>
                </Link>

                <Link href="/hr/id-card-application">
                    <Card className="hover:border-indigo-500 cursor-pointer h-full border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                            <div className="p-4 bg-indigo-50 rounded-full text-4xl">
                                🪪
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">ID Card App.</h3>
                            <p className="text-gray-500">Generate Application for Service Identity Card.</p>
                        </div>
                    </Card>
                </Link>

                <Link href="/hr/bike-issuance">
                    <Card className="hover:border-red-500 cursor-pointer h-full border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                            <div className="p-4 bg-red-50 rounded-full text-4xl">
                                🏍️
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Bike Issuance Letter</h3>
                            <p className="text-gray-500">Generate Official Bike Handover Letter.</p>
                        </div>
                    </Card>
                </Link>

                <Link href="/hr/leave-application">
                    <Card className="hover:border-teal-500 cursor-pointer h-full border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                            <div className="p-4 bg-teal-50 rounded-full text-4xl">
                                📝
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Leave Application</h3>
                            <p className="text-gray-500">Generate professional leave application on letterhead.</p>
                        </div>
                    </Card>
                </Link>

                <Link href="/hr/resignation-letter">
                    <Card className="hover:border-rose-500 cursor-pointer h-full border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                            <div className="p-4 bg-rose-50 rounded-full text-4xl">
                                📋
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Resignation Letter</h3>
                            <p className="text-gray-500">Generate professional resignation letter on letterhead.</p>
                        </div>
                    </Card>
                </Link>

                <Link href="/hr/appreciation-letter">
                    <Card className="hover:border-emerald-500 cursor-pointer h-full border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                            <div className="p-4 bg-emerald-50 rounded-full text-4xl">
                                ⭐
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Appreciation Letter</h3>
                            <p className="text-gray-500">Generate appreciation letter for excellent work.</p>
                        </div>
                    </Card>
                </Link>

                <Link href="/hr/payroll">
                    <Card className="hover:border-emerald-500 cursor-pointer h-full border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                            <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-full text-4xl">
                                💰
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Payroll Management</h3>
                            <p className="text-gray-500">Manage employee salaries, advances, increments, and generate salary slips.</p>
                        </div>
                    </Card>
                </Link>

                <Link href="/hr/documents">
                    <Card className="hover:border-orange-500 cursor-pointer h-full border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                            <div className="p-4 bg-orange-50 rounded-full text-4xl">
                                📂
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Saved Documents</h3>
                            <p className="text-gray-500">View, reprint, or delete saved HR documents and forms.</p>
                        </div>
                    </Card>
                </Link>

            </div>
        </div>
    );
}
