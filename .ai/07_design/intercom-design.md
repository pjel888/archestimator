# Intercom Homepage Design Specification

## 1. Overview
This document outlines the design specifications for the Intercom homepage, focusing on a clean, reusable, and implementation-ready approach. The page serves as a SaaS homepage, aiming to convert visitors into trial users by highlighting the unique value proposition of Intercom's AI Agent-powered helpdesk.

## 2. Experience Goals
*   **Clarity:** Clearly communicate the core benefit of Intercom's AI Agent.
*   **Engagement:** Encourage exploration of product features and customer success stories.
*   **Conversion:** Drive users to "Start free trial" or "View demo."
*   **Trust:** Build credibility through social proof and transparent pricing.

## 3. Information Architecture
The page is structured to progressively introduce Intercom's offerings, starting with the core AI Agent concept and moving through detailed features, social proof, and pricing.

*   **Header:** Global navigation with product, customer, resources, pricing, login, and trial/demo CTAs.
*   **Hero:** Introduces the "AI Agent era" and key value propositions.
*   **Solution Overview:** Details the complete solution for AI and human agents.
*   **Feature Deep Dive:** Explores specific AI-powered helpdesk features (Copilot, ticketing, automations).
*   **Engagement Features:** Highlights onboarding tools, proactive notifications, and targeted messaging.
*   **Insights & Monitoring:** Focuses on analytics, QA, and reporting capabilities.
*   **Partnership & Trust:** Emphasizes expertise, security, and support.
*   **Testimonials:** Social proof from customer quotes.
*   **Pricing:** Transparent pricing for Intercom with Fin.
*   **Footer CTA:** Final call to action for trial/demo.
*   **Footer:** Comprehensive links to features, pricing, learning resources, and company information.

## 4. Layout System
The layout primarily utilizes a responsive CSS Grid and Flexbox system, ensuring adaptability across various screen sizes.

*   **Grid:** `grid-template-columns: repeat(12, minmax(0, 1fr))` for main content areas, with variations like `repeat(2, minmax(0, 1fr))`, `repeat(3, minmax(0, 1fr))`, and `repeat(5, minmax(0, 1fr))` for specific sections.
*   **Flexbox:** Used for alignment (`align-items: center`, `flex-start`) and distribution (`justify-content: space-between`, `center`, `flex-start`).
*   **Positioning:** `position: relative`, `absolute`, `fixed` are used for layered elements and persistent components like the header.

## 5. Section-by-Section Design Spec

*   **Hero:** Large headline, descriptive paragraph, primary and secondary CTAs. Features a rotating gallery of product imagery.
*   **Solution Overview:** Two-column layout on larger screens, stacking on smaller. Combines text, CTAs, and supporting imagery.
*   **Feature Deep Dive:** Accordion-like sections for detailed features, each with a title, description, "Learn more" link, and accompanying product UI imagery.
*   **Partnership:** Three-column layout for trust-building elements (security, expert support, AI blueprint).
*   **Testimonials:** Quote block with author and company, often paired with a background image.
*   **Pricing:** Centered pricing card with clear cost breakdown and a "Learn more" link.
*   **Footer CTA:** Prominent call to action with background imagery.

## 6. Component Inventory

*   **Buttons:** Primary, secondary, and tertiary styles.
*   **Navigation Links:** Standard text links, some with hover effects.
*   **Cards:** Used for feature highlights and partnership details, with minimal styling.
*   **Accordion/Collapsible Panels:** For detailed feature descriptions.
*   **Image Gallery/Carousel:** Featured in the Hero section.
*   **Logo Wall:** For social proof.
*   **Testimonial Block:** Quote, attribution, and optional image.

## 7. Visual Design Specification

### 7.1. Typography
*   **Sans-serif:** `var(--wsc-font-sans)`, `var(--wsc-default-font-family, ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji)`
*   **Monospace:** `var(--wsc-font-mono)`, `var(--wsc-default-mono-font-family, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace)`
*   **Custom Fonts:** `MediumLL`, `IvoryLL` (with `Fallback` options).
*   **Headings:** `text-heading-2`, `text-heading-3`, `text-heading-5`.
*   **Body Text:** `text-body-lg`, `text-body-xl`, `text-body`.
*   **Button Text:** `text-transform: uppercase`.

