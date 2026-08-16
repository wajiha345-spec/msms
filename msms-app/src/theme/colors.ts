// Single-hue palette — every accent in the app is a tint or shade of the
// real logo color (#4B2FC4, sampled directly from assets/smartshop-mark.png;
// the website's --brand/--brand-strong were already set to this same pair).
// The old primary (#6C63FF) was a generic placeholder that never actually
// matched the logo. success/danger/warning/info used to be green/red/amber/
// blue; they're now lightness steps of this one purple instead — lighter
// for positive/lower-emphasis states, darker for negative/high-emphasis
// ones — so meaning comes from shade, not hue.
export const colors = {
  primary:      '#4B2FC4', // true logo color
  primaryDark:  '#34208C', // dark shade — negative/high-emphasis states
  primaryMid:   '#6C4FD1', // medium shade — warnings, secondary accents
  primaryLight: '#8B7FE0', // light shade — positive/low-emphasis states
  primarySoft:  '#EDE6FB', // pale tint — alert/callout box backgrounds
  primaryBorder:'#C9BEF2', // light-medium tint — alert/callout box borders
  background: '#F8F9FA',
  card:       '#FFFFFF',
  text:       '#1A1A2E',
  textMuted:  '#6B7280',
  border:     '#E5E7EB',
  success:    '#8B7FE0', // was green — now the light shade (e.g. "Mark Paid")
  danger:     '#34208C', // was red — now the dark shade
  warning:    '#6C4FD1', // was amber — now the medium shade
  info:       '#4B2FC4', // was blue — now the base logo color
};