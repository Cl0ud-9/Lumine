import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import CustomCursor from '../components/CustomCursor';

const EmailConfirmation = () => {
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
                <div className="sticker-card rounded-[3rem] p-8 text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                        className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6"
                    >
                        <span className="material-symbols-outlined text-5xl text-pink-500">
                            mark_email_unread
                        </span>
                    </motion.div>

                    <div className="mb-4">
                        <motion.h1
                            className="font-['Fredoka'] text-3xl font-bold text-[#ff4d7d] mb-2"
                            style={{ willChange: "transform", transform: "translateZ(30px)" }}
                            animate={{ y: [0, -4, 0] }}
                            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                        >
                            Verify Your Email 💌
                        </motion.h1>
                    </div>

                    <p className="font-['Quicksand'] text-gray-600 font-semibold mb-8 leading-relaxed">
                        We've sent a confirmation link to your inbox. <br />
                        Please click the link to activate your account and start creating romantic proposals!
                    </p>

                    <div className="space-y-4">
                        <Link to="/auth/verify">
                            <button className="bubbly-yes w-full py-4 rounded-[2rem] text-xl font-['Fredoka'] text-white uppercase tracking-wider transition-transform active:scale-95 font-semibold">
                                <span className="flex items-center justify-center gap-2">
                                    Go to Login
                                    <span className="material-symbols-outlined text-2xl">arrow_forward</span>
                                </span>
                            </button>
                        </Link>

                        <p className="font-['Quicksand'] text-sm text-gray-500 font-medium">
                            Didn't receive it? Check your spam folder.<br />
                            (Sometimes love letters get lost there!)
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default EmailConfirmation;
