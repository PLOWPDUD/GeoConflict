
export const generateFlag = (baseColor: string): string => {
  const width = 64;
  const height = 40;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';

  // Helper for random colors
  const randomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  // Helper for contrasting color
  const contrastColor = (hex: string) => {
      // Simple logic: if dark, return light, else dark
      // For now, just return random or white/black
      return Math.random() > 0.5 ? '#ffffff' : '#000000';
  };

  // Background
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  const patternType = Math.floor(Math.random() * 6);
  const secondaryColor = randomColor();
  const tertiaryColor = randomColor();

  switch (patternType) {
    case 0: // Horizontal Stripes (2 or 3)
      const stripes = Math.floor(Math.random() * 2) + 2; // 2 or 3
      const h = height / stripes;
      for(let i=0; i<stripes; i++) {
          ctx.fillStyle = i % 2 === 0 ? baseColor : secondaryColor;
          ctx.fillRect(0, i*h, width, h);
      }
      break;
    
    case 1: // Vertical Stripes (2 or 3)
      const vStripes = Math.floor(Math.random() * 2) + 2; // 2 or 3
      const w = width / vStripes;
      for(let i=0; i<vStripes; i++) {
          ctx.fillStyle = i % 2 === 0 ? baseColor : secondaryColor;
          ctx.fillRect(i*w, 0, w, height);
      }
      break;

    case 2: // Cross (Nordic or Centered)
      ctx.fillStyle = secondaryColor;
      const thickness = Math.floor(Math.random() * 8) + 8;
      const offset = Math.random() > 0.5 ? width / 3 : width / 2; // Nordic vs Centered
      
      // Vertical bar
      ctx.fillRect(offset - thickness/2, 0, thickness, height);
      // Horizontal bar
      ctx.fillRect(0, height/2 - thickness/2, width, thickness);
      break;

    case 3: // Circle / Sun
      ctx.fillStyle = secondaryColor;
      const radius = Math.floor(Math.random() * 10) + 8;
      ctx.beginPath();
      ctx.arc(width/2, height/2, radius, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 4: // Triangle on hoist
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width/2, height/2);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
      break;

    case 5: // Diagonal / Saltire
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = Math.floor(Math.random() * 8) + 8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, height);
      ctx.stroke();
      
      if (Math.random() > 0.5) {
          ctx.beginPath();
          ctx.moveTo(width, 0);
          ctx.lineTo(0, height);
          ctx.stroke();
      }
      break;
  }

  // Optional: Add a symbol or emblem in center (star, diamond, etc)
  if (Math.random() < 0.3) {
      ctx.fillStyle = tertiaryColor;
      const size = 8;
      ctx.beginPath();
      ctx.moveTo(width/2, height/2 - size);
      ctx.lineTo(width/2 + size, height/2);
      ctx.lineTo(width/2, height/2 + size);
      ctx.lineTo(width/2 - size, height/2);
      ctx.closePath();
      ctx.fill();
  }

  return canvas.toDataURL();
};
