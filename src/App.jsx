import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import LoadingScreen from './components/LoadingScreen';
import Proposal from './pages/Proposal';
import CircularTransition from './components/CircularTransition';
import CustomCursor from './components/CustomCursor';
import { AnimatePresence, LazyMotion } from 'framer-motion';

// Framer Motion's animation engine is loaded as a separate chunk (every animated element in the
// app is an `m.*` component, which only needs the features once they arrive) instead of being
// bundled into the entry - roughly 20KB less JavaScript to download and parse before first paint.
// `strict` makes a stray `motion.*` import throw in development rather than silently re-bundling
// the full library.
const loadMotionFeatures = () => import('./lib/motionFeatures').then((mod) => mod.default);

// Code-split everything that isn't needed to show the proposal - a recipient opening a shared
// link should never download the dashboard or auth bundle. The celebration screen is only
// reached after "Yes", so it loads separately (and is prefetched below while the proposal is up).
const loadCelebration = () => import('./pages/Celebration');
const Celebration = lazy(loadCelebration);
const AdminRoute = lazy(() => import('./components/AdminRoute'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const EmailConfirmation = lazy(() => import('./pages/EmailConfirmation'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

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

    // Warm the celebration chunk during the (4.5s) intro so it is already cached when "Yes" is
    // clicked - otherwise the screen after Yes could flash empty while the chunk downloads.
    useEffect(() => {
        loadCelebration();
    }, []);

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
                        <Suspense key="celebration" fallback={null}>
                            <Celebration />
                        </Suspense>
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
            <LazyMotion features={loadMotionFeatures} strict>
                <BrowserRouter>
                    <Suspense fallback={null}>
                        <Routes>
                            <Route path="/auth/verify" element={<Login />} />
                            <Route path="/auth/register" element={<Signup />} />
                            <Route path="/auth/email-confirmation" element={<EmailConfirmation />} />
                            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                            <Route path="/auth/reset-password" element={<ResetPassword />} />
                            <Route path="/admin/analytics" element={<AdminRoute />} />
                            <Route path="/" element={<ProposalFlow />} />
                            <Route path="*" element={<NotFoundRedirect />} />
                        </Routes>
                    </Suspense>
                </BrowserRouter>
            </LazyMotion>
        </AppProvider>
    );
}

export default App;
