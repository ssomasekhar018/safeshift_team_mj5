/**
 * SafeShift — Framer Motion Animation System
 * Centralized animation variants and utilities with accessibility support
 */

// Check for reduced motion preference
const shouldReduceMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// ─── Page Transition Animations ──────────────────────────────────────────────

export const pageVariants = {
  initial: {
    opacity: 0,
    x: shouldReduceMotion() ? 0 : -20,
    scale: shouldReduceMotion() ? 1 : 0.98
  },
  in: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: shouldReduceMotion() ? 0.1 : 0.4,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  out: {
    opacity: 0,
    x: shouldReduceMotion() ? 0 : 20,
    scale: shouldReduceMotion() ? 1 : 0.98,
    transition: {
      duration: shouldReduceMotion() ? 0.1 : 0.3,
      ease: [0.4, 0, 0.6, 1]
    }
  }
};

// ─── Component Entrance Animations ───────────────────────────────────────────

export const cardVariants = {
  hidden: {
    opacity: 0,
    y: shouldReduceMotion() ? 0 : 20,
    scale: shouldReduceMotion() ? 1 : 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: shouldReduceMotion() ? 0.1 : 0.5,
      ease: "easeOut"
    }
  }
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: shouldReduceMotion() ? 0 : 0.1,
      delayChildren: shouldReduceMotion() ? 0 : 0.1
    }
  }
};

export const staggerItem = {
  hidden: {
    opacity: 0,
    y: shouldReduceMotion() ? 0 : 20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: shouldReduceMotion() ? 0.1 : 0.4,
      ease: "easeOut"
    }
  }
};

// ─── Interactive Hover Animations ────────────────────────────────────────────

export const buttonVariants = {
  hover: {
    scale: shouldReduceMotion() ? 1 : 1.05,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  },
  tap: {
    scale: shouldReduceMotion() ? 1 : 0.95,
    transition: {
      duration: 0.1
    }
  }
};

export const cardHoverVariants = {
  hover: {
    y: shouldReduceMotion() ? 0 : -4,
    scale: shouldReduceMotion() ? 1 : 1.02,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  tap: {
    scale: shouldReduceMotion() ? 1 : 0.98,
    transition: {
      duration: 0.1
    }
  }
};

export const iconVariants = {
  hover: {
    rotate: shouldReduceMotion() ? 0 : 5,
    scale: shouldReduceMotion() ? 1 : 1.1,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  },
  tap: {
    rotate: shouldReduceMotion() ? 0 : -5,
    scale: shouldReduceMotion() ? 1 : 0.9,
    transition: {
      duration: 0.1
    }
  }
};

// ─── Loading State Animations ─────────────────────────────────────────────────

export const loadingVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.3
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
};

export const spinnerVariants = {
  animate: {
    rotate: shouldReduceMotion() ? 0 : 360,
    transition: {
      duration: shouldReduceMotion() ? 0 : 1,
      repeat: shouldReduceMotion() ? 0 : Infinity,
      ease: "linear"
    }
  }
};

export const pulseVariants = {
  animate: {
    scale: shouldReduceMotion() ? 1 : [1, 1.05, 1],
    opacity: shouldReduceMotion() ? 1 : [1, 0.8, 1],
    transition: {
      duration: shouldReduceMotion() ? 0 : 2,
      repeat: shouldReduceMotion() ? 0 : Infinity,
      ease: "easeInOut"
    }
  }
};

// ─── Modal and Overlay Animations ─────────────────────────────────────────────

export const modalVariants = {
  hidden: {
    opacity: 0,
    scale: shouldReduceMotion() ? 1 : 0.8,
    y: shouldReduceMotion() ? 0 : 20
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: shouldReduceMotion() ? 0.1 : 0.3,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    scale: shouldReduceMotion() ? 1 : 0.8,
    y: shouldReduceMotion() ? 0 : 20,
    transition: {
      duration: shouldReduceMotion() ? 0.1 : 0.2,
      ease: "easeIn"
    }
  }
};

export const backdropVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: shouldReduceMotion() ? 0.1 : 0.3
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: shouldReduceMotion() ? 0.1 : 0.2
    }
  }
};

// ─── Form and Input Animations ────────────────────────────────────────────────

export const inputVariants = {
  focus: {
    scale: shouldReduceMotion() ? 1 : 1.02,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  blur: {
    scale: 1,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  }
};

export const labelVariants = {
  float: {
    y: shouldReduceMotion() ? 0 : -20,
    scale: shouldReduceMotion() ? 1 : 0.8,
    color: "var(--accent-purple)",
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  rest: {
    y: 0,
    scale: 1,
    color: "var(--text-secondary)",
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  }
};

// ─── Success and Error State Animations ──────────────────────────────────────

export const successVariants = {
  hidden: {
    opacity: 0,
    scale: shouldReduceMotion() ? 1 : 0.5,
    rotate: shouldReduceMotion() ? 0 : -10
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      duration: shouldReduceMotion() ? 0.1 : 0.5,
      ease: "easeOut"
    }
  }
};

export const errorVariants = {
  hidden: { opacity: 0, x: 0 },
  visible: {
    opacity: 1,
    x: shouldReduceMotion() ? 0 : [0, -10, 10, -10, 10, 0],
    transition: {
      duration: shouldReduceMotion() ? 0.1 : 0.5,
      ease: "easeOut"
    }
  }
};

// ─── Navigation and Tab Animations ────────────────────────────────────────────

export const tabVariants = {
  inactive: {
    color: "var(--text-secondary)",
    scale: 1
  },
  active: {
    color: "var(--accent-purple)",
    scale: shouldReduceMotion() ? 1 : 1.05,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  }
};

export const tabIndicatorVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: shouldReduceMotion() ? 0.1 : 0.3,
      ease: "easeOut"
    }
  }
};

