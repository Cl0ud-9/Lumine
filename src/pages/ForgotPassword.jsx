import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { m } from 'framer-motion';
import { Link } from 'react-router-dom';
import CustomCursor from '../components/CustomCursor';
import FloatingLabelInput from '../components/FloatingLabelInput';
import { usePageTitle } from '../hooks/usePageTitle';

const ForgotPassword = () => {
    usePageTitle('Forgot Password');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });

            if (resetError) {
                setError(resetError.message);
            } else {
                setMessage('Password reset email sent! Check your inbox.');
            }
        } catch {
            setError('Something went wrong. Please check your connection and try again.');
        } finally {
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

            <m.main
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="sticker-card rounded-[3rem] p-8 [@media(max-height:500px)]:p-4 [@media(max-height:500px)]:rounded-[2rem]">
                    <div className="text-center mb-8 [@media(max-height:500px)]:mb-3">
                        <m.h1
                            className="font-['Fredoka'] text-4xl [@media(max-height:500px)]:text-2xl font-bold text-[#ff4d7d] mb-2 [@media(max-height:500px)]:mb-1"
                            style={{ willChange: "transform", translateZ: 30 }}
                            animate={{ y: [0, -4, 0] }}
                            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                        >
                            Forgot Password?<span className="material-symbols-outlined ml-1 align-[-0.12em]" aria-hidden="true">lock</span>
                        </m.h1>
                        <p className="font-['Quicksand'] text-gray-600 font-semibold">We{"'"}ll send you a reset link</p>
                    </div>

                    <form onSubmit={handleResetPassword} className="space-y-6 [@media(max-height:500px)]:space-y-2">
                        <div>
                            <FloatingLabelInput
                                label="Email"
                                type="email"
                                name="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <div role="alert" className="font-['Quicksand'] bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div role="status" className="font-['Quicksand'] bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm font-semibold">
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="bubbly-yes w-full py-4 [@media(max-height:500px)]:py-2 rounded-[2rem] text-base sm:text-xl font-['Fredoka'] text-white uppercase tracking-wider transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                        >
                            <span className="flex items-center justify-center gap-2">
                                {loading ? 'Sending...' : 'Send Reset Link'}
                                {!loading && <span aria-hidden="true" className="material-symbols-outlined text-xl sm:text-2xl">mail</span>}
                            </span>
                        </button>
                    </form>

                    <div className="mt-6 [@media(max-height:500px)]:mt-3 text-center">
                        <p className="font-['Quicksand'] text-gray-600 font-semibold">
                            Remember your password?{' '}
                            <Link to="/auth/verify" className="text-[#ff4d7d] font-bold hover:underline">
                                Login
                            </Link>
                        </p>
                    </div>
                </div>
            </m.main>
        </div>
    );
};

export default ForgotPassword;
