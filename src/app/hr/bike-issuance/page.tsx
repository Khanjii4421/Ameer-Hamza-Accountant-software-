'use client';
import { useState, useEffect } from 'react';
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { api, CompanyProfile } from "@/lib/api";
import { DatePicker } from "@/components/ui/DatePicker";
import { generateBikeIssuancePDF } from "@/utils/hrPdfGenerator";

export default function BikeIssuancePage() {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);

    useEffect(() => {
        api.profile.get().then(res => setProfile(res));
    }, []);

    const [form, setForm] = useState({
        ref_no: `MBEC-HR-LHR-${new Date().getFullYear()}-0`,
        date: new Date().toISOString().split('T')[0],
        employee_name: '',
        father_name: '',
        designation: '',
        cnic: '',
        contact: '',
        bike_number: 'LEM-19B-1150',
        chassis_number: 'RP70CH663389',
        engine_number: 'RP70EN665369',
        issuance_date: '',
        photo_url: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.urls && data.urls.length > 0) {
                setForm(prev => ({ ...prev, photo_url: data.urls[0] }));
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
            await api.hrBikeIssuance.add(form);
            alert("Record Saved!");
        } catch (error) {
            console.error(error);
            alert("Failed to save.");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (profile) await generateBikeIssuancePDF(form, profile);
        else await generateBikeIssuancePDF(form, {});
    };

    return (
        <>
            <Header title="Bike Issuance Letter" />
            <div className="p-8 max-w-4xl mx-auto">
                <Card className="bg-white/90 backdrop-blur-sm shadow-xl p-8">
                    <form onSubmit={handleSave} className="space-y-6">

                        <div className="text-center border-b pb-6 mb-6">
                            <h2 className="text-2xl font-bold uppercase tracking-wide text-gray-800">Bike Issuance Letter</h2>
                            <p className="text-gray-500 text-sm mt-1">Generate official bike handover letter</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Employee Details */}
                            <div className="md:col-span-2">
                                <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Employee Details</h3>
                            </div>

                            <InputField label="Ref No" name="ref_no" value={form.ref_no} onChange={handleChange} required />
                            <DatePicker
                                label="Date"
                                value={form.date}
                                onChange={(val) => setForm({ ...form, date: val })}
                                required
                            />

                            <InputField label="Employee Name" name="employee_name" value={form.employee_name} onChange={handleChange} required />
                            <InputField label="Father's Name (S/O)" name="father_name" value={form.father_name} onChange={handleChange} required />

                            <InputField label="Designation" name="designation" value={form.designation} onChange={handleChange} required />
                            <InputField label="CNIC" name="cnic" value={form.cnic} onChange={handleChange} required placeholder="34503-0370196-7" />

                            <InputField label="Contact" name="contact" value={form.contact} onChange={handleChange} required />

                            <div>
                                <label className="text-sm font-semibold text-gray-700 block mb-2">Employee Photo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {form.photo_url && <p className="text-xs text-green-600 mt-1">Photo Uploaded</p>}
                            </div>

                            {/* Bike Details */}
                            <div className="md:col-span-2 mt-4">
                                <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Bike Details</h3>
                            </div>

                            <InputField label="Bike Number" name="bike_number" value={form.bike_number} onChange={handleChange} required />
                            <InputField label="Chassis Number" name="chassis_number" value={form.chassis_number} onChange={handleChange} required />
                            <InputField label="Engine Number" name="engine_number" value={form.engine_number} onChange={handleChange} required />
                            <DatePicker
                                label="Issuance Date (Optional)"
                                value={form.issuance_date}
                                onChange={(val) => setForm({ ...form, issuance_date: val })}
                            />
                        </div>

                        <div className="pt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleDownload}
                                disabled={uploading}
                                className="px-6 py-3 bg-purple-600 text-white font-bold rounded shadow hover:bg-purple-700 transition-colors"
                            >
                                Download PDF
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
