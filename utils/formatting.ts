
export const toPersianDigits = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null) return '';
  const str = num.toString();
  return str.replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 1728));
};

export const toEnglishDigits = (str: string): string => {
  if (!str) return '';
  return str.replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728))
            .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1584));
};

export const formatPrice = (price: number): string => {
  return price.toLocaleString('fa-IR');
};
