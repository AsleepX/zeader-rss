export function hexToRgb(hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
    : null;
}

export function generatePalette(hex) {
    const rgbStr = hexToRgb(hex);
    if (!rgbStr) return null;
    
    const rgb = rgbStr.split(' ').map(Number);
    
    const mix = (c1, c2, weight) => {
        const w = weight / 100;
        const r = Math.round(c1[0] * w + c2[0] * (1 - w));
        const g = Math.round(c1[1] * w + c2[1] * (1 - w));
        const b = Math.round(c1[2] * w + c2[2] * (1 - w));
        return `${r} ${g} ${b}`;
    };
    
    const white = [255, 255, 255];
    const black = [0, 0, 0];
    
    // Assuming the input color is the "600" level (primary action color)
    return {
        50: mix(white, rgb, 95),
        100: mix(white, rgb, 90),
        200: mix(white, rgb, 80),
        300: mix(white, rgb, 70),
        400: mix(white, rgb, 40),
        500: mix(white, rgb, 20),
        600: `${rgb[0]} ${rgb[1]} ${rgb[2]}`,
        700: mix(black, rgb, 20),
        800: mix(black, rgb, 40),
        900: mix(black, rgb, 60),
        950: mix(black, rgb, 80),
    };
}
