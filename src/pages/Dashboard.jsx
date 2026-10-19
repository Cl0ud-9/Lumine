import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import CustomCursor from '../components/CustomCursor';
import HelpModal from '../components/HelpModal';
import Toast from '../components/Toast';
import FloatingLabelInput from '../components/FloatingLabelInput';
import { logger } from '../lib/logger';
import { usePageTitle } from '../hooks/usePageTitle';
import { useEscapeKey } from '../hooks/useEscapeKey';

// Pure formatting helpers live at module scope: they don't depend on component state, so
// they're created once instead of on every render and keep a stable identity when passed
// down to the (memo-friendly) InviteCard.

// Format date with seconds
const formatDateTime = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return null;
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
    const diffMs = Date.now() - new Date(dateString).getTime();

    // Guard against future timestamps (clock skew) and unparseable dates
    if (Number.isNaN(diffMs) || diffMs < 0) return 'Just now';

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

// Format duration in ms to readable string
const formatDuration = (ms) => {
    // Guard: zero / negative (clock skew / instant click) / NaN reads as "Instant"
    if (!(ms > 0)) return 'Instant ⚡';
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

// Calculate time to yes
const calculateTimeToYes = (firstOpened, firstYes, usedAt) => {
    const end = firstYes || usedAt;
    if (!firstOpened || !end) return null;
    return formatDuration(new Date(end) - new Date(firstOpened));
};

// crypto.randomUUID only exists in secure contexts (https / localhost); fall back to
// getRandomValues so creating a link still works when the dashboard is opened over plain
// http on a LAN address during testing.
const generateToken = () => {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
};

// navigator.clipboard is undefined on insecure origins and can reject when the document
// isn't focused or permission is denied; document.execCommand('copy') still works there.
const copyTextToClipboard = async (text) => {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // fall through to the legacy path
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        return document.execCommand('copy');
    } catch {
        return false;
    } finally {
        document.body.removeChild(textarea);
    }
};

// PostgREST answers 404 / PGRST202 (and Postgres 42883) when an RPC isn't defined yet.
const isMissingFunctionError = (error) =>
    error?.code === 'PGRST202' || error?.code === '42883' || error?.status === 404;

