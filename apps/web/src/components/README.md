# Fragrance Battle AI - Component Library

## 🎨 Design System Foundation

This component library is built for a **premium fragrance discovery platform** with a **FragranceNet-inspired** aesthetic. All components follow our established design tokens and support the upcoming UI redesign.

## 📁 Component Organization

```
src/components/
├── ui/                     # Base UI components (shadcn/ui style)
│   ├── button.tsx         # Button with CVA variants
│   ├── card.tsx           # Card layouts
│   ├── input.tsx          # Form inputs
│   ├── badge.tsx          # Status badges
│   ├── dialog.tsx         # Modal dialogs
│   └── variants.ts        # CVA variant definitions
├── fragrance/             # Fragrance-specific components
│   ├── FragranceCard.tsx  # Main fragrance display card
│   ├── FragranceGrid.tsx  # Grid layout for fragrances
│   └── FragranceFilters.tsx
├── search/               # Search-related components
│   ├── GlobalSearch.tsx  # Main search interface
│   ├── SearchBar.tsx     # Simple search input
│   └── SearchResults.tsx
├── layout/               # Layout components
│   ├── Layout.tsx        # Main app layout
│   ├── Navigation.tsx    # Navigation components
│   └── Sidebar.tsx
└── common/               # Shared utility components
    ├── LoadingStates.tsx # Loading skeletons
    ├── ErrorBoundary.tsx # Error handling
    └── VirtualizedList.tsx
```

## 🎯 Component Standards

### **Naming Conventions**
- **PascalCase** for component files: `FragranceCard.tsx`
- **camelCase** for props: `fragranceData`, `isLoading`
- **kebab-case** for CSS classes: `fragrance-card`, `search-input`

### **Props Patterns**
```typescript
interface ComponentProps {
  // Required props first
  data: FragranceData

  // Optional props with defaults
  variant?: 'default' | 'luxury' | 'compact'
  size?: 'sm' | 'md' | 'lg'

  // Event handlers
  onClick?: (item: FragranceData) => void
  onLoad?: () => void

  // Style overrides
  className?: string

  // Children (if container component)
  children?: React.ReactNode
}
```

### **File Structure Template**
```typescript
// 1. Imports (external first, then internal)
import React from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

// 2. Types and interfaces
interface ComponentProps {
  // ...
}

// 3. Component implementation
export const ComponentName: React.FC<ComponentProps> = ({
  // Destructure props with defaults
  variant = 'default',
  className,
  ...props
}) => {
  return (
    <div className={cn('base-classes', variants[variant], className)}>
      {/* Component content */}
    </div>
  )
}

// 4. Default export (if needed)
export default ComponentName
```

## 🧩 Component Categories

### **1. Base UI Components (`/ui`)**

#### **Button**
```typescript
<Button variant="luxury" size="lg" onClick={handleClick}>
  Discover Fragrances
</Button>
```
**Variants:** `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`, `luxury`
**Sizes:** `sm`, `md`, `lg`, `xl`, `icon`

#### **Card**
```typescript
<Card variant="luxury" hover="lift">
  <CardHeader>
    <CardTitle>Fragrance Collection</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```
**Variants:** `default`, `elevated`, `luxury`, `glass`
**Hover:** `none`, `lift`, `scale`, `glow`

#### **Badge**
```typescript
<Badge variant="season">Spring</Badge>
<Badge variant="concentration">EDP</Badge>
<Badge variant="year">2023</Badge>
```
**Variants:** `season`, `occasion`, `mood`, `performance`, `year`, `concentration`

### **2. Fragrance Components (`/fragrance`)**

#### **FragranceCard**
Main component for displaying fragrance information.

```typescript
<FragranceCard
  fragrance={fragranceData}
  variant="luxury"
  onClick={handleCardClick}
/>
```

**Props:**
- `fragrance: Fragrance` - Fragrance data object
- `variant?: 'default' | 'luxury' | 'compact'` - Visual style
- `onClick?: (fragrance: Fragrance) => void` - Click handler

**Features:**
- Responsive design
- Hover animations
- Accessibility support
- Loading states

### **3. Search Components (`/search`)**

#### **GlobalSearch**
Advanced search interface with filters and suggestions.

```typescript
<GlobalSearch
  isOpen={isSearchOpen}
  onClose={handleClose}
/>
```

**Features:**
- Voice search support
- Real-time suggestions
- Keyboard navigation
- Search analytics

### **4. Layout Components (`/layout`)**

#### **Layout**
Main application layout with navigation and search.

```typescript
<Layout>
  <Outlet />
</Layout>
```

**Features:**
- Responsive navigation
- Search integration
- Theme support
- Mobile optimization

## 🎨 Styling Guidelines

### **Primary Approach**
- ✅ **Tailwind CSS** with design tokens
- ✅ **CVA (Class Variance Authority)** for component variants
- ✅ **CSS Custom Properties** for theming
- ✅ **Radix UI** for complex interactive components

### **Avoid**
- ❌ Inline styles (except dynamic values)
- ❌ CSS modules for new components
- ❌ Direct CSS classes without design system

### **Example Implementation**
```typescript
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva(
  // Base classes
  'rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'bg-white border-slate-200/80',
        luxury: 'bg-gradient-to-br from-white via-slate-50 to-white border-slate-200/80 shadow-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export const Card = ({ variant, className, ...props }) => (
  <div className={cn(cardVariants({ variant }), className)} {...props} />
)
```

## 🔧 Development Workflow

### **Creating New Components**
1. **Plan the API** - Define props and behavior
2. **Choose base patterns** - Use existing variants where possible
3. **Implement with accessibility** - ARIA labels, keyboard navigation
4. **Test responsiveness** - Mobile-first approach
5. **Document usage** - Add to this README

### **Updating Existing Components**
1. **Check current usage** - Find all instances
2. **Plan backward compatibility** - Avoid breaking changes
3. **Update gradually** - One component at a time
4. **Test thoroughly** - Ensure no regressions

## 🚀 Ready for UI Redesign

### **Foundation Complete**
- ✅ Design tokens established
- ✅ Component variants created
- ✅ Documentation structure ready
- ✅ Type safety implemented
- ✅ Accessibility patterns defined

### **Next Steps for UI Redesign**
1. **Apply FragranceNet visual style** to existing components
2. **Enhance animations** with Framer Motion
3. **Add premium interactions** (hover effects, transitions)
4. **Implement luxury color palette** from design tokens
5. **Optimize for perfume imagery** and visual hierarchy

### **Designer Handoff Ready**
- Color system defined with CSS custom properties
- Component variants support design system scales
- Responsive patterns established
- Animation foundations in place

---

## 📞 Component Support

For questions about component usage or new component requests:
1. Check this documentation first
2. Review existing similar components
3. Follow established patterns
4. Maintain consistency with design system

**Happy coding! 🧪✨**
