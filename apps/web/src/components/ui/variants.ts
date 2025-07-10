/**
 * Component Variants using Class Variance Authority
 * Provides consistent styling for UI components
 */

import { cva, type VariantProps } from 'class-variance-authority'

// Card variants for different use cases
export const cardVariants = cva(
  'rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'bg-white border-slate-200/80',
        elevated: 'bg-white border-slate-200/80 shadow-lg',
        luxury: 'bg-gradient-to-br from-white via-slate-50 to-white border-slate-200/80 shadow-xl',
        glass: 'bg-white/80 backdrop-blur-sm border-white/20',
      },
      size: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      hover: {
        none: '',
        lift: 'hover:shadow-xl hover:-translate-y-1',
        scale: 'hover:scale-105',
        glow: 'hover:shadow-2xl hover:shadow-primary/20',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      hover: 'lift',
    },
  }
)

// Button variants (extending existing button component)
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        luxury: 'bg-gradient-to-r from-slate-800 to-slate-900 text-white hover:from-slate-700 hover:to-slate-800 shadow-lg',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 py-2',
        lg: 'h-11 px-8',
        xl: 'h-12 px-10 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

// Badge variants for fragrance categories
export const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground border border-input',
        // Fragrance-specific variants
        season: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        occasion: 'bg-amber-100 text-amber-800 border-amber-200',
        mood: 'bg-violet-100 text-violet-800 border-violet-200',
        performance: 'bg-blue-100 text-blue-800 border-blue-200',
        year: 'bg-slate-100 text-slate-700 border-slate-200',
        concentration: 'bg-purple-100 text-purple-800 border-purple-200',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

// Input variants for forms
export const inputVariants = cva(
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input',
        error: 'border-destructive focus-visible:ring-destructive',
        success: 'border-emerald-500 focus-visible:ring-emerald-500',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        md: 'h-9 px-3',
        lg: 'h-11 px-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

// Loading states
export const loadingVariants = cva(
  'animate-pulse rounded-md bg-muted',
  {
    variants: {
      variant: {
        text: 'h-4 w-full',
        title: 'h-6 w-3/4',
        button: 'h-10 w-24',
        avatar: 'h-10 w-10 rounded-full',
        card: 'h-48 w-full',
      },
    },
    defaultVariants: {
      variant: 'text',
    },
  }
)

// Fragrance card specific variants
export const fragranceCardVariants = cva(
  'group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'bg-white border-slate-200/80 hover:shadow-xl hover:-translate-y-1',
        luxury: 'bg-gradient-to-br from-white via-slate-50 to-white border-slate-200/80 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2',
        compact: 'bg-white border-slate-200/80 hover:shadow-lg hover:-translate-y-0.5',
      },
      size: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

// Export types for TypeScript
export type CardVariants = VariantProps<typeof cardVariants>
export type ButtonVariants = VariantProps<typeof buttonVariants>
export type BadgeVariants = VariantProps<typeof badgeVariants>
export type InputVariants = VariantProps<typeof inputVariants>
export type LoadingVariants = VariantProps<typeof loadingVariants>
export type FragranceCardVariants = VariantProps<typeof fragranceCardVariants>

// Export all variants
export {
  cardVariants,
  buttonVariants,
  badgeVariants,
  inputVariants,
  loadingVariants,
  fragranceCardVariants,
}
