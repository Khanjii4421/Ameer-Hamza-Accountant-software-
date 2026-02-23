'use client';
import { useState, useEffect } from 'react';
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { api, CompanyProfile } from "@/lib/api";
import { generateAgreementPDF } from "@/utils/hrPdfGenerator";

export default function AgreementsPage() {
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [agreements, setAgreements] = useState<any[]>([]);
    const [includeStamp, setIncludeStamp] = useState(false);

    useEffect(() => {
        api.profile.get().then(res => setProfile(res));
        loadAgreements();
    }, []);

    const loadAgreements = async () => {
        try {
            const data = await api.hrAgreements.getAll();
            setAgreements(data);
        } catch (error) {
            console.error("Failed to load agreements", error);
        }
    };

    const [formData, setFormData] = useState({
        title: '',
        party_one_name: '',
        party_one_details: '',
        scope_of_work: [''],
        rates_of_work: [''],
        payment_schedule: [''],
    });

    const addLine = (field: 'scope_of_work' | 'rates_of_work' | 'payment_schedule') => {
        setFormData({ ...formData, [field]: [...formData[field], ''] });
    };

    const updateLine = (field: 'scope_of_work' | 'rates_of_work' | 'payment_schedule', index: number, value: string) => {
        const newArr = [...formData[field]];
        newArr[index] = value;
        setFormData({ ...formData, [field]: newArr });
    };

    const removeLine = (field: 'scope_of_work' | 'rates_of_work' | 'payment_schedule', index: number) => {
        const newArr = formData[field].filter((_, i) => i !== index);
        setFormData({ ...formData, [field]: newArr });
    };

    const handleSaveAndDownload = async (language: 'en' | 'ur') => {
        if (!formData.title || !formData.party_one_name) {
            alert("Please fill all required fields (Title, Client 1 Name)");
            return;
        }

        setLoading(true);
        try {
            // Remove empty lines
            const cleanedData = {
                ...formData,
                scope_of_work: formData.scope_of_work.filter(s => s.trim() !== ''),
                rates_of_work: formData.rates_of_work.filter(s => s.trim() !== ''),
                payment_schedule: formData.payment_schedule.filter(s => s.trim() !== '')
            };

            // Save to DB
            await api.hrAgreements.add(cleanedData);
            await loadAgreements();

            // Generate PDF
            if (profile) {
                await generateAgreementPDF(cleanedData, profile, language, includeStamp);
            } else {
                alert("Company profile not loaded. PDF might miss letterhead.");
                await generateAgreementPDF(cleanedData, {}, language, includeStamp);
            }

            // reset form
            setFormData({
                title: '',
                party_one_name: '',
                party_one_details: '',
                scope_of_work: [''],
                rates_of_work: [''],
                payment_schedule: [''],
            });

            alert("Agreement Saved and PDF Downloaded!");
        } catch (error) {
            console.error("Error:", error);
            alert("Failed to save agreement.");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadExisting = async (agreement: any, language: 'en' | 'ur') => {
        if (profile) {
            await generateAgreementPDF(agreement, profile, language, includeStamp);
        } else {
            await generateAgreementPDF(agreement, {}, language, includeStamp);
        }
    };

    const deleteAgreement = async (id: string) => {
        if (!confirm("Are you sure you want to delete this agreement?")) return;
        try {
            await api.hrAgreements.delete(id);
            await loadAgreements();
        } catch (error) {
            console.error("Failed to delete", error);
            alert("Failed to delete agreement");
        }
    };

    return (
        <>
            <Header title="Company Agreements" />

            <div className="p-8 max-w-5xl mx-auto space-y-8">
                <Card className="bg-white/90 backdrop-blur-sm shadow-xl p-8">
                    <div className="space-y-6">

                        <div className="text-center border-b pb-6 mb-6">
                            <h2 className="text-2xl font-bold uppercase tracking-wide text-gray-800">Create New Agreement</h2>
                            <p className="text-gray-500 text-sm mt-1">Generate and save scope of work or contracts</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Main Heading / Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none mt-1"
                                    placeholder="e.g. AGREEMENT FOR BRICKS WORK AT EURO OIL SITE"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Client 1 Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.party_one_name}
                                        onChange={e => setFormData({ ...formData, party_one_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Client 2 (Company Name - Auto)</label>
                                    <input
                                        type="text"
                                        disabled
                                        className="w-full px-4 py-2 rounded border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed outline-none"
                                        value={profile?.name || "Company Name"}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Client 1 Details (Work, CNIC, Phone, etc)</label>
                                <textarea
                                    rows={3}
                                    className="w-full px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.party_one_details}
                                    onChange={e => setFormData({ ...formData, party_one_details: e.target.value })}
                                />
                            </div>

                            {/* Section 1: Scope of Work */}
                            <div className="pt-4">
                                <label className="text-lg font-bold text-gray-800 border-b pb-2 block mb-4">1. Scope of Work / Kam ki Tafseel</label>
                                <div className="space-y-3">
                                    {formData.scope_of_work.map((line, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <span className="font-bold text-gray-500 w-6">{index + 1}.</span>
                                            <input
                                                type="text"
                                                className="flex-1 px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="Enter scope detail..."
                                                value={line}
                                                onChange={e => updateLine('scope_of_work', index, e.target.value)}
                                            />
                                            {formData.scope_of_work.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeLine('scope_of_work', index)}
                                                    className="bg-red-100 text-red-600 px-3 py-2 rounded hover:bg-red-200 font-bold"
                                                >
                                                    ✗
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={() => addLine('scope_of_work')} className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded hover:bg-gray-200 transition-colors">
                                    + Add New Point
                                </button>
                            </div>

                            {/* Section 2: Rates of Work */}
                            <div className="pt-4">
                                <label className="text-lg font-bold text-gray-800 border-b pb-2 block mb-4">2. Rates of Work / Kam kay Rates</label>
                                <div className="space-y-3">
                                    {formData.rates_of_work.map((line, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <span className="font-bold text-gray-500 w-6">{index + 1}.</span>
                                            <input
                                                type="text"
                                                className="flex-1 px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="Enter rate detail..."
                                                value={line}
                                                onChange={e => updateLine('rates_of_work', index, e.target.value)}
                                            />
                                            {formData.rates_of_work.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeLine('rates_of_work', index)}
                                                    className="bg-red-100 text-red-600 px-3 py-2 rounded hover:bg-red-200 font-bold"
                                                >
                                                    ✗
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={() => addLine('rates_of_work')} className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded hover:bg-gray-200 transition-colors">
                                    + Add New Point
                                </button>
                            </div>

                            {/* Section 3: Payment Schedule */}
                            <div className="pt-4">
                                <label className="text-lg font-bold text-gray-800 border-b pb-2 block mb-4">3. Payment Schedule</label>
                                <div className="space-y-3">
                                    {formData.payment_schedule.map((line, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <span className="font-bold text-gray-500 w-6">{index + 1}.</span>
                                            <input
                                                type="text"
                                                className="flex-1 px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="Enter payment schedule detail..."
                                                value={line}
                                                onChange={e => updateLine('payment_schedule', index, e.target.value)}
                                            />
                                            {formData.payment_schedule.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeLine('payment_schedule', index)}
                                                    className="bg-red-100 text-red-600 px-3 py-2 rounded hover:bg-red-200 font-bold"
                                                >
                                                    ✗
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={() => addLine('payment_schedule')} className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded hover:bg-gray-200 transition-colors">
                                    + Add New Point
                                </button>
                            </div>

                        </div>

                        <div className="flex items-center space-x-2 bg-blue-50 p-4 rounded-lg mt-6">
                            <input
                                type="checkbox"
                                id="includeStamp"
                                className="w-5 h-5 cursor-pointer"
                                checked={includeStamp}
                                onChange={e => setIncludeStamp(e.target.checked)}
                            />
                            <label htmlFor="includeStamp" className="text-sm font-bold text-blue-900 cursor-pointer">
                                Include Digital CEO Stamp on Agreement
                            </label>
                        </div>

                        <div className="pt-6 flex flex-wrap gap-4 justify-end">
                            <button
                                type="button"
                                onClick={() => handleSaveAndDownload('en')}
                                disabled={loading}
                                className={`px-6 py-3 bg-indigo-600 text-white font-bold rounded shadow hover:bg-indigo-700 transition-colors
                                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Processing...' : 'Save & Download (English Labels)'}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSaveAndDownload('ur')}
                                disabled={loading}
                                className={`px-6 py-3 bg-emerald-600 text-white font-bold rounded shadow hover:bg-emerald-700 transition-colors
                                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Processing...' : 'Save & Download (Urdu RTL Labels)'}
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Saved Agreements */}
                {agreements.length > 0 && (
                    <Card className="bg-white/90 backdrop-blur-sm shadow-xl p-8">
                        <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Saved Agreements</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-100/50">
                                        <th className="p-3 border-b font-semibold text-gray-600">Date</th>
                                        <th className="p-3 border-b font-semibold text-gray-600">Title</th>
                                        <th className="p-3 border-b font-semibold text-gray-600">Client 1</th>
                                        <th className="p-3 border-b font-semibold text-gray-600">Sections</th>
                                        <th className="p-3 border-b font-semibold text-gray-600 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agreements.map((agr) => (
                                        <tr key={agr.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-3 border-b text-sm text-gray-600">
                                                {new Date(agr.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-3 border-b font-medium text-gray-800">{agr.title}</td>
                                            <td className="p-3 border-b text-gray-600">{agr.party_one_name}</td>
                                            <td className="p-3 border-b text-xs text-gray-500">
                                                Scope: {(agr.scope_of_work?.length) || 0} pts<br />
                                                Rates: {(agr.rates_of_work?.length) || 0} pts
                                            </td>
                                            <td className="p-3 border-b">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleDownloadExisting(agr, 'en')}
                                                        className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded text-xs font-bold hover:bg-indigo-100"
                                                        title="Download English"
                                                    >
                                                        EN PDF
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadExisting(agr, 'ur')}
                                                        className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded text-xs font-bold hover:bg-emerald-100"
                                                        title="Download Urdu Formatted"
                                                    >
                                                        UR PDF
                                                    </button>
                                                    <button
                                                        onClick={() => deleteAgreement(agr.id)}
                                                        className="px-3 py-1 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100"
                                                    >
                                                        Del
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>
        </>
    );
}
