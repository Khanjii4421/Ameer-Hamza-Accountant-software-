'use client';
import { useState, useEffect } from 'react';
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { api, CompanyProfile, HRPerformanceAppraisal } from "@/lib/api";
import { DatePicker } from "@/components/ui/DatePicker";
// Will add generator import later
// import { generatePerformanceAppraisalPDF } from "@/utils/hrPdfGenerator";

export default function PerformanceAppraisalPage() {
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);

    useEffect(() => {
        api.profile.get().then(res => setProfile(res));
    }, []);

    const [form, setForm] = useState({
        employee_name: '',
        employee_code: '',
        department: '',
        designation: '',
        joining_date: '',
        present_position_time: '',
        year_covered: '',
        appraisal_date: new Date().toISOString().split('T')[0],
        appraiser_name: '',
        appraiser_designation: '',
        appraisal_type: 'Annual' as 'Probationary' | 'Annual',
        ratings: {} as Record<string, number>,
        issues: '',
        task_assigned: '',
        task_status: 'Achieved',
        additional_comments: '',
        recommended_training: '',
        appraiser_comments: '',
        hr_comments: ''
    });

    const criteria = [
        "Command on job relevant skill and Knowledge",
        "Work Quality",
        "Ability for learning on one’s own",
        "Attendance / Punctuality",
        "Relation with peers/superiors/subordinates",
        "Ability to handle variety of assignments/ Multiple Tasks",
        "Results achievement and meeting deadlines",
        "Professional appearance (Self and Desk)",
        "Leadership ability and Team Management",
        "Steadiness under pressure",
        "Initiative",
        "Communication Skills (verbal/written)",
        "Compliance of MBE&C rules/ regulation (Discipline)",
        "Dependability"
    ];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleRatingChange = (criterion: string, value: number) => {
        setForm(prev => ({
            ...prev,
            ratings: { ...prev.ratings, [criterion]: value }
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.hrPerformanceAppraisals.add({
                ...form,
                ratings: JSON.stringify(form.ratings) // Store as string
            });
            alert("Appraisal Saved!");
            // Generate PDF logic here later
        } catch (error) {
            console.error(error);
            alert("Failed to save.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Header title="Performance Appraisal" />
            <div className="p-8 max-w-6xl mx-auto">
                <Card className="bg-white/90 backdrop-blur-sm shadow-xl p-8">
                    <form onSubmit={handleSave} className="space-y-8">

                        {/* Header */}
                        <div className="text-center border-b pb-6">
                            <h2 className="text-2xl font-bold uppercase text-gray-800">Performance Appraisal Form</h2>
                            <p className="text-gray-500">Miran Builders Engineering & Construction Pvt Ltd</p>
                        </div>

                        {/* Employee Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField label="Employee Name" name="employee_name" value={form.employee_name} onChange={handleChange} required />
                            <InputField label="Employee Code" name="employee_code" value={form.employee_code} onChange={handleChange} required />

                            <InputField label="Department" name="department" value={form.department} onChange={handleChange} required />
                            <InputField label="Designation" name="designation" value={form.designation} onChange={handleChange} required />

                            <DatePicker
                                label="Date of Joining"
                                value={form.joining_date}
                                onChange={(val) => setForm({ ...form, joining_date: val })}
                                required
                            />
                            <InputField label="Time in Present Position" name="present_position_time" value={form.present_position_time} onChange={handleChange} placeholder="e.g. 2 Years" />

                            <InputField label="Year Covered" name="year_covered" value={form.year_covered} onChange={handleChange} placeholder="e.g. 2024-2025" />
                            <DatePicker
                                label="Date of Appraisal"
                                value={form.appraisal_date}
                                onChange={(val) => setForm({ ...form, appraisal_date: val })}
                                required
                            />

                            <InputField label="Name of Appraiser" name="appraiser_name" value={form.appraiser_name} onChange={handleChange} required />
                            <InputField label="Designation of Appraiser" name="appraiser_designation" value={form.appraiser_designation} onChange={handleChange} required />
                        </div>

                        {/* Appraisal Type */}
                        <div className="flex gap-6 items-center bg-gray-50 p-4 rounded-lg">
                            <span className="font-bold text-gray-700">Type of Appraisal:</span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="appraisal_type" value="Probationary" checked={form.appraisal_type === 'Probationary'} onChange={handleChange} />
                                Probationary/Initial
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="appraisal_type" value="Annual" checked={form.appraisal_type === 'Annual'} onChange={handleChange} />
                                Annual
                            </label>
                        </div>

                        {/* Performance Matrix */}
                        <div>
                            <h3 className="text-xl font-bold mb-4 text-gray-800">Key Performance Criteria</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-gray-300 min-w-[600px]">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border border-gray-300 p-3 text-left w-1/2">Criteria</th>
                                            <th className="border border-gray-300 p-3 text-center w-1/12">5 (Exceeds)</th>
                                            <th className="border border-gray-300 p-3 text-center w-1/12">4 (Fully Meets)</th>
                                            <th className="border border-gray-300 p-3 text-center w-1/12">3 (Most)</th>
                                            <th className="border border-gray-300 p-3 text-center w-1/12">2 (Some)</th>
                                            <th className="border border-gray-300 p-3 text-center w-1/12">1 (Not Met)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {criteria.map((c, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 p-3 font-medium text-gray-700">{c}</td>
                                                {[5, 4, 3, 2, 1].map(score => (
                                                    <td key={score} className="border border-gray-300 p-2 text-center">
                                                        <input
                                                            type="radio"
                                                            name={`rating_${i}`}
                                                            checked={form.ratings[c] === score}
                                                            onChange={() => handleRatingChange(c, score)}
                                                            className="w-5 h-5 cursor-pointer accent-blue-600"
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Comments Sections */}
                        <div className="space-y-6">
                            <TextAreaField label="Any Issues (To be covered separately outside of this appraisal)" name="issues" value={form.issues} onChange={handleChange} />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Task Assigned by HOD" name="task_assigned" value={form.task_assigned} onChange={handleChange} />
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Status</label>
                                    <select name="task_status" value={form.task_status} onChange={handleChange} className="w-full px-4 py-2 border rounded">
                                        <option value="Achieved">Achieved</option>
                                        <option value="Not Achieved">Not Achieved</option>
                                    </select>
                                </div>
                            </div>

                            <TextAreaField label="Additional Comments" name="additional_comments" value={form.additional_comments} onChange={handleChange} />
                            <TextAreaField label="Recommended Training (if any)" name="recommended_training" value={form.recommended_training} onChange={handleChange} />
                            <TextAreaField label="Comments by Appraiser (HOD)" name="appraiser_comments" value={form.appraiser_comments} onChange={handleChange} />
                            <TextAreaField label="Comments by Director HR" name="hr_comments" value={form.hr_comments} onChange={handleChange} />
                        </div>

                        {/* Actions */}
                        <div className="pt-6 flex justify-end gap-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-8 py-3 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 transition-colors
                                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Saving...' : 'Save & Generate PDF'}
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

const TextAreaField = ({ label, name, value, onChange, required, placeholder }: any) => (
    <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">{label}</label>
        <textarea
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            rows={3}
            className="w-full px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
        />
    </div>
);
