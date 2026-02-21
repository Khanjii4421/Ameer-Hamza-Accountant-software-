'use client';
import { useState, useEffect } from 'react';
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { api, CompanyProfile, HRFileRecord, HRJoiningReport, HRBioData, HRIDCardApplication } from "@/lib/api";
import { generateHRFileRecordPDF, generateJoiningReportPDF, generateBioDataPDF, generateIDCardApplicationPDF, generateBikeIssuancePDF, generateLeaveApplicationPDF, generateResignationLetterPDF, generateAppreciationLetterPDF } from "@/utils/hrPdfGenerator";

export default function SavedDocumentsPage() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);

    // Data States
    const [checklistRecords, setChecklistRecords] = useState<HRFileRecord[]>([]);
    const [joiningReports, setJoiningReports] = useState<HRJoiningReport[]>([]);
    const [bioDataRecords, setBioDataRecords] = useState<HRBioData[]>([]);
    const [idCardApps, setIdCardApps] = useState<HRIDCardApplication[]>([]);
    const [bikeRecords, setBikeRecords] = useState<any[]>([]);
    const [leaveApps, setLeaveApps] = useState<any[]>([]);
    const [resignationLetters, setResignationLetters] = useState<any[]>([]);
    const [appreciationLetters, setAppreciationLetters] = useState<any[]>([]);

    const [activeTab, setActiveTab] = useState<'checklist' | 'joining' | 'bio' | 'idcard' | 'bike' | 'leave' | 'resignation' | 'appreciation'>('checklist');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [prof, checklists, joinings, bioData, idApps, bikes, leaves, resignations, appreciations] = await Promise.all([
                api.profile.get(),
                api.hrFileRecords.getAll(),
                api.hrJoiningReports.getAll(),
                api.hrBioData.getAll(),
                api.hrIDCardApplications.getAll(),
                api.hrBikeIssuance.getAll(),
                fetch('/api/hr-leave-applications').then(r => r.json()),
                fetch('/api/hr-resignation-letters').then(r => r.json()),
                fetch('/api/hr-appreciation-letters').then(r => r.json())
            ]);
            setProfile(prof);
            setChecklistRecords((checklists || []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
            setJoiningReports((joinings || []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
            setBioDataRecords((bioData || []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
            setIdCardApps((idApps || []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
            setBikeRecords((bikes || []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
            setLeaveApps((Array.isArray(leaves) ? leaves : []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
            setResignationLetters((Array.isArray(resignations) ? resignations : []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
            setAppreciationLetters((Array.isArray(appreciations) ? appreciations : []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (type: string, record: any) => {
        const p = profile || {} as any;
        try {
            if (type === 'checklist') await generateHRFileRecordPDF(record, p);
            if (type === 'joining') await generateJoiningReportPDF(record, p);
            if (type === 'bio') await generateBioDataPDF(record, p);
            if (type === 'idcard') await generateIDCardApplicationPDF(record, p);
            if (type === 'bike') await generateBikeIssuancePDF(record, p);
            if (type === 'leave') await generateLeaveApplicationPDF(record, p);
            if (type === 'resignation') await generateResignationLetterPDF(record, p);
            if (type === 'appreciation') await generateAppreciationLetterPDF(record, p);
        } catch (e) {
            console.error("PDF Gen Error", e);
            alert("Failed to generate PDF");
        }
    };

    const handleDelete = async (type: string, id: string) => {
        if (!confirm("Are you sure you want to delete this record?")) return;

        try {
            if (type === 'checklist') {
                await api.hrFileRecords.delete(id);
                setChecklistRecords(prev => prev.filter(r => r.id !== id));
            }
            if (type === 'joining') {
                await api.hrJoiningReports.delete(id);
                setJoiningReports(prev => prev.filter(r => r.id !== id));
            }
            if (type === 'bio') {
                await api.hrBioData.delete(id);
                setBioDataRecords(prev => prev.filter(r => r.id !== id));
            }
            if (type === 'idcard') {
                await api.hrIDCardApplications.delete(id);
                setIdCardApps(prev => prev.filter(r => r.id !== id));
            }
            if (type === 'bike') {
                await api.hrBikeIssuance.delete(id);
                setBikeRecords(prev => prev.filter(r => r.id !== id));
            }
            if (type === 'leave') {
                await fetch(`/api/hr-leave-applications/${id}`, { method: 'DELETE' });
                setLeaveApps(prev => prev.filter(r => r.id !== id));
            }
            if (type === 'resignation') {
                await fetch(`/api/hr-resignation-letters/${id}`, { method: 'DELETE' });
                setResignationLetters(prev => prev.filter(r => r.id !== id));
            }
            if (type === 'appreciation') {
                await fetch(`/api/hr-appreciation-letters/${id}`, { method: 'DELETE' });
                setAppreciationLetters(prev => prev.filter(r => r.id !== id));
            }
        } catch (e) {
            console.error("Delete failed", e);
            alert("Delete failed");
        }
    };

    return (
        <>
            <Header title="Saved HR Documents" />
            <div className="p-8">

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-gray-200 pb-2 overflow-x-auto">
                    <button onClick={() => setActiveTab('checklist')} className={`px-4 py-2 font-semibold rounded-lg whitespace-nowrap ${activeTab === 'checklist' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>Checklists ({checklistRecords.length})</button>
                    <button onClick={() => setActiveTab('joining')} className={`px-4 py-2 font-semibold rounded-lg whitespace-nowrap ${activeTab === 'joining' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}>Joining ({joiningReports.length})</button>
                    <button onClick={() => setActiveTab('bio')} className={`px-4 py-2 font-semibold rounded-lg whitespace-nowrap ${activeTab === 'bio' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}>Bio Data ({bioDataRecords.length})</button>
                    <button onClick={() => setActiveTab('idcard')} className={`px-4 py-2 font-semibold rounded-lg whitespace-nowrap ${activeTab === 'idcard' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>ID Cards ({idCardApps.length})</button>
                    <button onClick={() => setActiveTab('bike')} className={`px-4 py-2 font-semibold rounded-lg whitespace-nowrap ${activeTab === 'bike' ? 'bg-red-100 text-red-700' : 'text-gray-500 hover:bg-gray-100'}`}>Bike Letters ({bikeRecords.length})</button>
                    <button onClick={() => setActiveTab('leave')} className={`px-4 py-2 font-semibold rounded-lg whitespace-nowrap ${activeTab === 'leave' ? 'bg-teal-100 text-teal-700' : 'text-gray-500 hover:bg-gray-100'}`}>Leave Apps ({leaveApps.length})</button>
                    <button onClick={() => setActiveTab('resignation')} className={`px-4 py-2 font-semibold rounded-lg whitespace-nowrap ${activeTab === 'resignation' ? 'bg-rose-100 text-rose-700' : 'text-gray-500 hover:bg-gray-100'}`}>Resignations ({resignationLetters.length})</button>
                    <button onClick={() => setActiveTab('appreciation')} className={`px-4 py-2 font-semibold rounded-lg whitespace-nowrap ${activeTab === 'appreciation' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}>Appreciations ({appreciationLetters.length})</button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading Records...</div>
                ) : (
                    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-700">Date Created</th>
                                    <th className="p-4 font-semibold text-gray-700">Name / Ref</th>
                                    <th className="p-4 font-semibold text-gray-700">Designation / Details</th>
                                    <th className="p-4 font-semibold text-gray-700">Info</th>
                                    <th className="p-4 font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {/* Checklist Rows */}
                                {activeTab === 'checklist' && checklistRecords.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-sm text-gray-600">
                                            {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4 font-medium">{r.employee_name}</td>
                                        <td className="p-4 text-sm text-gray-600">{r.designation}</td>
                                        <td className="p-4 text-sm text-gray-500">{r.department}</td>
                                        <td className="p-4 flex gap-2">
                                            <button onClick={() => handleDownload('checklist', r)} className="text-blue-600 hover:underline text-sm font-medium">Download</button>
                                            <button onClick={() => handleDelete('checklist', r.id)} className="text-red-500 hover:underline text-sm ml-2">Delete</button>
                                        </td>
                                    </tr>
                                ))}

                                {/* Joining Rows */}
                                {activeTab === 'joining' && joiningReports.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-sm text-gray-600">
                                            {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4 font-medium">{r.employee_name}</td>
                                        <td className="p-4 text-sm text-gray-600">{r.designation}</td>
                                        <td className="p-4 text-sm text-gray-500">
                                            Joined: {new Date(r.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4 flex gap-2">
                                            <button onClick={() => handleDownload('joining', r)} className="text-green-600 hover:underline text-sm font-medium">Download</button>
                                            <button onClick={() => handleDelete('joining', r.id)} className="text-red-500 hover:underline text-sm ml-2">Delete</button>
                                        </td>
                                    </tr>
                                ))}

                                {/* Bio Data Rows */}
                                {activeTab === 'bio' && bioDataRecords.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-sm text-gray-600">
                                            {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4 font-medium">{r.full_name}</td>
                                        <td className="p-4 text-sm text-gray-600">{r.nic_number || '-'}</td>
                                        <td className="p-4 text-sm text-gray-500">{r.mobile}</td>
                                        <td className="p-4 flex gap-2">
                                            <button onClick={() => handleDownload('bio', r)} className="text-purple-600 hover:underline text-sm font-medium">Download</button>
                                            <button onClick={() => handleDelete('bio', r.id)} className="text-red-500 hover:underline text-sm ml-2">Delete</button>
                                        </td>
                                    </tr>
                                ))}

                                {/* ID Card Rows */}
                                {activeTab === 'idcard' && idCardApps.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-sm text-gray-600">
                                            {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4 font-medium">{r.name}</td>
                                        <td className="p-4 text-sm text-gray-600">{r.employee_code}</td>
                                        <td className="p-4 text-sm text-gray-500">{r.contact_no}</td>
                                        <td className="p-4 flex gap-2">
                                            <button onClick={() => handleDownload('idcard', r)} className="text-indigo-600 hover:underline text-sm font-medium">Download</button>
                                            <button onClick={() => handleDelete('idcard', r.id)} className="text-red-500 hover:underline text-sm ml-2">Delete</button>
                                        </td>
                                    </tr>
                                ))}

                                {/* Bike Issuance Rows */}
                                {activeTab === 'bike' && bikeRecords.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-sm text-gray-600">
                                            {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4 font-medium">{r.employee_name}</td>
                                        <td className="p-4 text-sm text-gray-600">{r.bike_number}</td>
                                        <td className="p-4 text-sm text-gray-500">Ref: {r.ref_no}</td>
                                        <td className="p-4 flex gap-2">
                                            <button onClick={() => handleDownload('bike', r)} className="text-red-600 hover:underline text-sm font-medium">Download</button>
                                            <button onClick={() => handleDelete('bike', r.id)} className="text-red-500 hover:underline text-sm ml-2">Delete</button>
                                        </td>
                                    </tr>
                                ))}

                                {/* Leave Application Rows */}
                                {activeTab === 'leave' && leaveApps.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-sm text-gray-600">
                                            {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4 font-medium">{r.employee_name}</td>
                                        <td className="p-4 text-sm text-gray-600">{r.leave_type}</td>
                                        <td className="p-4 text-sm text-gray-500">{r.total_days} day(s)</td>
                                        <td className="p-4 flex gap-2">
                                            <button onClick={() => handleDownload('leave', r)} className="text-teal-600 hover:underline text-sm font-medium">Download</button>
                                            <button onClick={() => handleDelete('leave', r.id)} className="text-red-500 hover:underline text-sm ml-2">Delete</button>
                                        </td>
                                    </tr>
                                ))}

                                {/* Resignation Letter Rows */}
                                {activeTab === 'resignation' && resignationLetters.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-sm text-gray-600">
                                            {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4 font-medium">{r.employee_name}</td>
                                        <td className="p-4 text-sm text-gray-600">{r.designation}</td>
                                        <td className="p-4 text-sm text-gray-500">
                                            Last Day: {new Date(r.last_working_day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4 flex gap-2">
                                            <button onClick={() => handleDownload('resignation', r)} className="text-rose-600 hover:underline text-sm font-medium">Download</button>
                                            <button onClick={() => handleDelete('resignation', r.id)} className="text-red-500 hover:underline text-sm ml-2">Delete</button>
                                        </td>
                                    </tr>
                                ))}

                                {/* Appreciation Letter Rows */}
                                {activeTab === 'appreciation' && appreciationLetters.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-sm text-gray-600">
                                            {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4 font-medium">{r.employee_name}</td>
                                        <td className="p-4 text-sm text-gray-600">{r.designation}</td>
                                        <td className="p-4 text-sm text-gray-500">
                                            Letter Date: {new Date(r.letter_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4 flex gap-2">
                                            <button onClick={() => handleDownload('appreciation', r)} className="text-emerald-600 hover:underline text-sm font-medium">Download</button>
                                            <button onClick={() => handleDelete('appreciation', r.id)} className="text-red-500 hover:underline text-sm ml-2">Delete</button>
                                        </td>
                                    </tr>
                                ))}

                                {((activeTab === 'checklist' && checklistRecords.length === 0) ||
                                    (activeTab === 'joining' && joiningReports.length === 0) ||
                                    (activeTab === 'bio' && bioDataRecords.length === 0) ||
                                    (activeTab === 'idcard' && idCardApps.length === 0) ||
                                    (activeTab === 'bike' && bikeRecords.length === 0) ||
                                    (activeTab === 'leave' && leaveApps.length === 0) ||
                                    (activeTab === 'resignation' && resignationLetters.length === 0) ||
                                    (activeTab === 'appreciation' && appreciationLetters.length === 0)) && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-gray-400">No records found.</td>
                                        </tr>
                                    )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