const Dashboard = () => {
    usePageTitle('Dashboard');
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
    const refetchTimerRef = useRef(null);
    // Monotonic request ids: responses can arrive out of order (realtime burst, tab refocus,
    // a post-create refetch), and an older response landing last would overwrite fresher data.
    const requestSeqRef = useRef(0);
    const appliedSeqRef = useRef(0);

    const showToast = useCallback((message) => setToast({ show: true, message }), []);
    const closeToast = useCallback(() => setToast({ show: false, message: '' }), []);
    const closeDeleteModal = useCallback(() => setDeleteModal({ show: false, id: null, name: '' }), []);
    const closeCreateForm = useCallback(() => setShowCreateForm(false), []);
    const closeDeleteAccountModal = useCallback(() => setDeleteAccountModal(false), []);

    useEscapeKey(showCreateForm, closeCreateForm);
    useEscapeKey(deleteModal.show, closeDeleteModal);
    useEscapeKey(deleteAccountModal, closeDeleteAccountModal);

    // Stable fetch function that doesn't cause re-subscriptions
    const fetchInvites = useCallback(async (showLoading = true) => {
        const seq = ++requestSeqRef.current;

        if (showLoading) {
            setLoading(true);
            setLoadProgress(0);
            // Tick up steadily - capped at 90 - so there's always visible movement
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

        try {
            // getSession reads the locally stored (auto-refreshed) session; getUser is a
            // network round trip to the auth server, which doubled the cost of every refresh.
            // Row access is enforced by RLS regardless.
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;

            if (!user) {
                navigate('/auth/verify', { replace: true });
                return;
            }

            userIdRef.current = user.id;

            const { data, error } = await supabase
                .from('invites')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                logger.error('Error fetching invites:', error);
                if (showLoading) showToast('Could not load your URLs. Please refresh.');
            } else if (seq > appliedSeqRef.current) {
                appliedSeqRef.current = seq;
                setInvites(data || []);
            }
        } catch (error) {
            // A network failure used to throw out of here and leave the loading screen up forever.
            logger.error('Error fetching invites:', error);
            if (showLoading) showToast('Could not load your URLs. Please refresh.');
        } finally {
            if (showLoading) {
                // Stop the ticker, snap to 100%, then let the dashboard appear
                clearInterval(progressTimerRef.current);
                setLoadProgress(100);
                setTimeout(() => setLoading(false), 250);
            }
        }
    }, [navigate, showToast]);

    useEffect(() => {
        let cancelled = false;

        // Initial fetch
        fetchInvites();

        // Coalesce bursts of realtime events (a visit + a yes + a no landing together) into
        // one refetch instead of one full table read per event.
        const scheduleRefetch = () => {
            clearTimeout(refetchTimerRef.current);
            refetchTimerRef.current = setTimeout(() => fetchInvites(false), 300);
        };

        // Set up Supabase Realtime subscription
        const setupRealtime = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user;
                // Re-check after the await: if the page unmounted meanwhile, creating the
                // channel now would leak a subscription nobody ever removes.
                if (!user || cancelled) return;

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
                            logger.log('Realtime update:', payload.eventType);
                            // Re-fetch all invites on any change for consistency
                            scheduleRefetch();
                        }
                    )
                    .subscribe();
            } catch (error) {
                logger.error('Realtime setup failed:', error);
            }
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
            cancelled = true;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(progressTimerRef.current);
            clearTimeout(refetchTimerRef.current);
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
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
        if (creating) return;

        // `required` accepts "   "; a whitespace-only name would make an unlabeled card.
        const name = recipientName.trim();
        if (!name) {
            showToast('Please enter a name');
            return;
        }

        setCreating(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;

            if (!user) {
                navigate('/auth/verify', { replace: true });
                return;
            }

            const { error } = await supabase
                .from('invites')
                .insert({
                    token: generateToken(),
                    user_id: user.id,
                    recipient_name: name,
                    total_visits: 0,
                    used: false
                });

            if (error) {
                logger.error('Error creating invite:', error);
                showToast('Failed to create URL');
            } else {
                setRecipientName('');
                setShowCreateForm(false);
                fetchInvites();
                showToast('URL created successfully!');
            }
        } catch (error) {
            logger.error('Error creating invite:', error);
            showToast('Failed to create URL');
        } finally {
            setCreating(false);
        }
    };

    const copyUrl = useCallback(async (token) => {
        const url = `${window.location.origin}/?token=${token}`;
        const message = `There’s something I’ve been wanting to tell you… \n${url}`;
        const copied = await copyTextToClipboard(message);
        showToast(copied ? 'URL and message copied!' : 'Could not copy automatically - please copy the link manually');
    }, [showToast]);

    const deleteInvite = useCallback((id, name) => {
        setDeleteModal({ show: true, id, name });
    }, []);

    const confirmDelete = async () => {
        const id = deleteModal.id;
        closeDeleteModal(); // Close immediately for responsiveness

        try {
            const { error } = await supabase
                .from('invites')
                .delete()
                .eq('id', id);

            if (error) throw error;

            fetchInvites();
            showToast('URL deleted successfully');
        } catch (error) {
            logger.error('Error deleting invite:', error);
            showToast('Failed to delete URL');
        }
    };

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            logger.error('Error signing out:', error);
        }
        navigate('/auth/verify', { replace: true });
    };

    const handleDeleteAccount = async () => {
        setDeleteAccountModal(false);

        try {
            // Preferred: the delete_my_account() SQL function (see supabase_schema.sql) removes
            // the auth user itself - and, through the FK cascade, all of its invites. The
            // browser can't delete an auth user directly, so before this only the invites were
            // wiped and the account kept existing despite the "delete your account" promise.
            const { error: rpcError } = await supabase.rpc('delete_my_account');

            if (rpcError) {
                if (!isMissingFunctionError(rpcError)) throw rpcError;

                // Database hasn't been upgraded with that function yet: fall back to removing
                // the user's data so the button still does something useful.
                logger.warn('delete_my_account() not found; deleting invites only.');
                const { error: deleteError } = await supabase
                    .from('invites')
                    .delete()
                    .eq('user_id', userIdRef.current);

                if (deleteError) throw deleteError;
            }
        } catch (error) {
            logger.error('Error deleting account:', error);
            showToast('Failed to delete account. Please try again.');
            return;
        }

        try {
            // 'local' skips the server call, which would 401 now that the user no longer exists.
            await supabase.auth.signOut({ scope: 'local' });
        } catch (error) {
            logger.error('Error signing out:', error);
        }
        navigate('/auth/verify', { replace: true });
    };

    // Derived data - recomputed only when the invites actually change, not on every render
    // (each modal toggle / toast / progress tick used to re-run all of these filters).
    const { stats, waitingInvites, pendingInvites, yesInvites } = useMemo(() => {
        const waiting = [];
        const pending = [];
        const yes = [];
        for (const invite of invites) {
            if (invite.used) yes.push(invite);
            else if (invite.first_opened_at) pending.push(invite);
            else waiting.push(invite);
        }

        // Calculate duration for each invite, dropping invalid (negative / NaN) values
        const durations = yes
            .filter(i => i.first_opened_at && (i.first_yes_at || i.used_at))
            .map(i => new Date(i.first_yes_at || i.used_at) - new Date(i.first_opened_at))
            .filter(d => d >= 0);

        let fastestYes = '-';
        if (yes.some(i => i.first_opened_at && (i.first_yes_at || i.used_at))) {
            fastestYes = durations.length === 0 ? 'Instant ⚡' : formatDuration(Math.min(...durations));
        }

        return {
            stats: {
                total: invites.length,
                yesCount: yes.length,
                successRate: invites.length > 0 ? Math.round((yes.length / invites.length) * 100) : 0,
                fastestYes
            },
            waitingInvites: waiting,
            pendingInvites: pending,
            yesInvites: yes
        };
    }, [invites]);

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
                onClose={closeToast}
            />

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
                    <div>
                        <motion.h1
                            className="font-['Fredoka'] text-2xl sm:text-3xl md:text-4xl font-bold text-[#ff4d7d] mb-1 sm:mb-2"
                            style={{ willChange: "transform", translateZ: 30 }}
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
                            onClick={closeCreateForm}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                role="dialog"
                                aria-modal="true"
                                aria-label="Create new proposal URL"
                                className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 rounded-[3rem] p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border-4 border-white"
                            >
                                <h2 className="font-['Fredoka'] text-3xl font-bold mb-6 text-[#ff4d7d] flex items-center gap-2">
                                    Create New URL
                                    <span className="material-symbols-outlined text-3xl">favorite</span>
                                </h2>
                                <form onSubmit={createInvite}>
                                    <FloatingLabelInput
                                        label="Recipient Name"
                                        type="text"
                                        name="recipient-name"
                                        autoComplete="off"
                                        autoFocus
                                        maxLength={50}
                                        value={recipientName}
                                        onChange={(e) => setRecipientName(e.target.value)}
                                        required
                                        className="mb-6"
                                    />
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={closeCreateForm}
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
                            onClick={closeDeleteModal}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, rotate: -2 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                role="alertdialog"
                                aria-modal="true"
                                aria-label="Confirm deleting this URL"
                                className="bg-white/90 backdrop-blur-md rounded-[2.5rem] p-8 max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-2xl border-4 border-white text-center relative"
                            >
                                <div className="mb-6 flex justify-center">
                                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl text-red-500">heart_broken</span>
                                    </div>
                                </div>
                                <motion.h3
                                    className="font-['Fredoka'] text-2xl font-bold text-gray-800 mb-3"
                                    style={{ willChange: "transform", translateZ: 30 }}
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
                                        onClick={closeDeleteModal}
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
                            onClick={closeDeleteAccountModal}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, rotate: 2 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                role="alertdialog"
                                aria-modal="true"
                                aria-label="Confirm deleting your account"
                                className="bg-white/90 backdrop-blur-md rounded-[2.5rem] p-8 max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-2xl border-4 border-red-50 text-center relative"
                            >
                                <div className="mb-6 flex justify-center">
                                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl text-red-500">warning</span>
                                    </div>
                                </div>
                                <motion.h3
                                    className="font-['Fredoka'] text-2xl font-bold text-gray-800 mb-3"
                                    style={{ willChange: "transform", translateZ: 30 }}
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
                                        onClick={closeDeleteAccountModal}
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
                            {/* items-start: without it, CSS Grid's default align-items:stretch forces every
                                card in a row to match its tallest row-mate's height. Expanding one card's
                                visit history grew its row height, and the sibling card - unchanged, but
                                stretched - grew an empty gap to match, which read as it "auto-expanding" too. */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
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
                    {pendingInvites.length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="h-1 w-12 bg-gradient-to-r from-yellow-400 to-transparent rounded-full"></div>
                                <h2 className="font-['Fredoka'] text-2xl font-bold text-gray-700 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-2xl text-yellow-600">visibility</span> <span>Pending</span>
                                    <span className="text-sm font-normal bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">{pendingInvites.length}</span>
                                </h2>
                                <div className="flex-1 h-1 bg-gradient-to-r from-transparent to-yellow-200 rounded-full"></div>
                            </div>
                            {/* items-start: without it, CSS Grid's default align-items:stretch forces every
                                card in a row to match its tallest row-mate's height. Expanding one card's
                                visit history grew its row height, and the sibling card - unchanged, but
                                stretched - grew an empty gap to match, which read as it "auto-expanding" too. */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                {pendingInvites.map((invite) => (
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
                            {/* items-start: without it, CSS Grid's default align-items:stretch forces every
                                card in a row to match its tallest row-mate's height. Expanding one card's
                                visit history grew its row height, and the sibling card - unchanged, but
                                stretched - grew an empty gap to match, which read as it "auto-expanding" too. */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
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

// Full class strings (not built with template-literal interpolation) so Tailwind's
// JIT scanner can actually find and generate them - a `bg-${color}-100` string built
// at runtime is invisible to the build-time content scan and would silently emit no CSS.
const BADGE_COLORS = {
    gray: 'bg-gray-100 text-gray-500',
    purple: 'bg-purple-100 text-purple-500',
    rose: 'bg-rose-100 text-rose-500',
    pink: 'bg-pink-100 text-pink-500',
};

// Small circular icon chip - gives every utility icon a soft colored backing instead of
// floating as a bare glyph next to text, which is what was reading as "dated" on the cards.
// Same static-class rule as BADGE_COLORS above: no interpolated size classes.
const IconBadge = ({ icon, color = 'gray', large = false }) => (
    <span
        className={`${large ? 'w-9 h-9' : 'w-7 h-7'} rounded-full flex items-center justify-center flex-shrink-0 ${BADGE_COLORS[color]}`}
    >
        <span className={`material-symbols-outlined leading-none ${large ? 'text-lg' : 'text-sm'}`} aria-hidden="true">
            {icon}
        </span>
    </span>
);

// Invite Card Component
// memo: the card's handlers are stable, so opening a modal or showing a toast on the
// dashboard no longer re-renders every card (and their motion animations).
const InviteCard = memo(({ invite, onCopy, onDelete, formatDateTime, formatRelativeTime, calculateTimeToYes }) => {
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
                    aria-label={`Delete proposal for ${invite.recipient_name}`}
                    className="w-9 h-9 rounded-full bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition flex items-center justify-center flex-shrink-0"
                >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">delete</span>
                </button>
            </div>

            {/* Stats Bar (Horizontal) */}
            <div className="flex gap-3 mb-5 flex-wrap">
                <button
                    onClick={() => setShowVisitDetails(!showVisitDetails)}
                    aria-expanded={showVisitDetails}
                    className="flex items-center gap-2.5 bg-gray-50 pl-2.5 pr-3.5 py-2 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                >
                    <IconBadge icon="bar_chart" color="gray" />
                    <div>
                        <div className="font-['Quicksand'] text-xs text-gray-500 font-semibold">Visits</div>
                        <div className="font-['Fredoka'] text-sm font-bold text-gray-800">{invite.total_visits}</div>
                    </div>
                    <motion.span
                        animate={{ rotate: showVisitDetails ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="material-symbols-outlined text-gray-400 text-lg ml-0.5"
                        aria-hidden="true"
                    >
                        expand_more
                    </motion.span>
                </button>

                {(isPending || isYes) && invite.first_opened_at && (
                    <div className="flex items-center gap-2.5 bg-purple-50 pl-2.5 pr-3.5 py-2 rounded-xl">
                        <IconBadge icon="schedule" color="purple" />
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
                                <IconBadge icon="history" color="purple" /> Visit History
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
                                    <div className="flex items-center gap-2.5 text-sm">
                                        <IconBadge icon="heart_broken" color="rose" />
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
                                        <IconBadge icon="favorite" color="pink" /> {"\""}Yes{"\""} History
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
});

InviteCard.displayName = 'InviteCard';

export default Dashboard;
