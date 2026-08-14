import { useState } from 'react';

const DEFAULT_HEART_COLOR = '#ec4899';
const DEFAULT_SPARKLE_COLORS = ['#d8b4fe', '#f9a8d4', '#ffffff'];
const DEFAULT_CONFETTI_COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

/**
 * Generates the ambient hearts/sparkles/confetti field shared by MagicalBackground,
 * Proposal and Celebration. Generated once (stable across re-renders) so the list
 * never regenerates mid-animation.
 */
export function useFloatingElements({
    heartCount = 15,
    sparkleCount = 12,
    confettiCount = 0,
    heartColor = DEFAULT_HEART_COLOR,
    sparkleColors = DEFAULT_SPARKLE_COLORS,
    confettiColors = DEFAULT_CONFETTI_COLORS,
} = {}) {
    const [elements] = useState(() => {
        const hearts = Array.from({ length: heartCount }).map((_, i) => ({
            id: `heart-${i}`,
            type: 'heart',
            left: Math.random() * 100,
            delay: Math.random() * 5,
            duration: 15 + Math.random() * 10,
            size: 20 + Math.random() * 30,
            rotate: Math.random() * 30 - 15,
            color: heartColor,
        }));

        const sparkles = Array.from({ length: sparkleCount }).map((_, i) => ({
            id: `sparkle-${i}`,
            type: 'sparkle',
            left: Math.random() * 100,
            delay: Math.random() * 5,
            duration: 4 + Math.random() * 6,
            size: 15 + Math.random() * 20,
            rotate: Math.random() * 180,
            color: sparkleColors[Math.floor(Math.random() * sparkleColors.length)],
        }));

        const confetti = Array.from({ length: confettiCount }).map((_, i) => ({
            id: `confetti-${i}`,
            type: 'confetti',
            left: Math.random() * 100,
            top: -10 - Math.random() * 20,
            delay: Math.random() * 2,
            duration: 3 + Math.random() * 4,
            size: 8 + Math.random() * 8,
            rotate: Math.random() * 360,
            color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
            xDrift: Math.random() * 100 - 50,
            roundedShape: Math.random() > 0.5,
        }));

        return [...hearts, ...sparkles, ...confetti];
    });

    return elements;
}
