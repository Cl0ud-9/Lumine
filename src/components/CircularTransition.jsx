import { motion, AnimatePresence } from 'framer-motion';

const CircularTransition = ({ isVisible, onComplete, isMobile }) => {
    // Colors inspired by Ponpon Mania (reference)
    const layers = [
        { color: "#ff85a1", delay: 0 },    // Pink
        { color: "#ff9f1c", delay: 0.1 },  // Orange
        { color: "#ff3e6d", delay: 0.2 },  // Deep Pink / Red
    ];

    return (
        <AnimatePresence onExitComplete={onComplete}>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none" // z-[60] to sit above LoadingScreen (z-50)
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 1 }} // Don't fade out! Let Celebration wipe over it.
                >
                    {layers.map((layer, index) => (
                        <motion.div
                            key={index}
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 30] }}
                            exit={{ opacity: 0, transition: { duration: 0.5 } }} // Fade out for safety
                            transition={{
                                duration: isMobile ? 1.5 : 1.2, // Slower, more deliberate
                                delay: layer.delay,
                                ease: [0.76, 0, 0.24, 1] // "Emphasized" easing (Material Design 3)
                            }}
                            style={{
                                backgroundColor: layer.color,
                                zIndex: index + 10,
                                position: 'absolute'
                            }}
                            className="w-[10vh] h-[10vh] rounded-full"
                        />
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CircularTransition;
