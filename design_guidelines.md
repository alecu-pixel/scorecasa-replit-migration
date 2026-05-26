# ScoreCasa - Design Guidelines

## Design Approach

**System Selection**: Modern Data Dashboard with Vibrant Warm Aesthetic
- Primary inspiration: Linear (typography & spacing) + Stripe (data visualization) + Notion (information hierarchy)
- Color inspiration: Warm peachy-orange backgrounds with rich golden and coral accents
- Rationale: This is a utility-focused, information-dense analytical tool requiring clarity, scannable data displays, and professional credibility with an inviting, sophisticated visual warmth

## Color Palette

**Light Mode**:
- **Background**: Warm peachy cream (HSL 25, 55%, 96%) - Soft, inviting base
- **Cards**: Light peach (HSL 25, 45%, 98%) - Subtle elevation
- **Foreground/Text**: Rich purple (HSL 255, 40%, 38%) - Sophisticated purple text inspired by the purple suit, optimized for readability
- **Primary**: Vibrant cyan blue (HSL 195, 85%, 52%) - Bright blue from the blue suit for icons and metric squares
- **Secondary**: Golden yellow (HSL 45, 90%, 55%) - Vibrant golden accent
- **Accent**: Soft coral pink (HSL 355, 75%, 70%) - Energetic secondary color
- **Charts**: Cyan blue, golden yellow, coral pink, warm orange, purple

**Dark Mode**:
- **Background**: Deep warm brown (HSL 30, 25%, 10%)
- **Cards**: Warm charcoal (HSL 30, 22%, 14%)
- **Foreground/Text**: Light purple (HSL 255, 45%, 85%) - Soft purple for dark mode readability
- **Primary**: Vibrant cyan blue (HSL 195, 85%, 52%) - Bright blue for icons and metric squares
- **Secondary**: Golden yellow (HSL 45, 90%, 65%)
- **Accent**: Soft coral pink (HSL 355, 75%, 65%)

## Typography System

**Font Families**:
- Primary (UI): Inter (via Google Fonts CDN)
- Monospace (Data/Numbers): JetBrains Mono

**Hierarchy**:
- Page Headers: 3xl to 4xl, font-semibold (600)
- Section Titles: xl to 2xl, font-semibold (600)
- Card Headers: lg, font-medium (500)
- Body Text: base, font-normal (400)
- Data Labels: sm, font-medium (500), uppercase, tracking-wide
- Metric Values: 2xl to 4xl, font-bold (700), monospace for numbers
- Supporting Text: sm, font-normal (400)

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 3, 4, 6, 8, 12, 16, 20, 24
- Component padding: p-4 to p-6 for cards
- Section spacing: py-12 to py-20
- Grid gaps: gap-4 to gap-6
- Element margins: mb-3, mb-4, mb-6 for vertical rhythm

**Container Strategy**:
- Main container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Dashboard grid: 12-column responsive grid
- Card layouts: Grid with 1-2-3 column breakpoints (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)

## Component Library

### Navigation
- Top navigation bar with logo, key actions, and user menu
- Sticky positioning on scroll
- Height: h-16
- Padding: px-6

### Search & Input Section
- Prominent search bar as hero element (not traditional hero with image)
- Large input field with search icon (h-14 to h-16)
- Clear visual hierarchy with supporting text below
- Real-time validation feedback
- API status indicators (loading, success, error states using lucide-react icons)

### Score Display
- Large, centered investment score (1-10) as primary focal point
- Circular progress indicator or large number display
- Size: 120px to 160px diameter
- Score breakdown in horizontal bar chart showing weighted categories

### Metrics Dashboard
- Six primary metric cards in 2x3 or 3x2 grid:
  1. Market Strength
  2. Demographic Trends
  3. School Quality
  4. Safety Score
  5. Walkability
  6. Rental Potential
- Each card contains:
  - Icon (from lucide-react: Home, TrendingUp, Users, GraduationCap, Shield, DollarSign)
  - Metric name (sm, uppercase, tracking-wide)
  - Score value (3xl to 4xl, font-bold, monospace)
  - Brief description or trend indicator
  - Visual progress bar or sparkline

### Data Cards
- Clean, bordered cards with subtle shadows (shadow-sm)
- Rounded corners: rounded-lg
- White background with hover states (subtle border highlight)
- Internal padding: p-6
- Organized sections for:
  - Property Details (price, bedrooms, sqft, year built)
  - Demographics (income, population, employment, education)
  - Location Metrics (walk score, transit score, bike score, amenity count)
  - Growth Trends (5-year population, income, housing growth)
  - Market Data (appreciation, days on market, rental yield)

### AI Reasoning Section
- Prominent text area displaying OpenAI-generated analysis
- Left-aligned, prose-style formatting (max-w-prose)
- Typography: base to lg, line-height relaxed
- Background: subtle gray or white card
- Icon indicator showing AI-powered content

### Loading States
- Skeleton screens for each metric card while loading
- Inline spinners (Loader icon from lucide-react) for API calls
- API status badges showing real-time connection status:
  - Census API: CheckCircle (success), Loader (loading), XCircle (error)
  - Growth Data API: Same pattern
  - Walkability API: Same pattern

### Interactive Elements
- Primary CTA button: "Analyze Property" (h-12, px-8, font-medium)
- Secondary actions: Reset, Export Report
- Hover states: Subtle scale and shadow transitions
- Disabled states: Reduced opacity (opacity-50)

## Information Architecture

**Page Structure**:
1. Header/Navigation (h-16)
2. Search Input Section (py-12 to py-16)
   - Large search field
   - API status indicators
   - Quick tips or example addresses
3. Investment Score Display (py-8) - only shown when results loaded
   - Prominent 1-10 score
   - Score breakdown visualization
4. Metrics Grid (py-8) - 6 metric cards
5. Detailed Data Sections (py-8)
   - Property Details (2-column grid)
   - Demographics & Growth (2-column grid)
   - Location & Walkability (2-column grid)
   - Market Analysis (full-width or 2-column)
6. AI Analysis & Reasoning (py-8)
   - Full-width prose section
7. Footer (minimal, py-6)

## Visual Patterns

**Cards & Containers**:
- Border: border border-gray-200
- Background: bg-white
- Hover: border-gray-300 transition
- Shadow: shadow-sm on default, shadow-md on hover

**Status Indicators**:
- Success: Green accent with CheckCircle icon
- Loading: Blue/gray accent with animated Loader icon
- Error: Red accent with XCircle icon
- Warning: Amber accent with AlertCircle icon

**Data Visualization**:
- Progress bars for scores (horizontal bars with percentage fills)
- Simple bar charts for score breakdowns
- Trend indicators (up/down arrows with percentages)
- Color coding: Green (positive), Red (negative), Gray (neutral)

## Icons

**Library**: Lucide React (via npm, already in code)
- Size: 20px (w-5 h-5) for inline, 24px (w-6 h-6) for card headers
- Consistent throughout: Search, Home, TrendingUp, Users, GraduationCap, Shield, Building, DollarSign, MapPin, AlertCircle, CheckCircle, XCircle, Loader

## Responsive Behavior

**Breakpoints**:
- Mobile (base): Single column, stacked metrics
- Tablet (md): 2-column grid for metrics
- Desktop (lg): 3-column grid for metrics, full dashboard layout

**Mobile Optimizations**:
- Larger touch targets (min h-12)
- Simplified metric displays
- Collapsible sections for detailed data
- Fixed search bar at top

## Images

No hero images required. This is a data-forward application where the search input and results are the primary interface. The design emphasizes clarity, scannability, and professional data presentation over visual marketing elements.