import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import CustomCursor from '../components/CustomCursor';
import FloatingLabelInput from '../components/FloatingLabelInput';
import { usePageTitle } from '../hooks/usePageTitle';

const Login = () => {
    usePageTitle('Login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
        } else {
            navigate('/admin/analytics');
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
                            Welcome Back ! 💗
                        </motion.h1>
                        <p className="font-['Quicksand'] text-gray-600 font-semibold">Login to manage your proposals</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
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
                                autoComplete="current-password"
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
                            <div className="text-right mt-2">
                                <Link to="/auth/forgot-password" className="font-['Quicksand'] text-sm text-[#ff4d7d] font-semibold hover:underline">
                                    Forgot Password?
                                </Link>
                            </div>
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
                                {loading ? 'Logging in...' : 'Login'}
                                {!loading && <span className="material-symbols-outlined text-2xl">favorite</span>}
                            </span>
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="font-['Quicksand'] text-gray-600 font-semibold">
                            Don{"'"}t have an account?{' '}
                            <Link to="/auth/register" className="text-[#ff4d7d] font-bold hover:underline">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