// ─── List and Grid Item Animations ────────────────────────────────────────────

export const listItemVariants = {
  hidden: {
    opacity: 0,
    x: shouldReduceMotion() ? 0 : -20
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: shouldReduceMotion() ? 0.1 : 0.3,
      ease: "easeOut"
    }
  },
  hover: {
    x: shouldReduceMotion() ? 0 : 4,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  }
};

export const gridItemVariants = {
  hidden: {
    opacity: 0,
    scale: shouldReduceMotion() ? 1 : 0.8
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: shouldReduceMotion() ? 0.1 : 0.4,
      ease: "easeOut"
    }
  }
};

// ─── Notification and Toast Animations ───────────────────────────────────────

export const toastVariants = {
  hidden: {
    opacity: 0,
    y: shouldReduceMotion() ? 0 : -50,
    scale: shouldReduceMotion() ? 1 : 0.9
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: shouldReduceMotion() ? 0.1 : 0.4,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    y: shouldReduceMotion() ? 0 : -50,
    scale: shouldReduceMotion() ? 1 : 0.9,
    transition: {
      duration: shouldReduceMotion() ? 0.1 : 0.3,
      ease: "easeIn"
    }
  }
};

// ─── Progress and Loading Bar Animations ─────────────────────────────────────

export const progressVariants = {
  initial: { width: "0%" },
  animate: (progress) => ({
    width: `${progress}%`,
    transition: {
      duration: shouldReduceMotion() ? 0.1 : 0.5,
      ease: "easeOut"
    }
  })
};

export const skeletonVariants = {
  animate: {
    opacity: shouldReduceMotion() ? 1 : [1, 0.5, 1],
    transition: {
      duration: shouldReduceMotion() ? 0 : 1.5,
      repeat: shouldReduceMotion() ? 0 : Infinity,
      ease: "easeInOut"
    }
  }
};

// ─── Utility Functions ────────────────────────────────────────────────────────

export const createStaggeredList = (items, delay = 0.1) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: shouldReduceMotion() ? 0 : delay,
      delayChildren: shouldReduceMotion() ? 0 : 0.1
    }
  }
});

export const createSlideIn = (direction = 'left', distance = 20) => ({
  hidden: {
    opacity: 0,
    x: shouldReduceMotion() ? 0 : (direction === 'left' ? -distance : distance),
    y: shouldReduceMotion() ? 0 : (direction === 'up' ? distance : direction === 'down' ? -distance : 0)
  },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      duration: shouldReduceMotion() ? 0.1 : 0.4,
      ease: "easeOut"
    }
  }
});

export const createBounce = (scale = 1.1) => ({
  animate: {
    scale: shouldReduceMotion() ? 1 : [1, scale, 1],
    transition: {
      duration: shouldReduceMotion() ? 0 : 0.6,
      ease: "easeInOut"
    }
  }
});

// ─── Accessibility Helpers ───────────────────────────────────────────────────

export const getAccessibleVariants = (variants) => {
  if (shouldReduceMotion()) {
    // Return simplified variants for reduced motion
    return Object.keys(variants).reduce((acc, key) => {
      acc[key] = {
        opacity: variants[key].opacity || 1,
        transition: { duration: 0.1 }
      };
      return acc;
    }, {});
  }
  return variants;
};

export const withAccessibility = (variants) => {
  return getAccessibleVariants(variants);
};

// ─── Animation Presets ────────────────────────────────────────────────────────

export const presets = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: shouldReduceMotion() ? 0.1 : 0.3 }
    }
  },
  
  slideUp: createSlideIn('up', 20),
  slideDown: createSlideIn('down', 20),
  slideLeft: createSlideIn('left', 20),
  slideRight: createSlideIn('right', 20),
  
  scaleIn: {
    hidden: { opacity: 0, scale: shouldReduceMotion() ? 1 : 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: shouldReduceMotion() ? 0.1 : 0.3 }
    }
  },
  
  bounce: createBounce(1.1),
  
  rotate: {
    animate: {
      rotate: shouldReduceMotion() ? 0 : 360,
      transition: {
        duration: shouldReduceMotion() ? 0 : 1,
        repeat: shouldReduceMotion() ? 0 : Infinity,
        ease: "linear"
      }
    }
  }
};

// Export motion preferences for components to use
export const motionPreferences = {
  shouldReduceMotion: shouldReduceMotion(),
  defaultDuration: shouldReduceMotion() ? 0.1 : 0.3,
  defaultEase: "easeOut"
};