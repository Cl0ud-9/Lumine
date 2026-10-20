// Framer Motion feature bundle for <LazyMotion> (see App.jsx). `domAnimation` covers everything the
// app uses: animate / exit (AnimatePresence) / whileHover / whileTap / variants. It does NOT include
// layout animations or drag - if you ever add `layout` / `layoutId` / `drag` props, import
// `domMax` here instead.
import { domAnimation } from 'framer-motion';

export default domAnimation;
