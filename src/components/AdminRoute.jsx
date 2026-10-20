import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Dashboard from '../pages/Dashboard';

// The dashboard route and its auth guard live in ONE lazily-loaded module. That keeps the whole
// Supabase client (~45KB gz) out of the recipient's bundle - it is only fetched when someone
// actually opens the login / dashboard routes - and loads guard + dashboard in parallel instead of
// one chunk waiting on the other.
const ProtectedRoute = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                if (!cancelled) setUser(session?.user ?? null);
            })
            .catch(() => {
                // Can't verify a session (storage/network failure) - treat as signed out
                // instead of leaving the route stuck on the loading state forever.
                if (!cancelled) setUser(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            cancelled = true;
            subscription.unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-mesh font-['Quicksand'] font-semibold text-gray-600" role="status">
                Loading...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth/verify" replace />;
    }

    return children;
};

const AdminRoute = () => (
    <ProtectedRoute>
        <Dashboard />
    </ProtectedRoute>
);

export default AdminRoute;
