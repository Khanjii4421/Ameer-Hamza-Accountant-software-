'use client';
import { useState, useEffect } from 'react';
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { DatePicker } from "@/components/ui/DatePicker";
import { generateHRFileRecordPDF } from "@/utils/hrPdfGenerator";

export default function HRChecklistPage() {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        employee_name: '',
        designation: '',
        date_of_joining: '',
        department: '',
        checked_by_name: '',
        checked_by_designation: '',
        checked_by_date: new Date().toISOString().split('T')[0],
    });

    // Checklist State
    const [checklist, setChecklist] = useState<Record<string, string>>({}); // 'yes' | 'no' | ''
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        api.profile.get().then(res => setProfile(res));
    }, []);

    const [files, setFiles] = useState<Record<string, string>>({}); // mapping id -> url

    const checklistItems = [
        { id: 'job_desc', label: '1. Job Descriptions' },
        { id: 'joining_report', label: '2. Joining Report' },
        { id: 'bio_data', label: '3. Bio-data Form' },
        { id: 'appointment_letter', label: '4. Appointment letter' },
        { id: 'cv', label: '5. CV' },
        { id: 'credentials', label: '6. Credentials', isHeader: true },
        { id: 'qual', label: '6.1 Qualification', indent: true },
        { id: 'domicile', label: '6.2 Domicile', indent: true },
        { id: 'exp_letter', label: '6.3 Experience Letter (if any)', indent: true },
        { id: 'id_card', label: '7. ID Card of employee' },
        { id: 'photos', label: '8. Photographs of Employee' },
        { id: 'other', label: '9. Other Documents' },
    ];

    const handleCheck = (id: string, value: 'yes' | 'no') => {
        setChecklist(prev => ({ ...prev, [id]: value }));
    };

    const handleFileUpload = async (id: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.urls && data.urls.length > 0) {
                setFiles(prev => ({ ...prev, [id]: data.urls[0] }));
            }
        } catch (e) {
            console.error("Upload failed", e);
            alert("File upload failed");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Prepare Data
        const record = {
            ...formData,
            checklist_data: checklist,
            document_paths: files,
            created_at: new Date().toISOString()
        };

        try {
            // 1. Save to DB
            const savedRecord = await api.hrFileRecords.add(record as any);
            console.log("Record saved:", savedRecord);

            // 2. Generate PDF
            await generateHRFileRecordPDF(record, profile);

            alert("Record Saved and PDF Downloaded successfully!");

            // Optional: Reset form?
            // setFormData(...);
        } catch (error) {
            console.error("Error saving record:", error);
            alert("Failed to save record. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Header title="HR Check List of File Record" />

            <div className="p-8 max-w-5xl mx-auto">
                <Card className="bg-white/90 backdrop-blur-sm border-white/20 shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* Header Section */}
                        <div className="text-center border-b pb-6 border-gray-200">
                            <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Check List of File Record</h2>
                            <p className="text-gray-500 mt-2">New Employee Document Verification</p>
                        </div>

                        {/* Employee Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Employee Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={formData.employee_name}
                                    onChange={e => setFormData({ ...formData, employee_name: e.target.value })}
                                    placeholder="Enter full name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Designation</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={formData.designation}
                                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                    placeholder="e.g. Software Engineer"
                                />
                            </div>
                            <DatePicker
                                label="Date of Joining"
                                value={formData.date_of_joining}
                                onChange={val => setFormData({ ...formData, date_of_joining: val })}
                                required
                            />
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Department</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={formData.department}
                                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                                    placeholder="e.g. IT / Development"
                                />
                            </div>
                        </div>

                        {/* Documents Table */}
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="p-4 font-bold border-b text-sm uppercase tracking-wide">Document / Item</th>
                                        <th className="p-4 font-bold border-b text-center w-24">Yes</th>
                                        <th className="p-4 font-bold border-b text-center w-24">No</th>
                                        <th className="p-4 font-bold border-b text-right">Attachment (Soft Copy)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {checklistItems.map((item) => (
                                        <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors ${item.isHeader ? 'bg-gray-100/50' : ''}`}>
                                            <td className={`p-4 ${item.indent ? 'pl-8' : ''} ${item.isHeader ? 'font-bold text-gray-800' : 'text-gray-700'}`}>
                                                {item.label}
                                            </td>

                                            {!item.isHeader ? (
                                                <>
                                                    <td className="p-4 text-center">
                                                        <input
                                                            type="radio"
                                                            name={`check_${item.id}`}
                                                            checked={checklist[item.id] === 'yes'}
                                                            onChange={() => handleCheck(item.id, 'yes')}
                                                            className="w-5 h-5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <input
                                                            type="radio"
                                                            name={`check_${item.id}`}
                                                            checked={checklist[item.id] === 'no'}
                                                            onChange={() => handleCheck(item.id, 'no')}
                                                            className="w-5 h-5 text-red-600 focus:ring-red-500 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end items-center gap-2">
                                                            {files[item.id] ? (
                                                                <span className="text-green-600 text-sm flex items-center gap-1">
                                                                    ✓ Uploaded
                                                                </span>
                                                            ) : null}
                                                            {checklist[item.id] === 'yes' && (
                                                                <input
                                                                    type="file"
                                                                    onChange={(e) => e.target.files?.[0] && handleFileUpload(item.id, e.target.files[0])}
                                                                    className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                                />
                                                            )}
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <td colSpan={3}></td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Verification & Footer */}
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Document Checked By</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Checked By (Name)</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.checked_by_name}
                                        onChange={e => setFormData({ ...formData, checked_by_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Designation</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.checked_by_designation}
                                        onChange={e => setFormData({ ...formData, checked_by_designation: e.target.value })}
                                    />
                                </div>
                                <DatePicker
                                    label="Date"
                                    value={formData.checked_by_date}
                                    onChange={val => setFormData({ ...formData, checked_by_date: val })}
                                    required
                                />
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Signature</label>
                                    <div className="h-[42px] border-b-2 border-gray-400 flex items-end">
                                        <span className="text-gray-400 text-sm italic w-full text-center">Signed Digitally on Submit</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Actions */}
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all text-lg
                                    ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Saving & Generating PDF...' : 'Save Record & Download PDF'}
                            </button>
                        </div>

                    </form>
                </Card>
            </div>
        </>
    );
}
