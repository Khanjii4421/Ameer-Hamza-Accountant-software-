'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, User as ApiUser } from '@/lib/api';

// Extend ApiUser or use it directly, but ensure Role matches
interface User extends ApiUser { }

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: async () => false,
    logout: () => { },
    isAuthenticated: false,
    loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // Check for persisted session on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('current_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    // Route Protection
    useEffect(() => {
        if (loading) return;
        const isLoginPage = pathname === '/login';

        if (!user && !isLoginPage) {
            router.push('/login');
            return;
        }

        if (user) {
            if (user.role === 'Employee' && !pathname.startsWith('/employee')) {
                router.push('/employee/dashboard');
            } else if (user.role !== 'Employee' && pathname.startsWith('/employee')) {
                router.push('/');
            }
        }
    }, [user, pathname, router, loading]);


    const login = async (username: string, password: string) => {
        try {
            // 1. Fetch all users for login check
            // Note: In a real app, this should be a POST /api/login call
            const users = await api.users.getAll();
            const foundUser = users.find(u =>
                (u.username?.toLowerCase() === username.toLowerCase()) &&
                u.password === password
            );

            if (foundUser) {
                setUser(foundUser);
                localStorage.setItem('current_user', JSON.stringify(foundUser));

                if (foundUser.role === 'Employee') {
                    router.push('/employee/dashboard');
                } else {
                    router.push('/');
                }

                return true;
            }

            return false;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('current_user');
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
