'use client';
import { useState, useEffect, useRef } from 'react';
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { api, CompanyProfile } from "@/lib/api";
import { DatePicker } from "@/components/ui/DatePicker";
import { generateBioDataPDF } from "@/utils/hrPdfGenerator";

export default function BioDataPage() {
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);

    const firstNameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        api.profile.get().then(res => setProfile(res));
        // Auto-focus the first field on mount
        if (firstNameRef.current) {
            firstNameRef.current.focus();
        }
    }, []);

    // --- State for Form ---
    const [personal, setPersonal] = useState({
        full_name: '', father_husband_name: '', gender: 'Male', marital_status: 'Single',
        nic_number: '', nationality: 'Pakistani', religion: 'Islam',
        permanent_address: '', present_address: '',
        tel: '', mobile: '', email: '',
        blood_group: '', date_of_birth: '',
        emergency_content_name: '', emergency_contact_relation: '', emergency_contact_address: '',
        emergency_contact_tel: '', emergency_contact_mobile: '',
        dependents_count: '', hobbies: '',
        bank_account_no: '', bank_name: '',
        photo_url: '',
        terms_and_conditions: "I hereby certify that the information given above is correct and complete to the best of my knowledge and belief. I understand that any false information may lead to termination of my service."
    });

    // --- Dynamic Tables State ---
    const [education, setEducation] = useState([{ degree: '', institution: '', year: '', division: '', grade: '' }]);
    const [service, setService] = useState([{ designation: '', organization: '', from: '', to: '', remarks: '' }]);
    const [language, setLanguage] = useState([{ language: '', proficiency: '' }]);

    // --- Helpers for Dynamic Tables ---
    const updateRow = (setData: any, index: number, field: string, value: string) => {
        setData((prev: any[]) => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
    };
    const addRow = (setData: any, emptyRow: any) => setData((prev: any[]) => [...prev, emptyRow]);
    const removeRow = (setData: any, index: number) => setData((prev: any[]) => prev.filter((_, i) => i !== index));

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setPersonal(prev => ({ ...prev, photo_url: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            ...personal,
            education_data: education,
            service_record_data: service,
            language_proficiency_data: language
        };

        try {
            // Check if hrBioData exists in api, if not fallback or handle
            if (api.hrBioData) {
                await api.hrBioData.add(payload as any);
            }

            if (profile) await generateBioDataPDF(payload, profile);
            else {
                alert("Profile not loaded, PDF might miss logo");
                await generateBioDataPDF(payload, {});
            }

            alert("Bio Data Saved & PDF Downloaded!");
        } catch (error) {
            console.error(error);
            alert("Failed to save bio data.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-transparent relative">
            <Header title="HR Bio-Data Form" />

            <div className="p-3 md:p-8 max-w-6xl mx-auto w-full flex-grow">
                {/* Background Elements */}
                <div className="fixed inset-0 bg-gray-50 -z-10"></div>
                <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] -z-10"></div>
                <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px] -z-10"></div>

                <Card className="bg-white/70 backdrop-blur-2xl border border-black/10 shadow-2xl p-0 rounded-3xl overflow-hidden mb-10">
                    <form onSubmit={handleSubmit}>

                        <div className="text-center border-b border-black/5 p-6 md:p-10 bg-white/30">
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-black leading-tight">Personal Data Form</h2>
                            <p className="text-black/60 text-[8px] md:text-sm mt-2 font-bold tracking-[0.2em] md:tracking-[0.3em] uppercase">MBEC • Architectural Engineering Excellence</p>
                        </div>

                        <div className="p-4 md:p-8 space-y-8 md:space-y-12">

                            {/* Section 01: Personal Profile */}
                            <div className="border border-black/5 p-4 md:p-8 rounded-2xl bg-black/[0.02] relative group transition-all hover:bg-black/[0.04]">
                                <div className="absolute -top-3 left-4 md:left-6 bg-black text-white px-3 md:px-4 py-1 text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg z-10">
                                    Section 01: Personal Profile
                                </div>

                                <div className="flex flex-col md:flex-row gap-6 md:gap-8 pt-2">
                                    {/* Photo Upload Box - Centered on mobile */}
                                    <div className="flex flex-col items-center shrink-0">
                                        <div className="w-28 md:w-32 h-36 md:h-40 border-2 border-dashed border-black/10 flex items-center justify-center relative overflow-hidden bg-black/5 rounded-xl hover:border-black/30 transition-colors">
                                            {personal.photo_url ? (
                                                <img src={personal.photo_url} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-black/40 text-[10px] text-center p-2 uppercase font-black">Upload Photo</span>
                                            )}
                                            <input type="file" onChange={handlePhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                        </div>
                                        <p className="text-[8px] uppercase font-black text-black/40 mt-2 tracking-widest">Passport Size</p>
                                    </div>

                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2 md:col-span-1">
                                            <label className="label">Full Name</label>
                                            <input ref={firstNameRef} type="text" required className="input" placeholder="ENTER FULL NAME..." value={personal.full_name} onChange={e => setPersonal({ ...personal, full_name: e.target.value })} />
                                        </div>
                                        <div className="sm:col-span-2 md:col-span-1">
                                            <label className="label">Father/Husband Name</label>
                                            <input type="text" required className="input" placeholder="FATHER/HUSBAND..." value={personal.father_husband_name} onChange={e => setPersonal({ ...personal, father_husband_name: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 sm:col-span-2 md:col-span-2">
                                            <div>
                                                <label className="label">Gender</label>
                                                <select className="input" value={personal.gender} onChange={e => setPersonal({ ...personal, gender: e.target.value })}>
                                                    <option>Male</option><option>Female</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="label">Marital Status</label>
                                                <select className="input" value={personal.marital_status} onChange={e => setPersonal({ ...personal, marital_status: e.target.value })}>
                                                    <option>Single</option><option>Married</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label">CNIC Number</label>
                                            <input type="text" required className="input" placeholder="00000-0000000-0" value={personal.nic_number} onChange={e => setPersonal({ ...personal, nic_number: e.target.value })} />
                                        </div>
                                        <div>
                                            <DatePicker
                                                label="Date of Birth"
                                                value={personal.date_of_birth}
                                                onChange={val => setPersonal({ ...personal, date_of_birth: val })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Nationality</label>
                                            <input type="text" className="input" placeholder="PAKISTANI" value={personal.nationality} onChange={e => setPersonal({ ...personal, nationality: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="label">Religion</label>
                                            <input type="text" className="input" placeholder="ISLAM" value={personal.religion} onChange={e => setPersonal({ ...personal, religion: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-4">
                                    <div>
                                        <label className="label">Permanent Address</label>
                                        <input type="text" required className="input" placeholder="ENTER PERMANENT ADDRESS..." value={personal.permanent_address} onChange={e => setPersonal({ ...personal, permanent_address: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="label">Present Address</label>
                                        <input type="text" required className="input" placeholder="ENTER PRESENT ADDRESS..." value={personal.present_address} onChange={e => setPersonal({ ...personal, present_address: e.target.value })} />
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="label">Telephone</label>
                                        <input type="text" className="input" placeholder="RES NO..." value={personal.tel} onChange={e => setPersonal({ ...personal, tel: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="label">Mobile</label>
                                        <input type="text" required className="input" placeholder="MOBILE NO..." value={personal.mobile} onChange={e => setPersonal({ ...personal, mobile: e.target.value })} />
                                    </div>
                                    <div className="sm:col-span-2 md:col-span-1">
                                        <label className="label">Email</label>
                                        <input type="email" className="input" placeholder="EMAIL ADDRESS..." value={personal.email} onChange={e => setPersonal({ ...personal, email: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="label">Blood Group</label>
                                        <input type="text" className="input" placeholder="E.G. A+" value={personal.blood_group} onChange={e => setPersonal({ ...personal, blood_group: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Section 02: Academic Qualification */}
                            <div className="border border-black/10 p-5 md:p-8 rounded-3xl bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 md:w-10 md:h-10 bg-black text-white rounded-xl flex items-center justify-center font-black text-xs md:text-sm shadow-lg">02</div>
                                    <h3 className="text-sm md:text-lg font-black uppercase tracking-tight text-black">Academic Qualification</h3>
                                </div>
                                <div className="overflow-x-auto scrollbar-hide -mx-1">
                                    <table className="w-full text-xs border-collapse min-w-[600px] md:min-w-0">
                                        <thead><tr className="bg-black/5 text-black uppercase text-[8px] md:text-[10px] font-black tracking-widest"><th className="p-3 text-left rounded-l-xl">Degree / Certificate</th><th className="p-3 text-left">Institute / Board</th><th className="p-3 text-left w-24">Year</th><th className="p-3 text-left w-24">Div / Grade</th><th className="p-3 text-right rounded-r-xl w-16">Ops</th></tr></thead>
                                        <tbody className="divide-y divide-black/5">
                                            {education.map((row, i) => (
                                                <tr key={i} className="group">
                                                    <td className="p-2"><input type="text" className="input-sm bg-black/5 rounded-lg px-2 py-3" placeholder="E.G. MATRIC/BS..." value={row.degree} onChange={e => updateRow(setEducation, i, 'degree', e.target.value)} /></td>
                                                    <td className="p-2"><input type="text" className="input-sm bg-black/5 rounded-lg px-2 py-3" placeholder="UNIVERSITY/BOARD..." value={row.institution} onChange={e => updateRow(setEducation, i, 'institution', e.target.value)} /></td>
                                                    <td className="p-2"><input type="text" className="input-sm bg-black/5 rounded-lg px-2 py-3" placeholder="2024..." value={row.year} onChange={e => updateRow(setEducation, i, 'year', e.target.value)} /></td>
                                                    <td className="p-2"><input type="text" className="input-sm bg-black/5 rounded-lg px-2 py-3" placeholder="1ST / A+..." value={row.division} onChange={e => updateRow(setEducation, i, 'division', e.target.value)} /></td>
                                                    <td className="p-2 text-right"><button type="button" onClick={() => removeRow(setEducation, i)} className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-black hover:bg-red-600 hover:text-white transition-colors">×</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button type="button" onClick={() => addRow(setEducation, { degree: '', institution: '', year: '', division: '', grade: '' })} className="text-[10px] uppercase font-black px-6 py-3 mt-4 border-2 border-dashed border-black/20 text-black/60 rounded-xl hover:border-black hover:text-black hover:bg-black/5 transition-all w-full md:w-auto">+ Add Another Degree</button>
                            </div>
                            {/* Section 03: Employment History */}
                            <div className="border border-black/10 p-5 md:p-8 rounded-3xl bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 md:w-10 md:h-10 bg-black text-white rounded-xl flex items-center justify-center font-black text-xs md:text-sm shadow-lg">03</div>
                                    <h3 className="text-sm md:text-lg font-black uppercase tracking-tight text-black">Employment History / Service Record</h3>
                                </div>
                                <div className="overflow-x-auto scrollbar-hide -mx-1">
                                    <table className="w-full text-xs border-collapse min-w-[700px] md:min-w-0">
                                        <thead><tr className="bg-black/5 text-black uppercase text-[8px] md:text-[10px] font-black tracking-widest"><th className="p-3 text-left rounded-l-xl">Designation</th><th className="p-3 text-left">Organization</th><th className="p-3 text-left w-24">From</th><th className="p-3 text-left w-24">To</th><th className="p-3 text-left">Remarks</th><th className="p-3 text-right rounded-r-xl w-16">Ops</th></tr></thead>
                                        <tbody className="divide-y divide-black/5">
                                            {service.map((row, i) => (
                                                <tr key={i} className="group">
                                                    <td className="p-2"><input type="text" className="input-sm bg-black/5 rounded-lg px-2 py-3" placeholder="SITE ENGINEER..." value={row.designation} onChange={e => updateRow(setService, i, 'designation', e.target.value)} /></td>
                                                    <td className="p-2"><input type="text" className="input-sm bg-black/5 rounded-lg px-2 py-3" placeholder="COMPANY NAME..." value={row.organization} onChange={e => updateRow(setService, i, 'organization', e.target.value)} /></td>
                                                    <td className="p-2"><input type="text" className="input-sm bg-black/5 rounded-lg px-2 py-3" placeholder="MM/YY..." value={row.from} onChange={e => updateRow(setService, i, 'from', e.target.value)} /></td>
                                                    <td className="p-2"><input type="text" className="input-sm bg-black/5 rounded-lg px-2 py-3" placeholder="MM/YY..." value={row.to} onChange={e => updateRow(setService, i, 'to', e.target.value)} /></td>
                                                    <td className="p-2"><input type="text" className="input-sm bg-black/5 rounded-lg px-2 py-3" placeholder="REASON FOR LEAVING..." value={row.remarks} onChange={e => updateRow(setService, i, 'remarks', e.target.value)} /></td>
                                                    <td className="p-2 text-right"><button type="button" onClick={() => removeRow(setService, i)} className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-black hover:bg-red-600 hover:text-white transition-colors">×</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button type="button" onClick={() => addRow(setService, { designation: '', organization: '', from: '', to: '', remarks: '' })} className="text-[10px] uppercase font-black px-6 py-3 mt-4 border-2 border-dashed border-black/20 text-black/60 rounded-xl hover:border-black hover:text-black hover:bg-black/5 transition-all w-full md:w-auto">+ Add Experience</button>
                            </div>
                            {/* Section 04: Language & Skills */}
                            <div className="border border-black/10 p-5 md:p-8 rounded-3xl bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 md:w-10 md:h-10 bg-black text-white rounded-xl flex items-center justify-center font-black text-xs md:text-sm shadow-lg">04</div>
                                    <h3 className="text-sm md:text-lg font-black uppercase tracking-tight text-black">Language Proficiency / Skills</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="overflow-x-auto scrollbar-hide">
                                        <table className="w-full text-xs border-collapse">
                                            <thead><tr className="bg-black/5 text-black uppercase text-[8px] md:text-[10px] font-black tracking-widest"><th className="p-3 text-left rounded-l-xl">Language</th><th className="p-3 text-left">Proficiency</th><th className="p-3 text-right rounded-r-xl w-16">Ops</th></tr></thead>
                                            <tbody className="divide-y divide-black/5">
                                                {language.map((row, i) => (
                                                    <tr key={i} className="group">
                                                        <td className="p-2"><input type="text" className="input-sm bg-black/5 rounded-lg px-2 py-3" placeholder="ENGLISH, URDU..." value={row.language} onChange={e => updateRow(setLanguage, i, 'language', e.target.value)} /></td>
                                                        <td className="p-2"><input type="text" className="input-sm bg-black/5 rounded-lg px-2 py-3" placeholder="EXPERTISE..." value={row.proficiency} onChange={e => updateRow(setLanguage, i, 'proficiency', e.target.value)} /></td>
                                                        <td className="p-2 text-right"><button type="button" onClick={() => removeRow(setLanguage, i)} className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-black hover:bg-red-600 hover:text-white transition-colors">×</button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <button type="button" onClick={() => addRow(setLanguage, { language: '', proficiency: '' })} className="text-[8px] md:text-[10px] uppercase font-black px-4 py-2 mt-2 bg-black/5 rounded-lg hover:bg-black hover:text-white transition-all">+ Add Language</button>
                                    </div>
                                    <div className="space-y-4 bg-black/[0.02] p-6 rounded-2xl">
                                        <div>
                                            <label className="label">Main Achievements / Hobbies</label>
                                            <textarea className="input min-h-[100px] resize-none" placeholder="LIST YOUR HOBBIES OR ACHIEVEMENTS..." value={personal.hobbies} onChange={e => setPersonal({ ...personal, hobbies: e.target.value })}></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Section 05: Emergency & Financial */}
                            <div className="border border-black/10 p-5 md:p-8 rounded-3xl bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 md:w-10 md:h-10 bg-black text-white rounded-xl flex items-center justify-center font-black text-xs md:text-sm shadow-lg">05</div>
                                    <h3 className="text-sm md:text-lg font-black uppercase tracking-tight text-black">Emergency Contact & Bank Details</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Emergency Section */}
                                    <div className="p-6 rounded-2xl bg-red-50/30 border border-red-100 flex flex-col gap-4">
                                        <h4 className="text-[10px] font-black uppercase text-red-600/60 mb-2">Emergency Contact Information</h4>
                                        <div>
                                            <label className="label">Contact Name</label>
                                            <input type="text" required className="input" placeholder="NAME OF CONTACT PERSON..." value={personal.emergency_content_name} onChange={e => setPersonal({ ...personal, emergency_content_name: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="label">Relation</label>
                                                <input type="text" required className="input" placeholder="E.G. BROTHER..." value={personal.emergency_contact_relation} onChange={e => setPersonal({ ...personal, emergency_contact_relation: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="label">Contact No</label>
                                                <input type="text" required className="input" placeholder="03XXXXXXXXX..." value={personal.emergency_contact_mobile} onChange={e => setPersonal({ ...personal, emergency_contact_mobile: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bank Section */}
                                    <div className="p-6 rounded-2xl bg-blue-50/30 border border-blue-100 flex flex-col gap-4">
                                        <h4 className="text-[10px] font-black uppercase text-blue-600/60 mb-2">Bank Account Details (For Salary)</h4>
                                        <div>
                                            <label className="label">Bank Name</label>
                                            <input type="text" className="input" placeholder="E.G. HBL, MEEZAN..." value={personal.bank_name} onChange={e => setPersonal({ ...personal, bank_name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="label">Account Number / IBAN</label>
                                            <input type="text" className="input" placeholder="ENTER COMPLETE ACCOUNT NO..." value={personal.bank_account_no} onChange={e => setPersonal({ ...personal, bank_account_no: e.target.value })} />
                                        </div>
                                    </div>

                                    {/* Additional Stats */}
                                    <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t border-black/5 mt-4">
                                        <div>
                                            <label className="label">Dependents Count</label>
                                            <input type="number" className="input" placeholder="0" value={personal.dependents_count} onChange={e => setPersonal({ ...personal, dependents_count: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 06: Declaration */}
                            <div className="p-6 bg-black text-white rounded-3xl shadow-xl">
                                <label className="text-[10px] uppercase font-black text-white/50 block mb-3 tracking-widest">Employee Declaration</label>
                                <textarea
                                    className="w-full bg-transparent border-none text-xs md:text-sm font-bold leading-relaxed outline-none resize-none h-24 text-white/90 italic"
                                    value={personal.terms_and_conditions}
                                    onChange={e => setPersonal({ ...personal, terms_and_conditions: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Final Action Bar - Responsive Button */}
                        <div className="bg-black/5 p-6 md:p-10 border-t border-black/5 flex justify-center">
                            <button type="submit" disabled={loading} className="w-full max-w-sm py-4 md:py-6 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] md:tracking-[0.4em] hover:bg-primary transition-all text-sm md:text-lg shadow-xl active:scale-95">
                                {loading ? 'PROCESSING...' : 'SAVE & GENERATE PDF'}
                            </button>
                        </div>
                    </form>
                </Card>
            </div>

            <style jsx>{`
                .label { @apply text-[9px] md:text-[10px] uppercase font-black text-black block mb-1 tracking-wider; }
                .input { 
                    @apply w-full px-4 py-3 md:py-4 rounded-xl border border-black/10 bg-black/5 text-black 
                    focus:bg-white focus:ring-4 focus:ring-black/5 font-black uppercase text-xs md:text-sm outline-none transition-all; 
                }
                .input-sm { 
                    @apply w-full px-2 py-2 rounded-lg border-none bg-transparent text-black font-black uppercase text-[10px] md:text-xs outline-none; 
                }
            `}</style>
        </div >
    );
}
