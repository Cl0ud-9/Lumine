// True when the PRIMARY input is a finger (phones, tablets), false for a mouse/trackpad - including
// a touch-screen laptop, whose primary pointer is still the mouse. Read once at mount: it picks
// the lighter animation variants used on touch screens, so it must not change mid-animation.
export const isCoarsePointer = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
