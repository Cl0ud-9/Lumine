import { motion } from 'framer-motion';

const Button = ({ variant = 'primary', className = '', children, ...props }) => {
    // Reference Specs: Rounded pill, distinct colors, slight shadow
    const baseStyles = "relative overflow-hidden px-10 py-3 rounded-full font-inter font-bold text-lg tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_15px_rgba(0,0,0,0.15)] hover:-translate-y-[2px]";

    const variants = {
        // Hot Pink "Yes" Button
        primary: "bg-[#be123c] text-white border-2 border-[#be123c] hover:bg-[#9f1239]",
        // White "No" Button
        secondary: "bg-white text-[#be123c] border-2 border-white/50 hover:bg-gray-50",

        // Outline / Ghost
        danger: "bg-transparent border-2 border-white/40 text-on-surface hover:bg-white/20"
    };

    return (
        <motion.button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            whileHover={variant !== 'primary' ? { scale: 1.05 } : {}} // Primary handles its own active state via CSS usually, but consistent motion is good.
            whileTap={{ scale: 0.95 }}
            {...props}
        >
            {children}
        </motion.button>
    );
};

export default Button;
