'use client';
import { useState, useEffect } from 'react';
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { api, CompanyProfile } from "@/lib/api";
import { DatePicker } from "@/components/ui/DatePicker";
import { generateIDCardApplicationPDF, generateEmployeeIDCardPDF } from "@/utils/hrPdfGenerator";

export default function IDCardApplicationPage() {
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);

    useEffect(() => {
        api.profile.get().then(res => setProfile(res));
    }, []);

    // Check for existing photo/sig if editing (not implemented but good practice) or just init
    const [form, setForm] = useState({
        name: '',
        designation: '',
        department: '',
        joining_date: '',
        dob: '',
        blood_group: '',
        issue_date: new Date().toISOString().split('T')[0],
        nic_no: '',
        contact_no: '',
        employee_code: '',
        photo_url: '',
        signature_url: ''
    });

    const [uploading, setUploading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.urls && data.urls.length > 0) {
                setForm(prev => ({ ...prev, [field]: data.urls[0] }));
            }
        } catch (error) {
            console.error("Upload Error:", error);
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.hrIDCardApplications.add(form);
            alert("Application Saved!");
        } catch (error) {
            console.error(error);
            alert("Failed to save.");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadForm = async () => {
        if (profile) await generateIDCardApplicationPDF(form, profile);
        else await generateIDCardApplicationPDF(form, {});
    };

    const handleDownloadCard = async () => {
        if (profile) await generateEmployeeIDCardPDF(form, profile);
        else await generateEmployeeIDCardPDF(form, {});
    };

    return (
        <>
            <Header title="Service Identity Card Application" />
            <div className="p-8 max-w-4xl mx-auto">
                <Card className="bg-white/90 backdrop-blur-sm shadow-xl p-8">
                    <form onSubmit={handleSave} className="space-y-6">

                        <div className="text-center border-b pb-6 mb-6">
                            <h2 className="text-2xl font-bold uppercase tracking-wide text-gray-800">Identity Card Application</h2>
                            <p className="text-gray-500 text-sm mt-1">Fill details to generate ID Card Request Form or Card Design</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField label="Name" name="name" value={form.name} onChange={handleChange} required />
                            <InputField label="Designation" name="designation" value={form.designation} onChange={handleChange} required />

                            <InputField label="Department" name="department" value={form.department} onChange={handleChange} required />
                            <DatePicker
                                label="Date of Joining"
                                value={form.joining_date}
                                onChange={(val) => setForm({ ...form, joining_date: val })}
                                required
                            />

                            <DatePicker
                                label="Date of Birth"
                                value={form.dob}
                                onChange={(val) => setForm({ ...form, dob: val })}
                                required
                            />
                            <InputField label="Blood Group" name="blood_group" value={form.blood_group} onChange={handleChange} required />

                            <DatePicker
                                label="Issue Date"
                                value={form.issue_date}
                                onChange={(val) => setForm({ ...form, issue_date: val })}
                                required
                            />
                            <InputField label="NIC No" name="nic_no" value={form.nic_no} onChange={handleChange} required placeholder="00000-0000000-0" />

                            <InputField label="Contact No" name="contact_no" value={form.contact_no} onChange={handleChange} required />
                            <InputField label="Employee Code" name="employee_code" value={form.employee_code} onChange={handleChange} required />

                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4 mt-2">
                                <div>
                                    <label className="text-sm font-semibold text-gray-700 block mb-2">Employee Photo</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, 'photo_url')}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    {form.photo_url && <p className="text-xs text-green-600 mt-1">Photo Uploaded</p>}
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-700 block mb-2">Digital Signature</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, 'signature_url')}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    {form.signature_url && <p className="text-xs text-green-600 mt-1">Signature Uploaded</p>}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end gap-3 flex-wrap">
                            <button
                                type="button"
                                onClick={handleDownloadCard}
                                disabled={uploading}
                                className="px-6 py-3 bg-purple-600 text-white font-bold rounded shadow hover:bg-purple-700 transition-colors disabled:opacity-50"
                            >
                                {uploading ? 'Uploading...' : 'Download ID Card (2-Sided)'}
                            </button>
                            <button
                                type="button"
                                onClick={handleDownloadForm}
                                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded shadow hover:bg-indigo-700 transition-colors"
                            >
                                Download App Form
                            </button>
                            <button
                                type="submit"
                                disabled={loading || uploading}
                                className={`px-8 py-3 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 transition-colors
                                    ${(loading || uploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Saving...' : 'Save Record'}
                            </button>
                        </div>
                    </form>
                </Card>
            </div>
        </>
    );
}

const InputField = ({ label, name, type = 'text', value, onChange, required, placeholder }: any) => (
    <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">{label}</label>
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            className="w-full px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
        />
    </div>
);
