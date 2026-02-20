import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import CustomCursor from '../components/CustomCursor';
import HelpModal from '../components/HelpModal';
import Toast from '../components/Toast';

const Dashboard = () => {
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadProgress, setLoadProgress] = useState(0);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [recipientName, setRecipientName] = useState('');
    const [creating, setCreating] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '' });
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });
    const [deleteAccountModal, setDeleteAccountModal] = useState(false);

    const navigate = useNavigate();
    const channelRef = useRef(null);
    const userIdRef = useRef(null);
    const progressTimerRef = useRef(null);

    // Stable fetch function that doesn't cause re-subscriptions
    const fetchInvites = useCallback(async (showLoading = true) => {
        if (showLoading) {
            setLoading(true);
            setLoadProgress(0);
            // Tick up steadily — capped at 90 — so there's always visible movement
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = setInterval(() => {
                setLoadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressTimerRef.current);
                        return 90;
                    }
                    return prev + 8;
                });
            }, 150);
        }
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            navigate('/auth/verify');
            return;
        }

        userIdRef.current = user.id;

        const { data, error } = await supabase
            .from('invites')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching invites:', error);
        } else {
            setInvites(data || []);
        }
        if (showLoading) {
            // Stop the ticker, snap to 100%, then let the dashboard appear
            clearInterval(progressTimerRef.current);
            setLoadProgress(100);
            setTimeout(() => setLoading(false), 250);
        }
    }, [navigate]);

    useEffect(() => {
        // Initial fetch
        fetchInvites();

        // Set up Supabase Realtime subscription
        const setupRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            channelRef.current = supabase
                .channel('dashboard-invites')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'invites',
                        filter: `user_id=eq.${user.id}`
                    },
                    (payload) => {
                        console.log('Realtime update:', payload.eventType);
                        // Re-fetch all invites on any change for consistency
                        fetchInvites(false);
                    }
                )
                .subscribe();
        };

        setupRealtime();

        // Refresh when tab regains focus (fallback for missed events)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchInvites(false);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(progressTimerRef.current);
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [fetchInvites]);

    // Scroll Lock Effect
    useEffect(() => {
        if (showCreateForm || showHelpModal || deleteModal.show || deleteAccountModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showCreateForm, showHelpModal, deleteModal.show, deleteAccountModal]);



    const createInvite = async (e) => {
        e.preventDefault();
        setCreating(true);

        const { data: { user } } = await supabase.auth.getUser();
        const token = crypto.randomUUID();

        const { error } = await supabase
            .from('invites')
            .insert({
                token,
                user_id: user.id,
                recipient_name: recipientName,
                total_visits: 0,
                used: false
            });

        if (error) {
            console.error('Error creating invite:', error);
            setToast({ show: true, message: 'Failed to create URL' });
        } else {
            setRecipientName('');
            setShowCreateForm(false);
            fetchInvites();
            setToast({ show: true, message: 'URL created successfully!' });
        }
        setCreating(false);
    };

    const copyUrl = (token) => {
        const url = `${window.location.origin}/?token=${token}`;
        const message = `There’s something I’ve been wanting to tell you… \n${url}`;
        navigator.clipboard.writeText(message);
        setToast({ show: true, message: 'URL and message copied!' });
    };

    const deleteInvite = (id, name) => {
        setDeleteModal({ show: true, id, name });
    };

    const confirmDelete = async () => {
        const id = deleteModal.id;
        setDeleteModal({ show: false, id: null, name: '' }); // Close immediately for responsiveness

        const { error } = await supabase
            .from('invites')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting invite:', error);
            setToast({ show: true, message: 'Failed to delete URL' });
        } else {
            fetchInvites();
            setToast({ show: true, message: 'URL deleted successfully' });
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/auth/verify');
    };

    const handleDeleteAccount = async () => {
        setDeleteAccountModal(false);

        // 1. Delete all user's invites
        const { error: deleteError } = await supabase
            .from('invites')
            .delete()
            .eq('user_id', userIdRef.current);

        if (deleteError) {
            console.error('Error deleting data:', deleteError);
            setToast({ show: true, message: 'Failed to delete data. Please try again.' });
            return;
        }

        // 2. Sign out
        await supabase.auth.signOut();
        navigate('/auth/verify');
    };

    // Format date with seconds
    const formatDateTime = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    // Format relative time
    const formatRelativeTime = (dateString) => {
        if (!dateString) return null;
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;

        // Guard against future timestamps (clock skew)
        if (diffMs < 0) return 'Just now';

        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    // Calculate time to yes
    const calculateTimeToYes = (firstOpened, firstYes, usedAt) => {
        const end = firstYes || usedAt;
        if (!firstOpened || !end) return null;
        const diff = new Date(end) - new Date(firstOpened);

        // Guard: if diff is negative or zero (clock skew / instant click), show "Instant"
        if (diff <= 0) return 'Instant ⚡';

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        if (seconds > 0) return `${seconds}s`;
        return 'Instant ⚡';
    };

    // Format duration in ms to readable string
    const formatDuration = (ms) => {
        if (ms <= 0) return 'Instant ⚡';
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        if (seconds > 0) return `${seconds}s`;
        return 'Instant ⚡';
    };

    // Calculate stats
    const stats = {
        total: invites.length,
        yesCount: invites.filter(i => i.used).length,
        successRate: invites.length > 0 ? Math.round((invites.filter(i => i.used).length / invites.length) * 100) : 0,
        fastestYes: (() => {
            const yesInvites = invites.filter(i => i.used && i.first_opened_at && (i.first_yes_at || i.used_at));
            if (yesInvites.length === 0) return '-';

            // Calculate duration for each invite, filtering out invalid (negative) values
            const durations = yesInvites
                .map(i => {
                    const endTime = new Date(i.first_yes_at || i.used_at);
                    const startTime = new Date(i.first_opened_at);
                    return endTime - startTime;
                })
                .filter(d => d >= 0); // Remove any negative durations (clock skew)

            if (durations.length === 0) return 'Instant ⚡';

            const minDuration = Math.min(...durations);
            return formatDuration(minDuration);
        })()
    };

    // Group invites by status
    const waitingInvites = invites.filter(i => !i.first_opened_at);
    const yesInvites = invites.filter(i => i.used);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-mesh cursor-none relative overflow-hidden">
                <CustomCursor />

                {/* Background decorative elements */}
                <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="floating-orb absolute top-[-10%] left-[-10%] w-96 h-96 bg-pink-300 opacity-40"></div>
                    <div className="floating-orb absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-200 opacity-40" style={{ animationDelay: '-5s' }}></div>
                </div>

                <div className="text-center relative z-10">
                    <div className="relative animate-heartbeat mb-8">
                        <div className="w-24 h-24 md:w-32 md:h-32 glossy-bubble-heart rounded-full flex items-center justify-center mx-auto">
                            <span className="material-symbols-outlined text-[48px] md:text-[64px] text-white">
                                favorite
                            </span>
                        </div>
                    </div>
                    <p className="font-['Quicksand'] text-gray-600 font-semibold mb-6">Loading your dashboard...</p>

                    {/* Progress Bar */}
                    <div className="max-w-xs mx-auto">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 rounded-full"
                                initial={{ width: '0%' }}
                                animate={{ width: `${loadProgress}%` }}
                                transition={{
                                    duration: 0.15,
                                    ease: "easeOut",
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-mesh py-6 sm:py-8 px-3 sm:px-4 cursor-none relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="floating-orb absolute top-[-10%] left-[-10%] w-96 h-96 bg-pink-300 opacity-40"></div>
                <div className="floating-orb absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-200 opacity-40" style={{ animationDelay: '-5s' }}></div>
            </div>
            <CustomCursor />
            <Toast
                message={toast.message}
                isVisible={toast.show}
                onClose={() => setToast({ show: false, message: '' })}
            />

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
                    <div>
                        <motion.h1
                            className="font-['Fredoka'] text-2xl sm:text-3xl md:text-4xl font-bold text-[#ff4d7d] mb-1 sm:mb-2"
                            style={{ willChange: "transform", transform: "translateZ(30px)" }}
                            animate={{ y: [0, -4, 0] }}
                            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                        >
                            <span className="flex items-center gap-2">
                                <img src="/favicon.png" alt="Lumine Logo" className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain" />
                                Lumine Dashboard
                            </span>
                        </motion.h1>
                        <p className="font-['Quicksand'] text-xs sm:text-base text-gray-600 font-semibold">
                            Manage your romantic proposals
                        </p>
                    </div>
                    <div className="flex gap-3 sm:gap-4 w-full sm:w-auto">
                        <motion.button
                            whileHover={{ scale: 1.05, rotate: 2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowHelpModal(true)}
                            className="flex-1 sm:flex-none justify-center font-['Quicksand'] px-4 sm:px-6 py-2 bg-white/40 backdrop-blur-md border-[3px] border-white shadow-lg rounded-2xl text-pink-500 font-bold flex items-center gap-2 hover:bg-white/60 transition-all text-sm sm:text-base"
                            style={{ transform: "rotate(1deg)" }}
                        >
                            <span className="material-symbols-outlined text-lg sm:text-xl fill-1">lightbulb</span>
                            <span>Guide</span>
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05, rotate: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleLogout}
                            className="flex-1 sm:flex-none justify-center font-['Quicksand'] px-4 sm:px-6 py-2 sticker-card rounded-2xl text-gray-600 font-bold hover:text-gray-800 transition-all text-sm sm:text-base"
                        >
                            Logout
                        </motion.button>
                    </div>
                </div>

                <HelpModal show={showHelpModal} onClose={() => setShowHelpModal(false)} />

                {/* Summary Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[3rem] p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-fuchsia-400 to-fuchsia-500 shadow-xl"
                    >
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <div className="font-['Quicksand'] text-white/90 text-[10px] sm:text-xs lg:text-sm font-semibold uppercase tracking-wide">Total URLs</div>
                            <span className="material-symbols-outlined text-lg sm:text-2xl lg:text-3xl text-white/80 -rotate-45">link</span>
                        </div>
                        <div className="font-['Fredoka'] text-xl sm:text-3xl lg:text-4xl font-bold text-white">{stats.total}</div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[3rem] p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-pink-400 to-pink-500 shadow-xl"
                    >
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <div className="font-['Quicksand'] text-white/90 text-[10px] sm:text-xs lg:text-sm font-semibold uppercase tracking-wide">Success Rate</div>
                            <span className="material-symbols-outlined text-lg sm:text-2xl lg:text-3xl text-white/80">favorite</span>
                        </div>
                        <div className="font-['Fredoka'] text-xl sm:text-3xl lg:text-4xl font-bold text-white">{stats.successRate}%</div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="col-span-2 lg:col-span-1 rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[3rem] p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-purple-400 to-purple-500 shadow-xl"
                    >
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <div className="font-['Quicksand'] text-white/90 text-[10px] sm:text-xs lg:text-sm font-semibold uppercase tracking-wide">Fastest Yes</div>
                            <span className="material-symbols-outlined text-lg sm:text-2xl lg:text-3xl text-white/80">bolt</span>
                        </div>
                        <div className="font-['Fredoka'] text-xl sm:text-3xl lg:text-4xl font-bold text-white">{stats.fastestYes}</div>
                    </motion.div>
                </div>

                {/* Create Button */}
                <motion.button
                    whileHover={{ scale: 1.01, y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setShowCreateForm(true)}
                    className="bubbly-yes w-full mb-8 sm:mb-10 py-3 sm:py-5 rounded-[2rem] sm:rounded-[2.5rem] font-['Fredoka'] text-white text-base sm:text-lg uppercase tracking-wider shadow-2xl hover:shadow-pink-200 transition-all font-semibold"
                >
                    <span className="flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-xl sm:text-2xl">add_circle</span>
                        Create New Proposal URL
                    </span>
                </motion.button>

                {/* Create Form Modal */}
                <AnimatePresence>
                    {showCreateForm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShowCreateForm(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 rounded-[3rem] p-8 max-w-md w-full shadow-2xl border-4 border-white"
                            >
                                <h2 className="font-['Fredoka'] text-3xl font-bold mb-6 text-[#ff4d7d] flex items-center gap-2">
                                    Create New URL
                                    <span className="material-symbols-outlined text-3xl">favorite</span>
                                </h2>
                                <form onSubmit={createInvite}>
                                    <label className="font-['Quicksand'] block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                        Recipient Name
                                    </label>
                                    <input
                                        type="text"
                                        value={recipientName}
                                        onChange={(e) => setRecipientName(e.target.value)}
                                        required
                                        placeholder="e.g., Sakshi"
                                        className="font-['Quicksand'] w-full px-5 py-4 rounded-2xl border-2 border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition mb-6 text-lg"
                                    />
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateForm(false)}
                                            className="font-['Quicksand'] flex-1 px-4 py-4 border-2 border-gray-300 rounded-2xl hover:bg-gray-50 transition font-semibold"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={creating}
                                            className="bubbly-yes flex-1 py-4 rounded-[2rem] font-['Fredoka'] text-white font-semibold uppercase tracking-wider transition disabled:opacity-50"
                                        >
                                            {creating ? 'Creating...' : 'Create'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Delete Confirmation Modal */}
                <AnimatePresence>
                    {deleteModal.show && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, rotate: -2 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white/90 backdrop-blur-md rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border-4 border-white text-center relative overflow-hidden"
                            >
                                <div className="mb-6 flex justify-center">
                                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl text-red-500">heart_broken</span>
                                    </div>
                                </div>
                                <motion.h3
                                    className="font-['Fredoka'] text-2xl font-bold text-gray-800 mb-3"
                                    style={{ willChange: "transform", transform: "translateZ(30px)" }}
                                    animate={{ y: [0, -4, 0] }}
                                    transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                                >
                                    Take it back? 🙈
                                </motion.h3>
                                <p className="font-['Quicksand'] text-gray-500 font-semibold mb-8 leading-relaxed">
                                    The link for <span className="text-pink-500 font-bold">{deleteModal.name}</span> will disappear forever. Like it never happened! 🤫
                                </p>
                                <div className="flex gap-3">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                                        className="flex-1 py-3 rounded-2xl font-['Quicksand'] font-bold text-gray-600 bg-gray-100 border-2 border-transparent hover:bg-white hover:border-pink-200 transition-all shadow-sm"
                                    >
                                        Nah, keep it
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={confirmDelete}
                                        className="flex-1 py-3 rounded-2xl font-['Fredoka'] font-bold text-white bubbly-delete text-lg tracking-wide uppercase shadow-lg hover:shadow-red-200"
                                    >
                                        Vanish it
                                    </motion.button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Delete Account Confirmation Modal */}
                <AnimatePresence>
                    {deleteAccountModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setDeleteAccountModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, rotate: 2 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white/90 backdrop-blur-md rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border-4 border-red-50 text-center relative overflow-hidden"
                            >
                                <div className="mb-6 flex justify-center">
                                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl text-red-500">warning</span>
                                    </div>
                                </div>
                                <motion.h3
                                    className="font-['Fredoka'] text-2xl font-bold text-gray-800 mb-3"
                                    style={{ willChange: "transform", transform: "translateZ(30px)" }}
                                    animate={{ y: [0, -4, 0] }}
                                    transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                                >
                                    Breaking up with us? 💔
                                </motion.h3>
                                <p className="font-['Quicksand'] text-gray-500 font-semibold mb-8 leading-relaxed">
                                    We{"'"}ll miss you! All your love letters and links will be lost in space forever. Are you sure? 🚀
                                </p>
                                <div className="flex gap-3">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setDeleteAccountModal(false)}
                                        className="flex-1 py-3 rounded-2xl font-['Quicksand'] font-bold text-gray-600 bg-gray-100 border-2 border-transparent hover:bg-white hover:border-red-200 transition-all shadow-sm"
                                    >
                                        I{"'"}ll stay
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleDeleteAccount}
                                        className="flex-1 py-3 rounded-2xl font-['Fredoka'] font-bold text-white bubbly-delete text-lg tracking-wide uppercase shadow-lg hover:shadow-red-200"
                                    >
                                        Delete Forever
                                    </motion.button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* URLs List by Status */}
                <div className="space-y-10">
                    {/* Waiting Section */}
                    {waitingInvites.length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="h-1 w-12 bg-gradient-to-r from-gray-300 to-transparent rounded-full"></div>
                                <h2 className="font-['Fredoka'] text-2xl font-bold text-gray-700 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-2xl text-gray-500">mail</span> <span>Waiting</span>
                                    <span className="text-sm font-normal bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{waitingInvites.length}</span>
                                </h2>
                                <div className="flex-1 h-1 bg-gradient-to-r from-transparent to-gray-200 rounded-full"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {waitingInvites.map((invite) => (
                                    <InviteCard
                                        key={invite.id}
                                        invite={invite}
                                        onCopy={copyUrl}
                                        onDelete={deleteInvite}
                                        formatDateTime={formatDateTime}
                                        formatRelativeTime={formatRelativeTime}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pending Section */}
                    {invites.filter(i => i.first_opened_at && !i.used).length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="h-1 w-12 bg-gradient-to-r from-yellow-400 to-transparent rounded-full"></div>
                                <h2 className="font-['Fredoka'] text-2xl font-bold text-gray-700 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-2xl text-yellow-600">visibility</span> <span>Pending</span>
                                    <span className="text-sm font-normal bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">{invites.filter(i => i.first_opened_at && !i.used).length}</span>
                                </h2>
                                <div className="flex-1 h-1 bg-gradient-to-r from-transparent to-yellow-200 rounded-full"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {invites.filter(i => i.first_opened_at && !i.used).map((invite) => (
                                    <InviteCard
                                        key={invite.id}
                                        invite={invite}
                                        onCopy={copyUrl}
                                        onDelete={deleteInvite}
                                        formatDateTime={formatDateTime}
                                        formatRelativeTime={formatRelativeTime}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Yes Section */}
                    {yesInvites.length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="h-1 w-12 bg-gradient-to-r from-pink-500 to-transparent rounded-full"></div>
                                <h2 className="font-['Fredoka'] text-2xl font-bold text-gray-700 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-2xl text-pink-500">favorite</span> <span>Yes!</span>
                                    <span className="text-sm font-normal bg-pink-100 text-pink-700 px-3 py-1 rounded-full">{yesInvites.length}</span>
                                </h2>
                                <div className="flex-1 h-1 bg-gradient-to-r from-transparent to-pink-200 rounded-full"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {yesInvites.map((invite) => (
                                    <InviteCard
                                        key={invite.id}
                                        invite={invite}
                                        onCopy={copyUrl}
                                        onDelete={deleteInvite}
                                        formatDateTime={formatDateTime}
                                        formatRelativeTime={formatRelativeTime}
                                        calculateTimeToYes={calculateTimeToYes}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {invites.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-20"
                        >
                            <span className="material-symbols-outlined text-8xl text-gray-300 mb-6">mail</span>
                            <div className="font-['Fredoka'] text-2xl font-bold text-gray-700 mb-2">No URLs Yet</div>
                            <div className="font-['Quicksand'] text-gray-500 font-semibold">Create your first romantic proposal above!</div>
                        </motion.div>
                    )}
                </div>

                {/* Danger Zone */}
                <div className="mt-12 sm:mt-16 pt-8 border-t-2 border-red-100">
                    <h3 className="font-['Fredoka'] text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined">warning</span> Danger Zone
                    </h3>
                    <div className="bg-red-50 rounded-[2rem] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-2 border-red-100">
                        <div>
                            <h4 className="font-['Fredoka'] text-lg font-bold text-red-500 mb-1">Break up with us? 💔</h4>
                            <p className="font-['Quicksand'] text-sm text-red-400 font-semibold max-w-md">
                                We get it, sometimes things just don{"'"}t work out. This will delete your account and all data. No hard feelings! (But it{"'"}s permanent!)
                            </p>
                        </div>
                        <button
                            onClick={() => setDeleteAccountModal(true)}
                            className="bubbly-delete px-6 py-3 rounded-2xl font-['Fredoka'] text-white font-semibold uppercase tracking-wide hover:shadow-lg transition-all active:scale-95"
                        >
                            Delete Forever
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Invite Card Component
const InviteCard = ({ invite, onCopy, onDelete, formatDateTime, formatRelativeTime, calculateTimeToYes }) => {
    const isPending = invite.first_opened_at && !invite.used;
    const isYes = invite.used;
    const [showVisitDetails, setShowVisitDetails] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4 }}
            className={`sticker-card rounded-[3rem] p-6 border-2 transition-all ${isYes ? 'border-pink-200 hover:border-pink-300 hover:shadow-pink-100' :
                isPending ? 'border-yellow-200 hover:border-yellow-300 hover:shadow-yellow-100' :
                    'border-gray-200 hover:border-gray-300'
                }`}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                        <h3 className="font-['Fredoka'] text-2xl font-bold text-gray-800">
                            {invite.recipient_name}
                        </h3>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                            {formatDateTime(invite.created_at)}
                        </span>
                    </div>
                    <span className={`font-['Quicksand'] inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${isYes ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' :
                        isPending ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                        {isYes ? (
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">favorite</span> Yes!
                            </span>
                        ) : isPending ? (
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">visibility</span> Opened
                            </span>
                        ) : (
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">mail</span> Waiting
                            </span>
                        )}
                    </span>
                </div>
                <button
                    onClick={() => onDelete(invite.id, invite.recipient_name)}
                    className="text-gray-300 hover:text-red-500 transition text-xl"
                >
                    <span className="material-symbols-outlined text-xl">delete</span>
                </button>
            </div>

            {/* Stats Bar (Horizontal) */}
            <div className="flex gap-3 mb-5 flex-wrap">
                <button
                    onClick={() => setShowVisitDetails(!showVisitDetails)}
                    className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                >
                    <span className="material-symbols-outlined text-sm text-gray-400">bar_chart</span>
                    <div>
                        <div className="font-['Quicksand'] text-xs text-gray-500 font-semibold">Visits</div>
                        <div className="font-['Fredoka'] text-sm font-bold text-gray-800">{invite.total_visits}</div>
                    </div>
                    <motion.span
                        animate={{ rotate: showVisitDetails ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-gray-400 text-sm ml-1"
                    >
                        ▼
                    </motion.span>
                </button>

                {(isPending || isYes) && invite.first_opened_at && (
                    <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-xl">
                        <span className="material-symbols-outlined text-sm text-purple-400">schedule</span>
                        <div>
                            <div className="font-['Quicksand'] text-xs text-purple-600 font-semibold">Last Visit</div>
                            <div className="font-['Fredoka'] text-sm font-bold text-purple-700">
                                {formatRelativeTime(
                                    invite.visit_timestamps && invite.visit_timestamps.length > 0
                                        ? invite.visit_timestamps[invite.visit_timestamps.length - 1]
                                        : invite.first_opened_at
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Expandable Visit Timeline */}
            <AnimatePresence>
                {showVisitDetails && invite.visit_timestamps && invite.visit_timestamps.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden mb-5"
                    >
                        <div className="bg-gradient-to-r from-gray-50 to-purple-50/30 rounded-2xl p-4 border border-gray-100">
                            <div className="font-['Quicksand'] text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">history</span> Visit History
                            </div>
                            <div className="custom-scrollbar-wrapper">
                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                    {[...invite.visit_timestamps].reverse().map((timestamp, index) => (
                                        <div key={index} className="flex items-center gap-2 text-sm">
                                            <span className="text-purple-400 text-xs">•</span>
                                            <span className="text-gray-700 font-medium">
                                                {formatDateTime(timestamp)}
                                            </span>
                                            {index === 0 && (
                                                <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-semibold">
                                                    Latest
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* No Clicks Counter */}
                            {invite.no_clicks > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="material-symbols-outlined text-2xl text-gray-400">block</span>
                                        <span className="text-gray-700 font-semibold">
                                            Clicked {"\""}No{"\""} <span className="text-pink-600 font-bold">{invite.no_clicks}</span> time{invite.no_clicks !== 1 ? 's' : ''}!
                                        </span>
                                        {invite.no_clicks > 10 && <span className="material-symbols-outlined text-lg text-yellow-500">sentiment_satisfied</span>}
                                        {invite.no_clicks > 20 && <span className="material-symbols-outlined text-lg text-yellow-600">sentiment_very_satisfied</span>}
                                    </div>
                                </div>
                            )}

                            {/* Yes History (if multiple) */}
                            {invite.yes_timestamps && invite.yes_timestamps.length > 1 && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="text-xs font-semibold text-pink-600 uppercase tracking-wide mb-2 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">favorite</span> {"\""}Yes{"\""} History
                                    </div>
                                    <div className="custom-scrollbar-wrapper">
                                        <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                            {[...invite.yes_timestamps].reverse().map((timestamp, index) => (
                                                <div key={index} className="flex items-center gap-2 text-sm">
                                                    <span className="material-symbols-outlined text-xs text-pink-300">favorite</span>
                                                    <span className="text-gray-600 font-medium text-xs">
                                                        {formatDateTime(timestamp)}
                                                    </span>
                                                    {index === 0 && (
                                                        <span className="text-[10px] bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full font-bold">
                                                            Latest
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Timeline Section (Only for opened/yes URLs) */}
            {(invite.first_opened_at || invite.used) && (
                <>
                    <div className="font-['Quicksand'] text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Timeline</div>
                    <div className="space-y-2 mb-5 pl-4 border-l-2 border-gray-200">
                        {invite.first_opened_at && (
                            <div className="flex items-baseline gap-2">
                                <span className="text-xs text-gray-400">├</span>
                                <div className="flex-1">
                                    <span className="text-xs text-gray-500">First Opened:</span>
                                    <span className="text-sm font-semibold text-gray-700 ml-2">{formatDateTime(invite.first_opened_at)}</span>
                                </div>
                            </div>
                        )}

                        {invite.used && (
                            <>
                                {/* First Yes */}
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs text-pink-400">├</span>
                                    <div className="flex-1">
                                        <span className="text-xs text-gray-500">First Yes:</span>
                                        <span className="text-sm font-semibold text-pink-600 ml-2">
                                            {formatDateTime(invite.first_yes_at || invite.used_at)}
                                        </span>
                                    </div>
                                </div>



                                {/* Time to Yes */}
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs text-purple-400">└</span>
                                    <div className="flex-1">
                                        <span className="text-xs text-gray-500">Time to Yes:</span>
                                        <span className="text-sm font-semibold text-purple-600 ml-2">
                                            {calculateTimeToYes(invite.first_opened_at, invite.first_yes_at, invite.used_at)}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Copy Button */}
            <button
                onClick={() => onCopy(invite.token)}
                className="bubbly-copy w-full py-4 rounded-[2rem] font-['Fredoka'] text-white font-semibold uppercase tracking-wider transition shadow-lg hover:shadow-xl"
            >
                Copy URL
            </button>
        </motion.div>
    );
};

// Unused TimelineItem removed

export default Dashboard;
