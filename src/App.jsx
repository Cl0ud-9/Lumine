import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { supabase } from './lib/supabaseClient';
import LoadingScreen from './components/LoadingScreen';
import Proposal from './pages/Proposal';
import Celebration from './pages/Celebration';
import CircularTransition from './components/CircularTransition';
import CustomCursor from './components/CustomCursor';
import { AnimatePresence } from 'framer-motion';

// Code-split everything that isn't part of the "/" proposal flow - a recipient opening a
// shared link should only ever download Proposal/Celebration, never the dashboard or auth bundle.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const EmailConfirmation = lazy(() => import('./pages/EmailConfirmation'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

const ProtectedRoute = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/auth/verify" replace />;
    }

    return children;
};

const ProposalFlow = () => {
    const { currentStep, setStep } = useApp();
    const [showCircle, setShowCircle] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const triggerCircularTransition = (callback) => {
        setShowCircle(true);
        setTimeout(() => {
            callback();

            setTimeout(() => {
                setShowCircle(false);
            }, 2000);
        }, 1200);
    };

    return (
        <div className="min-h-screen font-inter selection:bg-pink-200 selection:text-pink-900 overflow-hidden relative cursor-none">
            <CustomCursor />
            {/* Note: no ambient MagicalBackground layer here - Proposal/Celebration/LoadingScreen
                all paint their own fully opaque backgrounds over this container, so anything
                rendered behind them is invisible. Keeping it mounted only burned CPU/GPU on
                animations nobody could ever see. */}
            <div className="relative z-10 w-full">
                {showCircle && <CircularTransition isVisible={showCircle} isMobile={isMobile} />}

                <AnimatePresence mode='wait'>
                    {currentStep === 'intro' && (
                        <LoadingScreen key="loading" onComplete={() => triggerCircularTransition(() => setStep('proposal'))} />
                    )}
                    {currentStep === 'proposal' && (
                        <Proposal key="proposal" onTransition={triggerCircularTransition} />
                    )}
                    {currentStep === 'celebration' && (
                        <Celebration key="celebration" />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

function App() {
    return (
        <AppProvider>
            <BrowserRouter>
                <Suspense fallback={null}>
                    <Routes>
                        <Route path="/auth/verify" element={<Login />} />
                        <Route path="/auth/register" element={<Signup />} />
                        <Route path="/auth/email-confirmation" element={<EmailConfirmation />} />
                        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                        <Route path="/auth/reset-password" element={<ResetPassword />} />
                        <Route path="/admin/analytics" element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        } />
                        <Route path="/" element={<ProposalFlow />} />
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </AppProvider>
    );
}

export default App;
