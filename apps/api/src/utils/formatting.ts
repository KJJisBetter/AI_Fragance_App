// Utility functions for formatting fragrance data

/**
 * Converts kebab-case or snake_case to Title Case
 * Examples:
 * - "aventus-absolu" -> "Aventus Absolu"
 * - "tom-ford" -> "Tom Ford"
 * - "yves-saint-laurent" -> "Yves Saint Laurent"
 */
export const formatName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';

  return name
    .replace(/[-_]/g, ' ')  // Replace hyphens and underscores with spaces
    .split(' ')
    .map(word => {
      // Handle special cases
      if (word.toLowerCase() === 'de') return 'de';
      if (word.toLowerCase() === 'la') return 'la';
      if (word.toLowerCase() === 'le') return 'le';
      if (word.toLowerCase() === 'du') return 'du';
      if (word.toLowerCase() === 'al') return 'al';
      if (word.toLowerCase() === 'el') return 'el';
      if (word.toLowerCase() === 'von') return 'von';
      if (word.toLowerCase() === 'van') return 'van';
      if (word.toLowerCase() === 'and') return 'and';
      if (word.toLowerCase() === 'for') return 'for';
      if (word.toLowerCase() === 'by') return 'by';
      if (word.toLowerCase() === 'the') return 'the';

      // Capitalize first letter, keep rest lowercase
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();
};

/**
 * Formats brand names with special handling for common brands
 */
export const formatBrandName = (brand: string): string => {
  if (!brand || typeof brand !== 'string') return '';

  const formatted = formatName(brand);

  // Handle specific brand exceptions
  const brandExceptions: { [key: string]: string } = {
    'Yves Saint Laurent': 'Yves Saint Laurent',
    'Jean Paul Gaultier': 'Jean Paul Gaultier',
    'Giorgio Armani': 'Giorgio Armani',
    'Dolce Gabbana': 'Dolce & Gabbana',
    'Dolce And Gabbana': 'Dolce & Gabbana',
    'Viktor Rolf': 'Viktor & Rolf',
    'Viktor And Rolf': 'Viktor & Rolf',
    'Tom Ford': 'Tom Ford',
    'Marc Jacobs': 'Marc Jacobs',
    'Calvin Klein': 'Calvin Klein',
    'Ralph Lauren': 'Ralph Lauren',
    'Thierry Mugler': 'Thierry Mugler',
    'Issey Miyake': 'Issey Miyake',
    'Kenzo': 'Kenzo',
    'Versace': 'Versace',
    'Prada': 'Prada',
    'Gucci': 'Gucci',
    'Chanel': 'Chanel',
    'Dior': 'Dior',
    'Hermes': 'Hermès',
    'Creed': 'Creed',
    'Amouage': 'Amouage',
    'Maison Margiela': 'Maison Margiela',
    'Le Labo': 'Le Labo',
    'Byredo': 'Byredo'
  };

  return brandExceptions[formatted] || formatted;
};

/**
 * Formats fragrance names with special handling
 */
export const formatFragranceName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';

  // Handle very short or pure numeric names
  if (name.length <= 2 || /^\d+$/.test(name.trim())) {
    return name.toUpperCase(); // Keep short names/numbers as uppercase
  }

  // Handle names that are just numbers with letters (like "0", "0 9", etc.)
  if (/^\d+(\s+\d+)*$/.test(name.trim())) {
    return name.toUpperCase(); // Keep number combinations as uppercase
  }

  // Handle names that start with numbers followed by words
  if (/^\d+\s+[a-zA-Z-]+/.test(name.trim())) {
    const parts = name.trim().split(/(\d+)/);
    return parts.map(part => {
      if (/^\d+$/.test(part)) {
        return part; // Keep numbers as is
      }
      return formatName(part);
    }).join('');
  }

  // Handle URLs or codes that shouldn't be formatted
  if (name.includes('http') || name.includes('www') || name.includes('@')) {
    return name; // Keep URLs/emails as is
  }

  // Handle very weird names - if they contain mostly special characters, keep them as-is
  const specialCharCount = (name.match(/[^a-zA-Z0-9\s-]/g) || []).length;
  if (specialCharCount > name.length * 0.3) {
    return name; // Keep weird names as-is if >30% special characters
  }

  let formatted = formatName(name);

  // Handle specific fragrance naming patterns
  formatted = formatted
    .replace(/\bEdt\b/g, 'EDT')
    .replace(/\bEdp\b/g, 'EDP')
    .replace(/\bPdt\b/g, 'PDT')
    .replace(/\bEdc\b/g, 'EDC')
    .replace(/\bParfum\b/g, 'Parfum')
    .replace(/\bCologne\b/g, 'Cologne')
    .replace(/\bOud\b/g, 'Oud')
    .replace(/\bOudh\b/g, 'Oudh')
    .replace(/\bNo\s+(\d+)/g, 'No.$1')
    .replace(/\bN\s+(\d+)/g, 'N°$1')
    .replace(/\b(\d+)\s+Ml\b/g, '$1ml')
    .replace(/\bMl\b/g, 'ml')
    .replace(/\bFor\s+Men\b/g, 'for Men')
    .replace(/\bFor\s+Women\b/g, 'for Women')
    .replace(/\bFor\s+Him\b/g, 'for Him')
    .replace(/\bFor\s+Her\b/g, 'for Her');

  return formatted;
};

/**
 * Formats a complete fragrance object with proper naming
 */
export const formatFragrance = (fragrance: any) => {
  return {
    ...fragrance,
    name: formatFragranceName(fragrance.name),
    brand: formatBrandName(fragrance.brand)
  };
};
