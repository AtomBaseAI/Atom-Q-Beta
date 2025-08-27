
export const ACCENT_COLORS = {
  primary: { name: "Primary", value: "#70f" }
} as const

export type AccentColorType = keyof typeof ACCENT_COLORS

export function applyAccentColor(color: AccentColorType = "primary") {
  const colorValue = ACCENT_COLORS[color]?.value || ACCENT_COLORS.primary.value
  
  // Convert hex to HSL
  const hex = colorValue.replace('#', '')
  const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substr(0, 2), 16) / 255
  const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substr(2, 2), 16) / 255
  const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substr(4, 2), 16) / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  
  h = Math.round(h * 360)
  s = Math.round(s * 100)
  l = Math.round(l * 100)
  
  document.documentElement.style.setProperty('--primary', `${h} ${s}% ${l}%`)
  document.documentElement.style.setProperty('--primary-foreground', '0 0% 98%')
}
