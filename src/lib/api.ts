// --- Types (Basic) ---
export interface CompanyProfile {
    id: string; // Changed from number to string
    name: string;
    address: string;
    phone: string;
    admin_password?: string;
    letterhead_url?: string;
    logo_url?: string;
    sidebar_logo_url?: string;
    stamp_url?: string;
    expense_categories?: string[];
    labor_categories?: string[];
}

export interface LaborExpense {
    id: string;
    description: string;
    amount: number;
    category: string;
    site_id?: string;
    site_name?: string; // Optional for display if joined
    date: string;
    company_id: string;
    vendor_id?: string;
    vendor_name?: string;
    worker_name?: string;
    is_paid?: boolean;
    payment_date?: string;
    proof_url?: string;
}

export interface LaborPaymentReceived {
    id: string;
    company_id: string;
    vendor_id?: string; // Optional/Deprecated
    vendor_name?: string; // Optional/Deprecated
    client_id?: string;
    client_name?: string;
    project_id?: string;
    project_title?: string;
    date: string;
    amount: number;
    description: string;
    payment_method: 'Bank' | 'Online' | 'JazzCash' | 'EasyPaisa' | 'Cash' | 'Cheque';
    transaction_id?: string;
    cheque_number?: string;
    bank_name?: string;
    proof_url?: string;
    created_at: string;
    updated_at: string;
}

export interface User {
    id: string;
    username: string;
    password?: string;
    name: string;
    role: 'Admin' | 'Manager' | 'Accountant' | 'Viewer' | 'Employee';
    company_id: string; // Added company_id
    employee_id?: string;
}

export interface Client {
    id: string;
    name: string;
    phone: string;
    address: string;
    email: string;
    company_id: string;
}

export interface Vendor {
    id: string;
    name: string;
    phone: string;
    address: string;
    category: string;
    company_id: string;
}

export interface Project {
    id: string;
    title: string;
    description: string;
    location: string;
    status: 'Active' | 'Completed' | 'OnHold';
    client_id?: string;
    company_id: string;
    start_date?: string;
    end_date?: string;
}

export interface LedgerEntry {
    id: string;
    type: 'CREDIT' | 'DEBIT';
    amount: number;
    description: string;
    date: string;
    client_id?: string;
    vendor_id?: string;
    project_id?: string;
    company_id: string;
    payment_method?: string;
    transaction_id?: string;
    received_by?: string;
    attachment_url?: string;
}

export interface OfficeExpense {
    id: string;
    description: string;
    amount: number;
    category: string;
    date: string;
    proof_url?: string;
    company_id: string;
    is_paid?: boolean;
    payment_date?: string;
}

export interface IndependentExpense {
    id: string;
    sr_no: string;
    name: string;
    vendor_name?: string;
    vendor_category?: string;
    site?: string;
    date: string;
    description: string;
    amount: number;
    slip_url?: string;
    company_id: string;
}



export interface HRFileRecord {
    id: string;
    employee_name: string;
    designation: string;
    date_of_joining: string;
    department: string;
    checked_by_name: string;
    checked_by_designation: string;
    checked_by_date: string;
    checklist_data: any;
    document_paths: any;
    file_size?: number;
    company_id: string;
    created_at: string;
}

export interface DailyWorkLog {
    id: string;
    date: string;
    project_id: string;
    weather: string;
    description: string;
    work_description: string;
    feet: string;
    company_id: string;
    created_at: string;
    project_title?: string;
    employee_id?: string;
    expenses?: number; // Added expenses
}

export interface HRJoiningReport {
    id: string;
    employee_name: string;
    father_name: string;
    designation: string;
    joining_date: string;
    address: string;
    contact: string;
    cnic: string;
    company_id: string;
    created_at: string;
}

export interface HRBioData {
    id: string;
    full_name: string;
    father_husband_name: string;
    gender: string;
    marital_status: string;
    nic_number: string;
    nationality: string;
    religion: string;
    permanent_address: string;
    present_address: string;
    tel: string;
    mobile: string;
    email: string;
    blood_group: string;
    emergency_content_name: string;
    emergency_contact_relation: string;
    emergency_contact_address: string;
    emergency_contact_tel: string;
    emergency_contact_mobile: string;
    dependents_count: string;
    hobbies: string;
    bank_account_no: string;
    bank_name: string;
    education_data: any;
    service_record_data: any;
    language_proficiency_data: any;
    company_id: string;
    created_at: string;
}

