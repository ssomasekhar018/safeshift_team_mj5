/**
 * SafeShift — Animated Wrapper Component
 * Provides consistent animations throughout the application with accessibility support
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  pageVariants, 
  cardVariants, 
  staggerContainer, 
  staggerItem,
  modalVariants,
  backdropVariants,
  withAccessibility 
} from '../utils/animations';

// ─── Utility Hook for PWA Mode ───────────────────────────────────────────────

export const useIsPWA = () => {
  const [isPWA, setIsPWA] = React.useState(false);
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const checkPWA = () => setIsPWA(document.body.classList.contains('pwa-mode'));
    checkPWA();
    const observer = new MutationObserver(checkPWA);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isPWA;
};

// ─── Page Wrapper ─────────────────────────────────────────────────────────────

export const AnimatedPage = ({ children, className = "" }) => {
  const isPWA = useIsPWA();
  
  return (
    <motion.div
      className={className}
      variants={withAccessibility(pageVariants)}
      initial={isPWA ? "in" : "initial"} // Skip entry animation in PWA
      animate="in"
      exit="out"
    >
      {children}
    </motion.div>
  );
};

// ─── Card Wrapper ─────────────────────────────────────────────────────────────

export const AnimatedCard = ({ 
  children, 
  className = "", 
  delay = 0,
  hover = true,
  ...props 
}) => {
  const variants = withAccessibility(cardVariants);
  const isPWA = useIsPWA();
  
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      whileHover={(hover && !isPWA) ? { y: -2, scale: 1.02 } : undefined}
      whileTap={(hover && !isPWA) ? { scale: 0.98 } : undefined}
      transition={{ delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// ─── Staggered List Container ─────────────────────────────────────────────────

export const AnimatedList = ({ children, className = "", stagger = 0.1 }) => {
  const containerVariants = {
    ...withAccessibility(staggerContainer),
    visible: {
      ...staggerContainer.visible,
      transition: {
        staggerChildren: stagger,
        delayChildren: 0.1
      }
    }
  };

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
};

// ─── Staggered List Item ──────────────────────────────────────────────────────

export const AnimatedListItem = ({ children, className = "", ...props }) => {
  const isPWA = useIsPWA();
  
  return (
    <motion.div
      className={className}
      variants={withAccessibility(staggerItem)}
      whileHover={!isPWA ? { x: 4 } : undefined} // Skip hover slide for PWA
      {...props}
    >
      {children}
    </motion.div>
  );
};

// ─── Modal Wrapper ────────────────────────────────────────────────────────────

export const AnimatedModal = ({ 
  children, 
  isOpen, 
  onClose, 
  className = "",
  backdropClassName = "fixed inset-0 bg-black/50 flex items-center justify-center z-50"
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={backdropClassName}
          variants={withAccessibility(backdropVariants)}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            className={className}
            variants={withAccessibility(modalVariants)}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Button Wrapper ───────────────────────────────────────────────────────────

export const AnimatedButton = ({ 
  children, 
  className = "", 
  disabled = false,
  onClick,
  ...props 
}) => {
  const isPWA = useIsPWA();
  
  return (
    <motion.button
      className={className}
      whileHover={(!disabled && !isPWA) ? { scale: 1.05 } : undefined}
      whileTap={(!disabled && !isPWA) ? { scale: 0.95 } : undefined}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
};

// ─── Icon Wrapper ─────────────────────────────────────────────────────────────

export const AnimatedIcon = ({ 
  children, 
  className = "", 
  hover = true,
  spin = false,
  bounce = false,
  ...props 
}) => {
  const isPWA = useIsPWA();
  const animations = {};
  
  if (hover && !isPWA) {
    animations.whileHover = { scale: 1.1, rotate: 5 };
    animations.whileTap = { scale: 0.9, rotate: -5 };
  }
  
  if (spin) {
    animations.animate = { rotate: 360 };
    animations.transition = { duration: 1, repeat: Infinity, ease: "linear" };
  }
  
  if (bounce) {
    animations.animate = { y: [0, -5, 0] };
    animations.transition = { duration: 0.6, repeat: Infinity, ease: "easeInOut" };
  }

  return (
    <motion.div
      className={className}
      {...animations}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// ─── Loading Wrapper ──────────────────────────────────────────────────────────

export const AnimatedLoader = ({ 
  children, 
  className = "", 
  type = "pulse" // pulse, spin, bounce
}) => {
  const getAnimation = () => {
    switch (type) {
      case 'spin':
        return {
          animate: { rotate: 360 },
          transition: { duration: 1, repeat: Infinity, ease: "linear" }
        };
      case 'bounce':
        return {
          animate: { y: [0, -10, 0] },
          transition: { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
        };
      case 'pulse':
      default:
        return {
          animate: { scale: [1, 1.1, 1], opacity: [1, 0.8, 1] },
          transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
        };
    }
  };

  return (
    <motion.div
      className={className}
      {...getAnimation()}
    >
      {children}
    </motion.div>
  );
};

// ─── Text Animation Wrapper ───────────────────────────────────────────────────

export const AnimatedText = ({ 
  children, 
  className = "", 
  delay = 0,
  type = "fadeIn" // fadeIn, slideUp, typewriter
}) => {
  const getVariants = () => {
    switch (type) {
      case 'slideUp':
        return {
          hidden: { opacity: 0, y: 20 },
          visible: { 
            opacity: 1, 
            y: 0,
            transition: { duration: 0.5, delay }
          }
        };
      case 'typewriter':
        return {
          hidden: { width: 0 },
          visible: { 
            width: "auto",
            transition: { duration: 1, delay }
          }
        };
      case 'fadeIn':
      default:
        return {
          hidden: { opacity: 0 },
          visible: { 
            opacity: 1,
            transition: { duration: 0.5, delay }
          }
        };
    }
  };

  return (
    <motion.div
      className={className}
      variants={withAccessibility(getVariants())}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-20px" }}
    >
      {children}
    </motion.div>
  );
};

// ─── Progress Bar Wrapper ─────────────────────────────────────────────────────

export const AnimatedProgress = ({ 
  progress = 0, 
  className = "",
  barClassName = "h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full",
  duration = 0.5
}) => {
  return (
    <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <motion.div
        className={barClassName}
        initial={{ width: "0%" }}
        animate={{ width: `${progress}%` }}
        transition={{ duration, ease: "easeOut" }}
      />
    </div>
  );
};

// ─── Notification/Toast Wrapper ───────────────────────────────────────────────

export const AnimatedToast = ({ 
  children, 
  isVisible, 
  className = "",
  position = "top" // top, bottom, left, right
}) => {
  const getVariants = () => {
    const distance = 50;
    switch (position) {
      case 'bottom':
        return {
          hidden: { opacity: 0, y: distance },
          visible: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: distance }
        };
      case 'left':
        return {
          hidden: { opacity: 0, x: -distance },
          visible: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -distance }
        };
      case 'right':
        return {
          hidden: { opacity: 0, x: distance },
          visible: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: distance }
        };
      case 'top':
      default:
        return {
          hidden: { opacity: 0, y: -distance },
          visible: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -distance }
        };
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={className}
          variants={withAccessibility(getVariants())}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Layout Transition Wrapper ────────────────────────────────────────────────

export const AnimatedLayout = ({ children, className = "" }) => {
  return (
    <motion.div
      className={className}
      layout
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

// ─── Presence Wrapper for Route Transitions ──────────────────────────────────

export const AnimatedPresence = ({ children, mode = "wait" }) => {
  return (
    <AnimatePresence mode={mode}>
      {children}
    </AnimatePresence>
  );
};

// ─── Utility Hook for Animation Controls ─────────────────────────────────────

export const useAnimationControls = () => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);
  const toggle = () => setIsVisible(!isVisible);
  
  const startLoading = () => setIsLoading(true);
  const stopLoading = () => setIsLoading(false);
  
  return {
    isVisible,
    isLoading,
    show,
    hide,
    toggle,
    startLoading,
    stopLoading
  };
};