import { motion, AnimatePresence } from 'framer-motion';

const HelpModal = ({ show, onClose }) => {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white/90 backdrop-blur-md rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 max-w-lg w-full shadow-2xl border-4 border-white relative overflow-hidden"
                    >
                        {/* Header */}
                        <div className="text-center mb-6 sm:mb-8 relative z-10">
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: 10 }}
                                className="w-12 h-12 sm:w-16 sm:h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 border-4 border-pink-50 shadow-inner"
                            >
                                <span className="material-symbols-outlined text-3xl sm:text-4xl text-pink-500">
                                    lightbulb
                                </span>
                            </motion.div>
                            <motion.h2
                                className="font-['Fredoka'] text-2xl sm:text-3xl font-bold text-gray-800 mb-2"
                                style={{ willChange: "transform", transform: "translateZ(30px)" }}
                                animate={{ y: [0, -4, 0] }}
                                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                            >
                                How to Use Lumine
                            </motion.h2>
                            <p className="font-['Quicksand'] text-sm sm:text-base text-gray-500 font-semibold">
                                Create, Share, and Celebrate in 3 steps!
                            </p>
                        </div>

                        {/* Steps */}
                        <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8 relative z-10">
                            <div className="flex gap-3 sm:gap-4 items-start group">
                                <motion.div
                                    whileHover={{ scale: 1.1, rotate: 10 }}
                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center flex-shrink-0 text-white font-['Fredoka'] font-bold text-lg sm:text-xl shadow-lg shadow-pink-200 border-2 border-white transform -rotate-3"
                                >
                                    1
                                </motion.div>
                                <div>
                                    <h3 className="font-['Fredoka'] text-lg sm:text-xl font-bold text-gray-800 mb-1 group-hover:text-pink-500 transition-colors">Create a Link</h3>
                                    <p className="font-['Quicksand'] text-sm sm:text-base text-gray-600 font-semibold leading-relaxed">
                                        Tap <span className="text-pink-500 font-bold bg-pink-50 px-2 py-0.5 rounded-lg border border-pink-100">Create New Proposal URL</span>, enter your special person{"'"}s name, and get a unique, magical link.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 sm:gap-4 items-start group">
                                <motion.div
                                    whileHover={{ scale: 1.1, rotate: -10 }}
                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center flex-shrink-0 text-white font-['Fredoka'] font-bold text-lg sm:text-xl shadow-lg shadow-purple-200 border-2 border-white transform rotate-2"
                                >
                                    2
                                </motion.div>
                                <div>
                                    <h3 className="font-['Fredoka'] text-lg sm:text-xl font-bold text-gray-800 mb-1 group-hover:text-purple-500 transition-colors">Share the Love</h3>
                                    <p className="font-['Quicksand'] text-sm sm:text-base text-gray-600 font-semibold leading-relaxed">
                                        Copy the link and send it to them. It works beautifully on mobile!
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 sm:gap-4 items-start group">
                                <motion.div
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center flex-shrink-0 text-white font-['Fredoka'] font-bold text-lg sm:text-xl shadow-lg shadow-blue-200 border-2 border-white transform -rotate-1"
                                >
                                    3
                                </motion.div>
                                <div>
                                    <h3 className="font-['Fredoka'] text-lg sm:text-xl font-bold text-gray-800 mb-1 group-hover:text-blue-500 transition-colors">Watch & Celebrate</h3>
                                    <p className="font-['Quicksand'] text-sm sm:text-base text-gray-600 font-semibold leading-relaxed">
                                        Track when they open it (<span className="text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full text-xs font-bold">Pending</span>) and the exact moment they say <span className="text-pink-600 bg-pink-100 px-2 py-0.5 rounded-full text-xs font-bold">Yes!</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Button */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onClose}
                            className="bubbly-yes w-full py-3 sm:py-4 rounded-[2rem] font-['Fredoka'] text-white text-lg sm:text-xl uppercase tracking-wider font-bold shadow-xl hover:shadow-pink-200 transition-shadow"
                        >
                            Ready to shine!
                        </motion.button>

                        {/* Background Blobs for Visual Interest */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-200 rounded-full blur-3xl opacity-30"></div>
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-200 rounded-full blur-3xl opacity-30"></div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default HelpModal;
