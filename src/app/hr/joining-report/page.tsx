'use client';
import { useState, useEffect } from 'react';
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { api, CompanyProfile } from "@/lib/api";
import { DatePicker } from "@/components/ui/DatePicker";
import { generateJoiningReportPDF } from "@/utils/hrPdfGenerator";

export default function JoiningReportPage() {
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [includeStamp, setIncludeStamp] = useState(false);

    useEffect(() => {
        api.profile.get().then(res => setProfile(res));
    }, []);

    const [formData, setFormData] = useState({
        employee_name: '',
        father_name: '',
        designation: '',
        joining_date: new Date().toISOString().split('T')[0], // Today
        address: '',
        contact: '',
        cnic: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Save to DB
            const payload = {
                ...formData,
                created_at: new Date().toISOString()
            };
            await api.hrJoiningReports.add(payload);

            // 2. Generate PDF
            if (profile) {
                await generateJoiningReportPDF(formData, profile, includeStamp);
            } else {
                alert("Company profile not loaded, PDF might miss logo");
                await generateJoiningReportPDF(formData, {}, includeStamp);
            }

            alert("Joining Report Saved and PDF Downloaded!");
        } catch (error) {
            console.error("Error:", error);
            alert("Failed to save report.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Header title="HR Joining Report Form" />

            <div className="p-8 max-w-4xl mx-auto">
                <Card className="bg-white/90 backdrop-blur-sm shadow-xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div className="text-center border-b pb-6 mb-6">
                            <h2 className="text-2xl font-bold uppercase tracking-wide text-gray-800">Joining Report</h2>
                            <p className="text-gray-500 text-sm mt-1">Generate and Save Employee Joining Report</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Employee Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.employee_name}
                                    onChange={e => setFormData({ ...formData, employee_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">S/D/O (Father Name)</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.father_name}
                                    onChange={e => setFormData({ ...formData, father_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Designation</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.designation}
                                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                />
                            </div>
                            <div className="space-y-0.5">
                                <DatePicker
                                    label="Date of Joining"
                                    value={formData.joining_date}
                                    onChange={val => setFormData({ ...formData, joining_date: val })}
                                    required
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Address</label>
                                <textarea
                                    required
                                    rows={2}
                                    className="w-full px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Contact No</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.contact}
                                    onChange={e => setFormData({ ...formData, contact: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">CNIC No</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.cnic}
                                    onChange={e => setFormData({ ...formData, cnic: e.target.value })}
                                    placeholder="00000-0000000-0"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 bg-blue-50 p-4 rounded-lg">
                            <input
                                type="checkbox"
                                id="includeStamp"
                                className="w-5 h-5 cursor-pointer"
                                checked={includeStamp}
                                onChange={e => setIncludeStamp(e.target.checked)}
                            />
                            <label htmlFor="includeStamp" className="text-sm font-bold text-blue-900 cursor-pointer">
                                Include Digital CEO Stamp on Report
                            </label>
                        </div>

                        <div className="pt-6 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-8 py-3 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 transition-colors
                                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Processing...' : 'Save & Download PDF'}
                            </button>
                        </div>
                    </form>
                </Card>
            </div>
        </>
    );
}
