import { m, AnimatePresence } from 'framer-motion';

const CircularTransition = ({ isVisible, onComplete, isMobile }) => {
    // Colors inspired by Ponpon Mania (reference)
    const layers = [
        { color: "#ff85a1", delay: 0 },    // Pink
        { color: "#ff9f1c", delay: 0.1 },  // Orange
        { color: "#ff3e6d", delay: 0.2 },  // Deep Pink / Red
    ];

    // Each layer is a full-screen solid colour revealed through a growing circle (clip-path),
    // from radius 0 to 150vh - exactly the disc the old version produced by scaling a 10vh circle
    // 30x. Scaling a tiny element that far made phones re-raster a huge, soft-edged texture every
    // frame (it flickered and went blurry); a clipped solid rectangle is trivially cheap and always
    // crisp, whatever the screen size.
    return (
        <AnimatePresence onExitComplete={onComplete}>
            {isVisible && (
                <m.div
                    className="fixed inset-0 z-[60] pointer-events-none" // z-[60] to sit above LoadingScreen (z-50)
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 1 }} // Don't fade out! Let Celebration wipe over it.
                >
                    {layers.map((layer, index) => (
                        <m.div
                            key={index}
                            initial={{ clipPath: "circle(0vh at 50% 50%)" }}
                            animate={{ clipPath: "circle(150vh at 50% 50%)" }}
                            exit={{ opacity: 0, transition: { duration: 0.5 } }} // Fade out for safety
                            transition={{
                                duration: isMobile ? 1.5 : 1.2, // Slower, more deliberate
                                delay: layer.delay,
                                ease: [0.76, 0, 0.24, 1] // "Emphasized" easing (Material Design 3)
                            }}
                            style={{
                                backgroundColor: layer.color,
                                zIndex: index + 10,
                            }}
                            className="absolute inset-0"
                        />
                    ))}
                </m.div>
            )}
        </AnimatePresence>
    );
};

export default CircularTransition;
