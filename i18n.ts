import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Define translations
const resources = {
  fa: {
    translation: {
      "app_name": "لومینا",
      "welcome": "خوش آمدید",
      "dashboard": "داشبورد",
      "new_project": "پروژه جدید",
      "new_project_desc": "محاسبه قیمت و طراحی درب و پنجره",
      "profile_price": "قیمت پروفیل",
      "glass_hardware": "شیشه و یراق",
      "projects": "پروژه‌ها",
      "settings": "تنظیمات",
      "system_status": "وضعیت سیستم",
      "online": "آنلاین",
      "general": "عمومی",
      "dark_mode": "حالت شب",
      "currency": "واحد پول",
      "language": "زبان / Language",
      "calculations": "محاسبات",
      "profit_coefficient": "ضریب سود (درصد)",
      "coefficient_version": "نسخه ضرایب",
      "output_format": "فرمت خروجی",
      "version": "نسخه",
      "year": "ویژه سال",
      "management_section": "مدیریت قیمت و پروژه‌ها",
      "toman": "تومان",
      // Designer
      "unit_design": "طراحی یونیت",
      "item": "آیتم",
      "opening": "بازشو",
      "splits": "تقسیم‌بندی",
      "tools": "ابزارها",
      "fixed": "فیکس",
      "turn_right": "تک حالته (راست)",
      "turn_left": "تک حالته (چپ)",
      "tilt_turn_right": "دو حالته (راست)",
      "tilt_turn_left": "دو حالته (چپ)",
      "sliding_right": "کشویی (راست)",
      "sliding_left": "کشویی (چپ)",
      "door": "درب",
      "panel": "پنل UPVC",
      "split_v_2": "برش عمودی (۲)",
      "split_h_2": "برش افقی (۲)",
      "split_v_3": "برش عمودی (۳)",
      "split_h_3": "برش افقی (۳)",
      "clear_split": "پاکسازی برش",
      "delete_item": "حذف",
      "select": "انتخاب",
      "move": "جابجایی",
      "global_dims": "ابعاد کل پنجره",
      "section_dims": "ابعاد بخش انتخاب شده",
      "width": "عرض",
      "height": "ارتفاع",
      "add_to_list": "افزودن به لیست",
      "save_changes": "ذخیره تغییرات",
      "added": "افزوده شد",
      "calculate_invoice": "محاسبه فاکتور",
      "active_tool_hint": "حالت فعال: روی پنجره کلیک کنید"
    }
  },
  en: {
    translation: {
      "app_name": "Lumina",
      "welcome": "Welcome",
      "dashboard": "Dashboard",
      "new_project": "New Project",
      "new_project_desc": "Price calculation and design",
      "profile_price": "Profile Pricing",
      "glass_hardware": "Glass & Hardware",
      "projects": "Projects",
      "settings": "Settings",
      "system_status": "System Status",
      "online": "Online",
      "general": "General",
      "dark_mode": "Dark Mode",
      "currency": "Currency",
      "language": "Language",
      "calculations": "Calculations",
      "profit_coefficient": "Profit Margin (%)",
      "coefficient_version": "Coeff. Version",
      "output_format": "Output Format",
      "version": "Version",
      "year": "Year",
      "management_section": "Management & Projects",
      "toman": "Tomans",
      // Designer
      "unit_design": "Unit Designer",
      "item": "Item",
      "opening": "Opening",
      "splits": "Splits",
      "tools": "Tools",
      "fixed": "Fixed",
      "turn_right": "Turn Right",
      "turn_left": "Turn Left",
      "tilt_turn_right": "Tilt & Turn R",
      "tilt_turn_left": "Tilt & Turn L",
      "sliding_right": "Sliding R",
      "sliding_left": "Sliding L",
      "door": "Door",
      "panel": "UPVC Panel",
      "split_v_2": "Split Vert (2)",
      "split_h_2": "Split Horz (2)",
      "split_v_3": "Split Vert (3)",
      "split_h_3": "Split Horz (3)",
      "clear_split": "Clear Split",
      "delete_item": "Delete",
      "select": "Select",
      "move": "Move",
      "global_dims": "Global Dimensions",
      "section_dims": "Selection Dimensions",
      "width": "Width",
      "height": "Height",
      "add_to_list": "Add to List",
      "save_changes": "Save Changes",
      "added": "Added",
      "calculate_invoice": "Calculate Invoice",
      "active_tool_hint": "Active: Tap on canvas to apply"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "fa", // Default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;