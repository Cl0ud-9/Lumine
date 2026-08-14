import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import CustomCursor from '../components/CustomCursor';
import FloatingLabelInput from '../components/FloatingLabelInput';
import { usePageTitle } from '../hooks/usePageTitle';

const Signup = () => {
    usePageTitle('Sign Up');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            setError('Password must be at least 8 characters and include uppercase, number, and special character');
            setLoading(false);
            return;
        }

        const { error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
        } else {
            navigate('/auth/email-confirmation');
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
                            transition={{
                                repeat: Infinity,
                                duration: 3.5,
                                ease: "easeInOut",
                                delay: 0.6
                            }}
                        >
                            Create Account 💝
                        </motion.h1>
                        <p className="font-['Quicksand'] text-gray-600 font-semibold">Start creating romantic proposals</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-6">
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

                        <div>
                            <FloatingLabelInput
                                label="Password"
                                type={showPassword ? "text" : "password"}
                                name="password"
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
                                label="Confirm Password"
                                type={showConfirmPassword ? "text" : "password"}
                                name="confirm-password"
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
                            <div className="font-['Quicksand'] bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="bubbly-yes w-full py-4 rounded-[2rem] text-xl font-['Fredoka'] text-white uppercase tracking-wider transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                        >
                            <span className="flex items-center justify-center gap-2">
                                {loading ? 'Creating account...' : 'Sign Up'}
                                {!loading && <span className="material-symbols-outlined text-2xl">favorite</span>}
                            </span>
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="font-['Quicksand'] text-gray-600 font-semibold">
                            Already have an account?{' '}
                            <Link to="/auth/verify" className="text-[#ff4d7d] font-bold hover:underline">
                                Login
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Signup;
