import { motion } from 'framer-motion';

/**
 * Renders the hearts/sparkles/confetti list produced by useFloatingElements().
 * Shared by Proposal and Celebration so the animation markup only exists once.
 *
 * heartVariant: 'filled' (solid heart, used on Proposal/Celebration) or
 * 'outline' (stroked heart, used on the plain MagicalBackground).
 */
const FloatingParticles = ({ elements, prefersReducedMotion = false, heartVariant = 'filled' }) => {
    return (
        <>
            {elements.map((el) => (
                <motion.div
                    key={el.id}
                    initial={el.type === 'confetti'
                        ? { y: -50, opacity: 1, rotate: 0 }
                        : { y: "110vh", opacity: 0 }
                    }
                    animate={el.type === 'confetti'
                        ? {
                            y: "110vh",
                            opacity: [1, 1, 0],
                            rotate: [0, 360, 720],
                            x: [0, el.xDrift, 0]
                        }
                        : {
                            y: "-10vh",
                            opacity: [0, el.type === 'heart' ? 0.8 : 0.9, 0]
                        }
                    }
                    transition={
                        prefersReducedMotion
                            ? { duration: 0 }
                            : {
                                duration: el.duration,
                                repeat: Infinity,
                                delay: el.delay,
                                ease: "linear"
                            }
                    }
                    style={{
                        left: `${el.left}%`,
                        position: 'absolute',
                        width: el.size,
                        height: el.size,
                        backgroundColor: el.type === 'confetti' ? el.color : undefined,
                        borderRadius: el.type === 'confetti' ? (el.roundedShape ? '50%' : '2px') : undefined
                    }}
                >
                    {el.type === 'heart' && heartVariant === 'outline' && (
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            className="text-[#be123c] w-full h-full opacity-80"
                            style={{ transform: `rotate(${el.rotate}deg)` }}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                    )}
                    {el.type === 'heart' && heartVariant === 'filled' && (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full opacity-60 drop-shadow-sm" style={{ transform: `rotate(${el.rotate}deg)`, color: el.color }}>
                            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.245 15.245 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                        </svg>
                    )}
                    {el.type === 'sparkle' && (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full animate-pulse drop-shadow-sm" style={{ transform: `rotate(${el.rotate}deg)`, color: el.color }}>
                            <path d="M12 2L14.39 9.61L22 12L14.39 14.39L12 22L9.61 14.39L2 12L9.61 9.61L12 2Z" />
                        </svg>
                    )}
                    {/* Confetti uses CSS background color, so no SVG needed */}
                </motion.div>
            ))}
        </>
    );
};

export default FloatingParticles;