export interface HRIDCardApplication {
    id: string;
    name: string;
    designation: string;
    department: string;
    joining_date: string;
    dob: string;
    blood_group: string;
    issue_date: string;
    nic_no: string;
    contact_no: string;
    employee_code: string;
    company_id: string;
    created_at: string;
}

export interface HRPerformanceAppraisal {
    id: string;
    employee_name: string;
    employee_code: string;
    department: string;
    designation: string;
    joining_date: string;
    present_position_time: string;
    year_covered: string;
    appraisal_date: string;
    appraiser_name: string;
    appraiser_designation: string;
    appraisal_type: 'Probationary' | 'Annual';
    ratings: string; // JSON string of Record<string, number>
    issues: string;
    task_assigned: string;
    task_status: string;
    additional_comments: string;
    recommended_training: string;
    appraiser_comments: string;
    hr_comments: string;
    company_id: string;
    created_at: string;
}

export interface HRBikeIssuance {
    id: string;
    ref_no: string;
    date: string;
    employee_name: string;
    father_name: string;
    designation: string;
    cnic: string;
    contact: string;
    bike_number: string;
    chassis_number: string;
    engine_number: string;
    issuance_date: string;
    photo_url: string;
    company_id: string;
    created_at: string;
}

export interface HRAgreement {
    id: string;
    title: string;
    party_one_name: string;
    party_one_details: string;
    scope_of_work: any;
    rates_of_work: any;
    payment_schedule: any;
    company_id: string;
    created_at: string;
}

export interface HREmployee {
    id: string;
    employee_id_str?: string;
    employee_name: string;
    father_name: string;
    designation: string;
    department: string;
    cnic: string;
    contact: string;
    email: string;
    address: string;
    joining_date: string;
    basic_salary: number;
    house_rent: number;
    medical_allowance: number;
    transport_allowance: number;
    other_allowance: number;
    bank_name: string;
    bank_account_no: string;
    status: 'Active' | 'Inactive' | 'Terminated';
    company_id: string;
    created_at: string;
}

export interface HRSalaryRecord {
    id: string;
    employee_id: string;
    employee_name?: string;
    designation?: string;
    department?: string;
    salary_month: string;
    total_days_in_month: number;
    days_worked: number;
    basic_salary: number;
    house_rent: number;
    medical_allowance: number;
    transport_allowance: number;
    other_allowance: number;
    overtime_hours: number;
    overtime_rate: number;
    deductions: number;
    advance_deduction: number;
    loan_deduction: number;
    tax_deduction: number;
    other_deduction: number;
    bonus: number;
    gross_salary: number;
    net_salary: number;
    payment_date: string;
    payment_status: 'Pending' | 'Paid' | 'Partial';
    remarks: string;
    leaves_count?: number;
    absent_count?: number;
    company_id: string;
    created_at: string;
}

export interface HRAdvance {
    id: string;
    employee_id: string;
    employee_name?: string;
    amount: number;
    date: string;
    reason: string;
    deducted: number;
    company_id: string;
    created_at: string;
}

export interface HRIncrement {
    id: string;
    employee_id: string;
    employee_name?: string;
    previous_salary: number;
    new_salary: number;
    increment_amount: number;
    increment_type: 'Fixed' | 'Percentage';
    effective_date: string;
    reason: string;
    company_id: string;
    created_at: string;
}

export interface HRAttendance {
    id: string;
    employee_id: string;
    employee_name?: string; // For display
    date: string; // YYYY-MM-DD
    time_in?: string; // HH:mm
    time_out?: string; // HH:mm
    status: 'Present' | 'Absent' | 'Late' | 'Leave' | 'Holiday';
    is_late: number; // Changed from boolean to number (0 or 1)
    latitude?: number;
    longitude?: number;
    address?: string;
    image_url?: string;
    company_id: string;
    created_at: string;
}

export interface HRLeave {
    id: string;
    employee_id: string;
    employee_name?: string;
    from_date: string;
    to_date: string;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    days_count: number;
    leave_type?: 'Full' | 'Half';
    company_id: string;
    created_at: string;
}

