# UI COMPONENTS KNOWLEDGE

**Purpose:** shadcn/ui base component library (52 components, 4038 lines)

## OVERVIEW
52 pre-built UI components from shadcn/ui providing consistent design system with Radix UI primitives and Tailwind CSS styling. No custom logic - pure presentation layer.

## STRUCTURE
```
ui/
├── accordion.tsx          # Collapsible content
├── alert-dialog.tsx       # Alert modals
├── avatar.tsx            # User avatars
├── badge.tsx             # Status badges
├── button.tsx            # Primary buttons
├── card.tsx              # Card containers
├── checkbox.tsx          # Checkboxes
├── command.tsx           # Command palette
├── dialog.tsx            # Dialogs
├── dropdown-menu.tsx      # Dropdowns
├── form.tsx              # Form components
├── input.tsx             # Text inputs
├── label.tsx             # Form labels
├── popover.tsx           # Popovers
├── progress.tsx          # Progress bars
├── radio-group.tsx       # Radio buttons
├── resizable.tsx          # Resizable panels
├── scroll-area.tsx       # Custom scrollbars
├── select.tsx            # Select dropdowns
├── separator.tsx         # Dividers
├── sheet.tsx             # Side sheets
├── skeleton.tsx          # Loading skeletons
├── slider.tsx            # Range sliders
├── switch.tsx            # Toggle switches
├── table.tsx             # Data tables
├── tabs.tsx              # Tab navigation
├── toast.tsx             # Toast notifications
├── toggle.tsx            # Toggle buttons
├── tooltip.tsx           # Tooltips
└── ... (30 more components)
```

## WHERE TO LOOK
| Task | Component | Notes |
|------|-----------|-------|
| **Data cards** | card.tsx, CustomBadge.tsx | Base for all feed components |
| **Buttons** | button.tsx | Primary action buttons |
| **Loading states** | skeleton.tsx | Loading placeholders |
| **Modals** | dialog.tsx, sheet.tsx | Overlay components |
| **Form inputs** | input.tsx, select.tsx | Data entry components |

## CONVENTIONS

**Composition Pattern**:
```typescript
// All components use Radix UI primitives
import * as Dialog from "@radix-ui/react-dialog";

// Consistent className structure
className={cn(
  "fixed left-0 right-0 z-50 flex",
  className
)}
```

**Styling Convention**:
- All styling via Tailwind CSS utility classes
- CSS variables for theming (hsl-based)
- `cn()` utility for conditional class merging

**Component Structure**:
```typescript
interface ComponentProps {
  // ...props
}

const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("base-classes", className)} {...props}>
        {/* content */}
      </div>
    );
  }
);
Component.displayName = ComponentName;
```

**No Business Logic**:
- Pure presentation components only
- No state management (except controlled inputs)
- No data fetching
- No API calls

## ANTI-PATTERNS (THIS MODULE)

**❌ DON'T**:
- Add business logic to shadcn/ui components
- Modify core shadcn/ui files directly (create wrapper components)
- Skip className prop support (breaks customization)
- Hardcode colors or spacing (use Tailwind utilities)

**✅ DO**:
- Use as-is from shadcn/ui
- Extend via className prop for custom styling
- Keep all business logic in parent components
- Follow existing component patterns for new components
