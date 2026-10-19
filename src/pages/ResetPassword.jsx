import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import CustomCursor from '../components/CustomCursor';
import FloatingLabelInput from '../components/FloatingLabelInput';
import { usePageTitle } from '../hooks/usePageTitle';
import { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE } from '../lib/validation';

const ResetPassword = () => {
    usePageTitle('Reset Password');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    // null = still checking, true/false = whether the recovery link produced a session.
    // Opening this page directly (or with an expired/used link) has no session, and the
    // updateUser call would then fail with a cryptic "Auth session missing!" only after the
    // person had typed a new password.
    const [hasRecoverySession, setHasRecoverySession] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;

        // The recovery token in the URL is exchanged asynchronously, so a session can show up
        // slightly after mount - listen for it instead of trusting a single getSession() read.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!cancelled && (event === 'PASSWORD_RECOVERY' || session)) {
                setHasRecoverySession(true);
            }
        });

        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                if (!cancelled && session) setHasRecoverySession(true);
            })
            .catch(() => { /* handled by the timeout below */ });

        const timer = setTimeout(() => {
            if (!cancelled) setHasRecoverySession(prev => prev ?? false);
        }, 2500);

        return () => {
            cancelled = true;
            clearTimeout(timer);
            subscription.unsubscribe();
        };
    }, []);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (loading) return;
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!isStrongPassword(password)) {
            setError(PASSWORD_REQUIREMENTS_MESSAGE);
            return;
        }

        setLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) {
                setError(updateError.message);
                setLoading(false);
            } else {
                // The recovery link logged this browser in; end that session so the person
                // signs in again with the new password instead of being left half-authenticated.
                await supabase.auth.signOut();
                navigate('/auth/verify', { replace: true });
            }
        } catch {
            setError('Something went wrong. Please check your connection and try again.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-mesh px-4 cursor-none relative overflow-hidden">
            <CustomCursor />

            {/* Background decorative elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="floating-orb absolute top-[-10%] left-[-10%] w-96 h-96 bg-pink-300 opacity-40"></div>
                <div className="floating-orb absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-200 opacity-40" style={{ animationDelay: '-5s' }}></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="sticker-card rounded-[3rem] p-8">
                    <div className="text-center mb-8">
                        <motion.h1
                            className="font-['Fredoka'] text-4xl font-bold text-[#ff4d7d] mb-2"
                            style={{ willChange: "transform", translateZ: 30 }}
                            animate={{ y: [0, -4, 0] }}
                            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                        >
                            Reset Password 🔑
                        </motion.h1>
                        <p className="font-['Quicksand'] text-gray-600 font-semibold">Enter your new password</p>
                    </div>

                    {hasRecoverySession === false && (
                        <div role="alert" className="font-['Quicksand'] bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold mb-6">
                            This reset link is invalid or has expired.{' '}
                            <Link to="/auth/forgot-password" className="underline font-bold">Request a new one</Link>
                        </div>
                    )}

                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <div>
                            <FloatingLabelInput
                                label="New Password"
                                type={showPassword ? "text" : "password"}
                                name="new-password"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                hasEndAdornment
                                endAdornment={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors focus:outline-none ${showPassword ? 'text-pink-500' : 'text-gray-400 md:hover:text-pink-500'}`}
                                    >
                                        <span className="material-symbols-outlined text-lg" aria-hidden="true">
                                            {showPassword ? 'favorite' : 'favorite_border'}
                                        </span>
                                    </button>
                                }
                            />
                        </div>

                        <div>
                            <FloatingLabelInput
                                label="Confirm New Password"
                                type={showConfirmPassword ? "text" : "password"}
                                name="confirm-new-password"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                hasEndAdornment
                                endAdornment={
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors focus:outline-none ${showConfirmPassword ? 'text-pink-500' : 'text-gray-400 md:hover:text-pink-500'}`}
                                    >
                                        <span className="material-symbols-outlined text-lg" aria-hidden="true">
                                            {showConfirmPassword ? 'favorite' : 'favorite_border'}
                                        </span>
                                    </button>
                                }
                            />
                        </div>

                        {error && (
                            <div role="alert" className="font-['Quicksand'] bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || hasRecoverySession === false}
                            className="bubbly-yes w-full py-4 rounded-[2rem] text-xl font-['Fredoka'] text-white uppercase tracking-wider transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                        >
                            <span className="flex items-center justify-center gap-2">
                                {loading ? 'Resetting...' : 'Reset Password'}
                                {!loading && <span className="material-symbols-outlined text-2xl">check_circle</span>}
                            </span>
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="font-['Quicksand'] text-gray-600 font-semibold">
                            Changed your mind?{' '}
                            <Link to="/auth/verify" className="text-[#ff4d7d] font-bold hover:underline">
                                Back to Login
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ResetPassword;
