import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ children, className = '' }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }} // Slower, smoother, no bounce
            className={`relative bg-surface-container-high/60 backdrop-blur-md text-on-surface shadow-[0_20px_40px_-10px_rgba(255,183,178,0.2)] rounded-[32px] p-8 md:p-12 border border-white/40 ${className}`}
        >
            {children}
        </motion.div>
    );
};

export default Card;