### 7.2. Color and Surfaces
*   **Primary Text:** `#020917`, `#313130`
*   **Secondary Text/Accent:** `#626260`, `#7b7b78`, `#9c9fa5`, `#84878f`, `#393f4b`, `#151b29`
*   **Backgrounds:** `#fff` (white), `#f4f3ec` (off-white), `#f6f6f1` (chalk), `#e0e0d9`
*   **Interactive/Brand:** `#000ce1` (blue)
*   **Borders:** `#cecfd2`, `#c5c5c1`
*   **Shadows:** `none`, `var(--tw-shadow)` (subtle box-shadows), `0 0 #0000` (transparent).
*   **Dark Mode:** Detected signals indicate support for a dark theme. Specific color tokens for dark mode need confirmation.

### 7.3. Spacing and Rhythm
*   **Base Spacing Unit:** `var(--wsc-spacing)` is the foundational unit.
*   **Gaps:** `calc(var(--wsc-spacing)*0)` to `calc(var(--wsc-spacing)*8)`. Also `10px`.
*   **Padding:** `calc(var(--wsc-spacing)*0)` to `calc(var(--wsc-spacing)*2)`.
*   **Margins:** `0`, `-1px`.
*   **Section Padding:** `py-6`, `md:py-12`, `lg:py-16`, `py-20`, `md:py-28`.

### 7.4. Component Styling
*   **Buttons:** `border-radius: 0`, `box-shadow: none`, `text-transform: uppercase`.
*   **Cards:** `border: 0 solid`, `box-shadow: none`, `border-radius: 0`.
*   **Border Radius:** `0`, `.25rem`, `.375rem`, `10px`, `100%` (for circular elements), `var(--wsc-radius-sm)`, `var(--wsc-radius-md)`, `var(--wsc-radius-lg)`.

## 8. Responsive Behavior
*   **Breakpoints:**
    *   `@media (min-width: 40rem)`
    *   `@media (min-width: 48rem)`
    *   `@media (min-width: 80rem)`
    *   `@media screen and (min-width: 1024px)`
    *   `@media (min-width: 1200px)`
*   Layouts adapt using CSS Grid and Flexbox to reflow content, adjust column counts, and resize elements.
*   Specific elements like `br` tags are hidden on larger screens (`hidden lg:block`).

## 9. Interaction States
*   **Hover:** `(hover:hover)` media query suggests hover states are present. Specific styles for links and buttons on hover need to be confirmed visually.
*   **Focus:** `focus-visible:outline-2`, `focus-visible:outline-offset-2`, `focus-visible:outline-blue-800` indicate clear focus styles for accessibility.
*   **Accordion:** `data-open` attributes suggest state changes for collapsible content.
*   **Carousel:** `keyframes carouselAutoplay` indicates animated transitions for image galleries.

## 10. Content Requirements
*   **Headings:** Clear, concise, and hierarchical (H1, H2, H3, H4).
*   **Body Text:** Informative paragraphs supporting headings, with inline links where appropriate.
*   **CTAs:** Action-oriented and prominent (e.g., "Start free trial," "View demo," "Learn more").
*   **Imagery:** High-quality product screenshots, illustrative graphics, and decorative background images. All functional images must have descriptive `alt` text.
*   **Icons:** Inline SVGs are used for various UI elements.

## 11. Accessibility Requirements
*   **Semantic HTML:** Use appropriate heading levels, `<a>` for links, `<button>` for actions.
*   **Alt Text:** All images must have meaningful `alt` attributes.
*   **Focus States:** Clear visual focus indicators for all interactive elements.
*   **ARIA Attributes:** `aria-label`, `role`, `data-orientation` are used for enhanced screen reader experience.
*   **Dark Mode:** Support for dark mode is indicated, ensuring readability in different user preferences.

## 12. SEO Requirements
*   **Title Tag:** "Intercom | The only helpdesk designed for the AI Agent era"
*   **Meta Description:** "The only helpdesk with a natively integrated AI Agent. Deliver perfect customer experiences with the highest-performing platform. Start your free trial today."
*   **Canonical URL:** `https://www.intercom.com/`
*   **Open Graph:** Title and description for social sharing.
*   **Schema Markup:** BreadcrumbList, ItemList, Organization, Product, SoftwareApplication, WebPage, WebSite.
*   **H1:** Present and unique.

## 13. Implementation Notes
*   **Framework:** Next.js is indicated.
*   **Styling:** Likely uses a utility-first CSS framework (e.g., Tailwind CSS) given the prevalence of utility classes and CSS variables like `--tw-`.
*   **CSS Variables:** Extensive use of CSS variables (`--wsc-spacing`, `--wsc-radius-lg`, `--tw-shadow`) for design token management.
*   **Performance:** Optimize image loading (lazy loading, appropriate sizing) and script execution