export interface DPRVendor { id: string; name: string; }
export interface DPRLabor { id: string; name: string; role?: string; vendor_id?: string; }
export interface DPRProject { id: string; name: string; contractor_name: string; }
export interface DPRWork { id: string; name: string; }
export interface DPRRate { id: string; project_id: string; vendor_id: string; work_id: string; rate: number; }
export interface DPREntry {
    id: string;
    project_id: string;
    sr_no: number;
    date: string;
    weather: string;
    vendor_id: string;
    labor_ids: string[]; // Updated for multiple labors
    work_id: string;
    inches: number;
    sft: number;
    remarks: string;
    rate: number;
    total_balance: number;
    vendor_name?: string;
    labor_name?: string; // Still used for display (maybe comma separated)
    work_name?: string;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    related_id?: string;
    is_read: number;
    created_at: string;
}

// --- Helper Functions ---
// The `requireCompanyId` flag allows certain endpoints (like public profile on the login page)
// to be called without a logged-in user / company header.
async function request<T>(
    url: string,
    method: string = 'GET',
    body?: any,
    requireCompanyId: boolean = true
): Promise<T> {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('current_user') : null;
    const user = storedUser ? JSON.parse(storedUser) : null;
    const companyId = user?.company_id;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (companyId) {
        (headers as any)['X-Company-ID'] = companyId;
    } else if (requireCompanyId) {
        throw new Error('Company ID required. Please log in again.');
    }

    const options: RequestInit = {
        method,
        headers,
        cache: 'no-store'
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    const res = await fetch(url, options);
    if (!res.ok) {
        let errorMessage = res.statusText;
        try {
            const errorBody = await res.json();
            errorMessage = errorBody.error || errorBody.message || errorMessage;
        } catch { }
        throw new Error(errorMessage);
    }
    return res.json();
}

// --- API Functions ---

// 1. Company Profile
export const api = {
    profile: {
        // Profile can be fetched without a logged-in user (e.g. on login page),
        // so we disable the company ID requirement for this endpoint.
        get: () => request<CompanyProfile>('/api/profile', 'GET', undefined, false),
        update: (updates: Partial<CompanyProfile>) => request<CompanyProfile>('/api/profile', 'PUT', updates)
    },

    // 2. Users
    users: {
        // Used for login before a user/company is selected, so we allow calls
        // without requiring a company header here.
        getAll: () => request<User[]>('/api/users', 'GET', undefined, false),
        add: (user: Omit<User, 'id' | 'company_id'>) => request<User>('/api/users', 'POST', user),
        delete: (id: string) => request<void>(`/api/users/${id}`, 'DELETE')
    },

    // 3. Clients
    clients: {
        getAll: () => request<Client[]>('/api/clients'),
        getById: (id: string) => request<Client>(`/api/clients/${id}`),
        add: (client: Omit<Client, 'id' | 'company_id'>) => request<Client>('/api/clients', 'POST', client),
        update: (id: string, updates: Partial<Client>) => request<Client>(`/api/clients/${id}`, 'PUT', updates),
        delete: (id: string) => request<void>(`/api/clients/${id}`, 'DELETE')
    },

    // 4. Vendors
    vendors: {
        getAll: () => request<Vendor[]>('/api/vendors'),
        add: (vendor: Omit<Vendor, 'id' | 'company_id'>) => request<Vendor>('/api/vendors', 'POST', vendor),
        update: (id: string, updates: Partial<Vendor>) => request<Vendor>(`/api/vendors/${id}`, 'PUT', updates),
        delete: (id: string) => request<void>(`/api/vendors/${id}`, 'DELETE')
    },

    // 5. Projects
    projects: {
        getAll: () => request<(Project & { clients: { name: string } | null })[]>('/api/projects'),
        add: (project: Omit<Project, 'id' | 'company_id'>) => request<Project>('/api/projects', 'POST', project),
        update: (id: string, updates: Partial<Project>) => request<Project>(`/api/projects/${id}`, 'PUT', updates),
        delete: (id: string) => request<void>(`/api/projects/${id}`, 'DELETE')
    },

    // 6. Ledger
    ledger: {
        getAll: (filter?: { project_id?: string, client_id?: string }) => {
            const params = new URLSearchParams();
            if (filter?.project_id) params.append('project_id', filter.project_id);
            if (filter?.client_id) params.append('client_id', filter.client_id);
            return request<any[]>(`/api/ledger?${params.toString()}`);
        },
        add: (entry: Omit<LedgerEntry, 'id' | 'company_id'>) => request<LedgerEntry>('/api/ledger', 'POST', entry),
        update: (id: string, entry: Partial<LedgerEntry>) => request<LedgerEntry>(`/api/ledger/${id}`, 'PUT', entry),
        delete: (id: string) => request<void>(`/api/ledger/${id}`, 'DELETE')
    },

    // 7. Office Expenses
    officeExpenses: {
        getAll: () => request<OfficeExpense[]>('/api/office-expenses'),
        add: (expense: Omit<OfficeExpense, 'id' | 'company_id'>) => request<OfficeExpense>('/api/office-expenses', 'POST', expense),
        update: (id: string, expense: Partial<OfficeExpense>) => request<OfficeExpense>(`/api/office-expenses/${id}`, 'PUT', expense),
        delete: (id: string) => request<void>(`/api/office-expenses/${id}`, 'DELETE')
    },

    // 8. Labor Expenses
    laborExpenses: {
        getAll: () => request<LaborExpense[]>('/api/labor-expenses'),
        add: (expense: Omit<LaborExpense, 'id' | 'company_id'>) => request<LaborExpense>('/api/labor-expenses', 'POST', expense),
        update: (id: string, expense: Partial<LaborExpense>) => request<LaborExpense>(`/api/labor-expenses/${id}`, 'PUT', expense),
        patchBulk: (ids: string[], updates: Partial<LaborExpense>) => request<void>('/api/labor-expenses', 'PATCH', { ids, updates }),
        delete: (id: string) => request<void>(`/api/labor-expenses/${id}`, 'DELETE')
    },

    // 8b. Independent Expenses
    independentExpenses: {
        getAll: () => request<IndependentExpense[]>('/api/independent-expenses'),
        add: (expense: Omit<IndependentExpense, 'id' | 'company_id'>) => request<IndependentExpense>('/api/independent-expenses', 'POST', expense),
        delete: (id: string) => request<void>(`/api/independent-expenses/${id}`, 'DELETE')
    },

    // 9. Labor Payments Received
    laborPaymentsReceived: {
        getAll: () => request<LaborPaymentReceived[]>('/api/labor-payments-received'),
        add: (payment: Omit<LaborPaymentReceived, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => request<LaborPaymentReceived>('/api/labor-payments-received', 'POST', payment),
        update: (id: string, payment: Partial<LaborPaymentReceived>) => request<LaborPaymentReceived>(`/api/labor-payments-received/${id}`, 'PUT', payment),
        delete: (id: string) => request<void>(`/api/labor-payments-received/${id}`, 'DELETE')
    },

    // 10. HR File Records
    hrFileRecords: {
        getAll: () => request<HRFileRecord[]>('/api/hr-file-records'),
        add: (record: Omit<HRFileRecord, 'id' | 'company_id'>) => request<HRFileRecord>('/api/hr-file-records', 'POST', record),
        update: (id: string, record: Partial<HRFileRecord>) => request<HRFileRecord>(`/api/hr-file-records/${id}`, 'PUT', record),
        delete: (id: string) => request<void>(`/api/hr-file-records/${id}`, 'DELETE')
    },

    // 10. HR Joining Reports
    hrJoiningReports: {
        getAll: () => request<HRJoiningReport[]>('/api/hr-joining-reports'),
        add: (record: Omit<HRJoiningReport, 'id' | 'company_id'>) => request<HRJoiningReport>('/api/hr-joining-reports', 'POST', record),
        update: (id: string, record: Partial<HRJoiningReport>) => request<HRJoiningReport>(`/api/hr-joining-reports/${id}`, 'PUT', record),
        delete: (id: string) => request<void>(`/api/hr-joining-reports/${id}`, 'DELETE')
    },

    // 11. HR Bio Data
    hrBioData: {
        getAll: () => request<HRBioData[]>('/api/hr-bio-data'),
        add: (record: Omit<HRBioData, 'id' | 'company_id'>) => request<HRBioData>('/api/hr-bio-data', 'POST', record),
        update: (id: string, record: Partial<HRBioData>) => request<HRBioData>(`/api/hr-bio-data/${id}`, 'PUT', record),
        delete: (id: string) => request<void>(`/api/hr-bio-data/${id}`, 'DELETE')
    },

    // 12. HR ID Card Applications
    hrIDCardApplications: {
        getAll: () => request<HRIDCardApplication[]>('/api/hr-id-card-applications'),
        add: (record: Omit<HRIDCardApplication, 'id' | 'company_id' | 'created_at'>) => request<HRIDCardApplication>('/api/hr-id-card-applications', 'POST', record),
        delete: (id: string) => request<void>(`/api/hr-id-card-applications/${id}`, 'DELETE')
    },

    // 13. HR Performance Appraisals
    hrPerformanceAppraisals: {
        getAll: () => request<HRPerformanceAppraisal[]>('/api/hr-performance-appraisals'),
        add: (record: Omit<HRPerformanceAppraisal, 'id' | 'company_id' | 'created_at'>) => request<HRPerformanceAppraisal>('/api/hr-performance-appraisals', 'POST', record),
        delete: (id: string) => request<void>(`/api/hr-performance-appraisals/${id}`, 'DELETE')
    },

    // 14. HR Bike Issuance
    hrBikeIssuance: {
        getAll: () => request<HRBikeIssuance[]>('/api/hr-bike-issuance'),
        add: (record: Omit<HRBikeIssuance, 'id' | 'company_id' | 'created_at'>) => request<HRBikeIssuance>('/api/hr-bike-issuance', 'POST', record),
        delete: (id: string) => request<void>(`/api/hr-bike-issuance/${id}`, 'DELETE')
    },

    // 14a. HR Agreements
    hrAgreements: {
        getAll: () => request<HRAgreement[]>('/api/hr-agreements'),
        add: (record: Omit<HRAgreement, 'id' | 'company_id' | 'created_at'>) => request<HRAgreement>('/api/hr-agreements', 'POST', record),
        delete: (id: string) => request<void>(`/api/hr-agreements/${id}`, 'DELETE')
    },

    // 15. HR Employees (Payroll)
    hrEmployees: {
        getAll: () => request<HREmployee[]>('/api/hr-employees'),
        add: (record: Omit<HREmployee, 'id' | 'company_id' | 'created_at'>) => request<HREmployee>('/api/hr-employees', 'POST', record),
        update: (id: string, record: Partial<HREmployee>) => request<HREmployee>(`/api/hr-employees/${id}`, 'PUT', record),
        delete: (id: string) => request<void>(`/api/hr-employees/${id}`, 'DELETE')
    },

    // 16. HR Salary Records
    hrSalaryRecords: {
        getAll: (employeeId?: string) => {
            const params = employeeId ? `?employee_id=${employeeId}` : '';
            return request<HRSalaryRecord[]>(`/api/hr-salary-records${params}`);
        },
        add: (record: Omit<HRSalaryRecord, 'id' | 'company_id' | 'created_at'>) => request<HRSalaryRecord>('/api/hr-salary-records', 'POST', record),
        update: (id: string, record: Partial<HRSalaryRecord>) => request<HRSalaryRecord>(`/api/hr-salary-records/${id}`, 'PUT', record),
        delete: (id: string) => request<void>(`/api/hr-salary-records/${id}`, 'DELETE')
    },

    // 17. HR Advances
    hrAdvances: {
        getAll: (employeeId?: string) => {
            const params = employeeId ? `?employee_id=${employeeId}` : '';
            return request<HRAdvance[]>(`/api/hr-advances${params}`);
        },
        add: (record: Omit<HRAdvance, 'id' | 'company_id' | 'created_at'>) => request<HRAdvance>('/api/hr-advances', 'POST', record),
        update: (id: string, record: Partial<HRAdvance>) => request<HRAdvance>(`/api/hr-advances/${id}`, 'PUT', record),
        delete: (id: string) => request<void>(`/api/hr-advances/${id}`, 'DELETE')
    },

    // 18. HR Increments
    hrIncrements: {
        getAll: (employeeId?: string) => {
            const params = employeeId ? `?employee_id=${employeeId}` : '';
            return request<HRIncrement[]>(`/api/hr-increments${params}`);
        },
        add: (record: Omit<HRIncrement, 'id' | 'company_id' | 'created_at'>) => request<HRIncrement>('/api/hr-increments', 'POST', record),
        delete: (id: string) => request<void>(`/api/hr-increments/${id}`, 'DELETE')
    },

    // 19. HR Attendance
    hrAttendance: {
        getAll: (month?: string, employeeId?: string) => { // month: YYYY-MM
            const params = new URLSearchParams();
            if (month) params.append('month', month);
            if (employeeId) params.append('employee_id', employeeId);
            return request<HRAttendance[]>(`/api/hr-attendance?${params.toString()}`);
        },
        mark: (record: Omit<HRAttendance, 'id' | 'company_id' | 'created_at'>) => request<HRAttendance>('/api/hr-attendance', 'POST', record),
        delete: (id: string) => request<void>(`/api/hr-attendance?id=${id}`, 'DELETE'),
        // Bulk mark for testing/admin
        markBulk: (records: any[]) => request<void>('/api/hr-attendance/bulk', 'POST', { records }),
    },

    // 20. HR Leaves
    hrLeaves: {
        getAll: (status?: string) => {
            const params = status ? `?status=${status}` : '';
            return request<HRLeave[]>(`/api/hr-leaves${params}`);
        },
        add: (record: Omit<HRLeave, 'id' | 'company_id' | 'created_at' | 'status'>) => request<HRLeave>('/api/hr-leaves', 'POST', record),
        update: (id: string, updates: Partial<HRLeave>) => request<HRLeave>(`/api/hr-leaves/${id}`, 'PUT', updates),
        delete: (id: string) => request<void>(`/api/hr-leaves/${id}`, 'DELETE')
    },

    // 21. Notifications
    notifications: {
        getAll: () => request<Notification[]>('/api/notifications'),
        markRead: (id: string) => request<void>('/api/notifications', 'PUT', { id }),
        markAllRead: () => request<void>('/api/notifications', 'PUT', { markAllRead: true }),
    },

    // 22. Announcements (Admin → All Employees)
    announcements: {
        getAll: () => request<any[]>('/api/announcements'),
        add: (data: { title: string; message: string; type?: string; holiday_date?: string }) =>
            request<{ id: string }>('/api/announcements', 'POST', data),
        delete: (id: string) => request<void>(`/api/announcements?id=${id}`, 'DELETE'),
    },

    // 14b. Daily Work Logs
    dailyWorkLogs: {
        getAll: () => request<DailyWorkLog[]>('/api/daily-work'),
        add: (data: any) => request<void>('/api/daily-work', 'POST', data),
        update: (id: string, data: any) => request<void>(`/api/daily-work/${id}`, 'PUT', data),
        delete: (id: string) => request<void>(`/api/daily-work/${id}`, 'DELETE')
    },

    // 15. DPR
    dpr: {
        vendors: {
            getAll: () => request<DPRVendor[]>('/api/dpr/vendors'),
            add: (name: string) => request<DPRVendor>('/api/dpr/vendors', 'POST', { name }),
            delete: (id: string) => request<void>(`/api/dpr/vendors/${id}`, 'DELETE')
        },
        labors: {
            getAll: () => request<DPRLabor[]>('/api/dpr/labors'),
            add: (name: string, role: string, vendor_id?: string) => request<DPRLabor>('/api/dpr/labors', 'POST', { name, role, vendor_id }),
            delete: (id: string) => request<void>(`/api/dpr/labors/${id}`, 'DELETE')
        },
        rates: {
            getAll: () => request<DPRRate[]>('/api/dpr/rates'),
            add: (data: Omit<DPRRate, 'id'>) => request<DPRRate>('/api/dpr/rates', 'POST', data),
            delete: (id: string) => request<void>(`/api/dpr/rates/${id}`, 'DELETE')
        },
        projects: {
            getAll: () => request<DPRProject[]>('/api/dpr/projects'),
            add: (name: string, contractor_name: string) => request<DPRProject>('/api/dpr/projects', 'POST', { name, contractor_name }),
            delete: (id: string) => request<void>(`/api/dpr/projects/${id}`, 'DELETE')
        },
        works: {
            getAll: () => request<DPRWork[]>('/api/dpr/works'),
            add: (name: string) => request<DPRWork>('/api/dpr/works', 'POST', { name }),
            delete: (id: string) => request<void>(`/api/dpr/works/${id}`, 'DELETE')
        },
        entries: {
            getAll: (projectId: string) => request<DPREntry[]>(`/api/dpr/entries?projectId=${projectId}`),
            add: (data: Omit<DPREntry, 'id'>) => request<DPREntry>('/api/dpr/entries', 'POST', data),
            update: (id: string, data: Partial<DPREntry>) => request<void>(`/api/dpr/entries/${id}`, 'PUT', data),
            delete: (id: string) => request<void>(`/api/dpr/entries/${id}`, 'DELETE')
        }
    }
};
