import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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

    // Pending transition timers live in refs so they can be cancelled on unmount (otherwise a
    // route change mid-transition would call setState on an unmounted component). Only a
    // transition whose step change is still in flight blocks a new one - the later "hide the
    // circle" timer of a finished transition must not, or a fast "Yes" right after the intro
    // would be silently dropped.
    const stepTimer = useRef(null);
    const hideTimer = useRef(null);

    useEffect(() => () => {
        clearTimeout(stepTimer.current);
        clearTimeout(hideTimer.current);
    }, []);

    const triggerCircularTransition = useCallback((callback) => {
        if (stepTimer.current) return;
        clearTimeout(hideTimer.current);
        setShowCircle(true);
        stepTimer.current = setTimeout(() => {
            stepTimer.current = null;
            callback();
            hideTimer.current = setTimeout(() => setShowCircle(false), 2000);
        }, 1200);
    }, []);

    const handleIntroComplete = useCallback(
        () => triggerCircularTransition(() => setStep('proposal')),
        [triggerCircularTransition, setStep]
    );

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
                        <LoadingScreen key="loading" onComplete={handleIntroComplete} />
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

// Unknown paths used to render a blank page. Send them to the proposal root, keeping the
// query string so a mistyped path that still carries ?token=... still opens the proposal.
const NotFoundRedirect = () => {
    const { search } = useLocation();
    return <Navigate to={{ pathname: '/', search }} replace />;
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
                        <Route path="*" element={<NotFoundRedirect />} />
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </AppProvider>
    );
}

export default App;
