// Helper to extract the first letter of the last word of a name
// e.g. "Lê Dương" -> last word is "Dương" -> returns "D"
// e.g. "Nguyễn Văn Anh" -> last word is "Anh" -> returns "A"
export function getInitials(name: string): string {
  if (!name || name.trim() === '') return 'U';
  const parts = name.trim().split(/\s+/);
  const lastWord = parts[parts.length - 1];
  return lastWord ? lastWord.charAt(0).toUpperCase() : name.charAt(0).toUpperCase();
}

// Helper to check if a string is a valid HTTP/HTTPS URL
export function isUrl(str: string | undefined): boolean {
  if (!str) return false;
  // If it's an Unsplash placeholder, treat it as "no custom avatar"
  // so it correctly triggers the premium initials fallback (e.g. Lê Dương -> D)
  if (str.includes('images.unsplash.com')) return false;
  return str.startsWith('http://') || str.startsWith('https://');
}

// Helper to generate a consistent premium gradient color based on member ID
export function getAvatarColor(id: string | undefined): string {
  if (!id) return 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white';
  
  const colors = [
    'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white',
    'bg-gradient-to-tr from-teal-500 to-cyan-400 text-white',
    'bg-gradient-to-tr from-indigo-500 to-purple-400 text-white',
    'bg-gradient-to-tr from-purple-500 to-pink-400 text-white',
    'bg-gradient-to-tr from-rose-500 to-orange-400 text-white',
    'bg-gradient-to-tr from-amber-500 to-yellow-400 text-white',
    'bg-gradient-to-tr from-sky-500 to-blue-400 text-white',
    'bg-gradient-to-tr from-fuchsia-500 to-pink-500 text-white',
  ];
  
  let sum = 0;
  for (let i = 0; i < id.length; i++) {
    sum += id.charCodeAt(i);
  }
  
  return colors[sum % colors.length];
}
