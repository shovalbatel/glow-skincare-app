export type Locale = 'en' | 'he';

const en = {
  // App
  'app.name': 'Glow',
  'app.title': 'Glow — Skincare Tracker',
  'app.description': 'Your personal skincare routine tracker',

  // Nav
  'nav.today': 'Today',
  'nav.products': 'Products',
  'nav.log': 'Log',
  'nav.routine': 'Routine',
  'nav.shop': 'Shop',
  'nav.insights': 'Insights',

  // Common
  'common.morning': 'Morning',
  'common.evening': 'Evening',
  'common.both': 'AM & PM',
  'common.am': 'AM',
  'common.pm': 'PM',
  'common.back': 'Back',
  'common.continue': 'Continue',
  'common.skip': 'Skip',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.done': 'Done',
  'common.loading': 'Loading...',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.daily': 'Daily',
  'common.paused': 'Paused',
  'common.tryAgain': 'Try again',
  'common.analyzing': 'Analyzing...',

  // Categories
  'cat.cleanser': 'Cleanser',
  'cat.toner': 'Toner',
  'cat.serum': 'Serum',
  'cat.moisturizer': 'Moisturizer',
  'cat.eye_cream': 'Eye Cream',
  'cat.sunscreen': 'Sunscreen',
  'cat.oil': 'Oil',
  'cat.exfoliant_gentle': 'Gentle Exfoliant',
  'cat.exfoliant_strong': 'Strong Exfoliant',
  'cat.treatment': 'Treatment',
  'cat.mask': 'Mask',
  'cat.night_cream': 'Night Cream',

  // Status
  'status.have': 'Have',
  'status.need_to_buy': 'Need to Buy',
  'status.almost_empty': 'Almost Empty',
  'status.repurchase': 'Repurchase',
  'status.do_not_repurchase': 'Do Not Repurchase',

  // Skin conditions
  'skin.irritation': 'Irritation',
  'skin.dryness': 'Dryness',
  'skin.redness': 'Redness',
  'skin.breakout': 'Breakout',
  'skin.glow': 'Glow',
  'skin.smoothness': 'Smoothness',
  'skin.oily': 'Oily',
  'skin.tight': 'Tight',

  // Login
  'login.subtitle': 'Your personal skincare tracker',
  'login.google': 'Continue with Google',
  'login.sync': 'Sign in to sync your skincare routine across all your devices',

  // Home
  'home.thisWeek': 'This Week',
  'home.days': 'days',
  'home.todaysPlan': "Today's Plan",
  'home.noProducts': 'No products planned',
  'home.logToday': "Log today's routine",
  'home.logSubtitle': 'Track what you used and how your skin feels',
  'home.todaysLog': "Today's Log",
  'home.skinFeeling': 'Skin feeling:',
  'home.editLog': 'Edit log',
  'home.active': 'Active',
  'home.toBuy': 'To Buy',
  'home.logs': 'Logs',

  // Products
  'products.title': 'Products',
  'products.search': 'Search products...',
  'products.allStatus': 'All Status',
  'products.allTimes': 'All Times',
  'products.edit': 'Edit Product',
  'products.new': 'New Product',
  'products.none': 'No products found',

  // Product Form
  'form.name': 'Name',
  'form.namePlaceholder': 'Product name',
  'form.brand': 'Brand',
  'form.category': 'Category',
  'form.when': 'When',
  'form.frequency': 'Frequency',
  'form.frequencyPlaceholder': 'e.g. Daily',
  'form.status': 'Status',
  'form.description': 'What does it do?',
  'form.descriptionPlaceholder': 'Short description',
  'form.notes': 'Notes',
  'form.notesPlaceholder': 'Optional notes',
  'form.activeInRoutine': 'Active in routine?',
  'form.update': 'Update Product',
  'form.add': 'Add Product',

  // Smart Add
  'add.title': 'Add Product',
  'add.scan': 'Scan Product',
  'add.fromLink': 'From Store Link',
  'add.manual': 'Add Manually',
  'add.review': 'Review Details',
  'add.analyzingProduct': 'Analyzing product...',
  'add.scanPhoto': 'Scan a photo',
  'add.scanPhotoSub': 'Take or upload a product photo',
  'add.pasteLink': 'Paste store link',
  'add.pasteLinkSub': 'Auto-fill from any product page',
  'add.manualSub': 'Fill in all details yourself',
  'add.takePhoto': 'Take Photo',
  'add.uploadImage': 'Upload Image',
  'add.photoHint': 'Snap the front of your product — AI will extract name, brand, and details',
  'add.urlLabel': 'Product page URL',
  'add.urlPlaceholder': 'https://store.com/product...',
  'add.urlHint': 'Works with most skincare stores',
  'add.extract': 'Extract Details',
  'add.aiExtracted': 'AI-extracted details — review and adjust before saving',
  'add.camera': 'Camera',
  'add.gallery': 'Gallery',

  // Daily Log
  'log.title': 'Daily Log',
  'log.morningRoutine': 'Morning Routine',
  'log.eveningRoutine': 'Evening Routine',
  'log.markDone': 'Mark done',
  'log.howFeel': 'How does your skin feel?',
  'log.bad': 'Bad',
  'log.great': 'Great',
  'log.conditions': 'Skin conditions today',
  'log.notes': 'Notes',
  'log.notesPlaceholder': 'How was your skin today? Anything unusual?',
  'log.save': 'Save Log',
  'log.saved': 'Saved!',

  // Routine
  'routine.title': 'Routine',
  'routine.dayCycle': '-day cycle',
  'routine.today': 'Today',
  'routine.completed': 'Completed',
  'routine.inProgress': 'In Progress',
  'routine.dayOf': 'Day {n} of {total}',
  'routine.editDay': 'Edit Day {n}',
  'routine.dayName': 'Day Name',
  'routine.morningProducts': 'Morning Products',
  'routine.eveningProducts': 'Evening Products',
  'routine.saveChanges': 'Save Changes',

  // Shopping
  'shop.title': 'Shopping',
  'shop.subtitle': 'Inventory & purchases',
  'shop.toBuy': 'To Buy',
  'shop.almostEmpty': 'Almost Empty',
  'shop.repurchase': 'Repurchase',
  'shop.skipLabel': 'Skip',
  'shop.allItems': 'All Items',
  'shop.showAll': 'Show all',
  'shop.noItems': 'No items in this category',
  'shop.bought': 'Bought',

  // Insights
  'insights.title': 'Insights',
  'insights.basedOn': 'Based on {n} logged days',
  'insights.completion': 'Completion',
  'insights.avgFeeling': 'Avg Feeling',
  'insights.daysLogged': 'Days Logged',
  'insights.skinFeeling14': 'Skin Feeling (Last 14 Days)',
  'insights.conditionsFreq': 'Skin Conditions Frequency',
  'insights.mostUsed': 'Most Used Products',
  'insights.logMore': 'Log more days to see product usage',
  'insights.irritationDays': 'Products on Irritation Days',
  'insights.irritationSub': 'Products used on days with irritation, redness, or breakout',

  // Onboarding - Disclaimer
  'onboard.disclaimer.title': 'Before we begin',
  'onboard.disclaimer.subtitle': 'Please read and accept',
  'onboard.disclaimer.heading': 'AI-Powered Recommendations Disclaimer',
  'onboard.disclaimer.text1': 'Glow uses artificial intelligence to provide skincare product suggestions and skin analysis. These recommendations are for informational purposes only and should not be considered medical advice.',
  'onboard.disclaimer.text2': 'You acknowledge and agree that:',
  'onboard.disclaimer.item1': 'AI recommendations may not be accurate or suitable for your specific skin condition',
  'onboard.disclaimer.item2': 'You should always consult with a qualified dermatologist or healthcare professional before starting any new skincare regimen',
  'onboard.disclaimer.item3': 'You are solely responsible for verifying any product recommendations with a medical professional',
  'onboard.disclaimer.item4': 'Glow and its creators are not liable for any adverse reactions, skin damage, or health issues resulting from following AI-generated recommendations',
  'onboard.disclaimer.checkbox': 'I understand that all AI recommendations are informational only and I will consult a professional before making skincare decisions',
  'onboard.disclaimer.agree': 'I Agree & Continue',

  // Onboarding - Routine Builder
  'onboard.routine.title': 'Build your routine',
  'onboard.routine.subtitle': "We'll walk through each step and add your products",
  'onboard.routine.morningSteps': '{n} steps: cleanser to sunscreen',
  'onboard.routine.eveningSteps': '{n} steps: cleanser to night cream',
  'onboard.routine.start': 'Start Building',
  'onboard.routine.noRoutine': "I don't have a routine yet — skip and get AI recommendations later",
  'onboard.routine.nextStep': 'Next Step',
  'onboard.routine.dontUse': "I don't use this",
  'onboard.routine.addAlt': 'Add alternative product',
  'onboard.routine.step': 'Step {n}/{total}',

  // Onboarding - Step descriptions
  'onboard.step.cleanser.am': 'Wash away overnight buildup',
  'onboard.step.toner.am': 'Balance and prep your skin',
  'onboard.step.serum.am': 'Target specific skin concerns',
  'onboard.step.eye_cream.am': 'Hydrate the delicate eye area',
  'onboard.step.moisturizer.am': 'Lock in hydration',
  'onboard.step.sunscreen.am': 'Protect from UV damage',
  'onboard.step.cleanser.pm': 'Remove makeup and daily grime',
  'onboard.step.toner.pm': 'Prep skin for treatments',
  'onboard.step.exfoliant_gentle.pm': 'Gentle resurfacing (pads, AHA/BHA)',
  'onboard.step.treatment.pm': 'Retinol, niacinamide, or actives',
  'onboard.step.serum.pm': 'Hydrating or repair serum',
  'onboard.step.eye_cream.pm': 'Nourish the under-eye area',
  'onboard.step.oil.pm': 'Deep nourishment overnight',
  'onboard.step.night_cream.pm': 'Rich overnight repair',

  // Onboarding - Specials
  'onboard.specials.title': 'Special treatments',
  'onboard.specials.subtitle': 'Products you use weekly or less often',
  'onboard.specials.hint': 'Peeling masks, chemical exfoliants, face masks, etc.',
  'onboard.specials.add': 'Add a treatment',

  // Onboarding - Extras
  'onboard.extras.title': 'Other products',
  'onboard.extras.subtitle': "Products you own but aren't using right now",
  'onboard.extras.hint': "Backups, products you're testing, or ones you paused",
  'onboard.extras.add': 'Add a product',

  // Onboarding - Summary
  'onboard.summary.title': 'Looking great!',
  'onboard.summary.products': '{n} product(s) added',
  'onboard.summary.specials': 'Special Treatments',
  'onboard.summary.extras': 'Other Products',

  // Onboarding - Photos
  'onboard.photos.title': 'Your skin profile',
  'onboard.photos.subtitle': 'Take 1-5 photos of your face in natural daylight',
  'onboard.photos.hint': 'This helps us recommend products for your skin type',
  'onboard.photos.add': 'Add photo',
  'onboard.photos.addMore': 'Add more',
  'onboard.photos.skipForNow': 'Skip for now',

  // Onboarding - Done
  'onboard.done.title': "You're all set!",
  'onboard.done.withProducts': '{n} product(s) added to your routine',
  'onboard.done.noProducts': 'Your account is ready — add products anytime',
  'onboard.done.start': 'Start Your Routine',

  // Language
  'lang.choose': 'Choose language',
  'lang.en': 'English',
  'lang.he': 'עברית',
};

const he: Record<string, string> = {
  // App
  'app.name': 'Glow',
  'app.title': 'Glow — מעקב טיפוח',
  'app.description': 'מעקב שגרת טיפוח אישית',

  // Nav
  'nav.today': 'היום',
  'nav.products': 'מוצרים',
  'nav.log': 'יומן',
  'nav.routine': 'שגרה',
  'nav.shop': 'קניות',
  'nav.insights': 'תובנות',

  // Common
  'common.morning': 'בוקר',
  'common.evening': 'ערב',
  'common.both': 'בוקר וערב',
  'common.am': 'בוקר',
  'common.pm': 'ערב',
  'common.back': 'חזרה',
  'common.continue': 'המשך',
  'common.skip': 'דלג',
  'common.save': 'שמור',
  'common.cancel': 'ביטול',
  'common.done': 'סיום',
  'common.loading': 'טוען...',
  'common.yes': 'כן',
  'common.no': 'לא',
  'common.daily': 'יומי',
  'common.paused': 'מושהה',
  'common.tryAgain': 'נסה שוב',
  'common.analyzing': 'מנתח...',

  // Categories
  'cat.cleanser': 'ניקוי',
  'cat.toner': 'טונר',
  'cat.serum': 'סרום',
  'cat.moisturizer': 'קרם לחות',
  'cat.eye_cream': 'קרם עיניים',
  'cat.sunscreen': 'הגנה מהשמש',
  'cat.oil': 'שמן',
  'cat.exfoliant_gentle': 'פילינג עדין',
  'cat.exfoliant_strong': 'פילינג חזק',
  'cat.treatment': 'טיפול',
  'cat.mask': 'מסכה',
  'cat.night_cream': 'קרם לילה',

  // Status
  'status.have': 'יש לי',
  'status.need_to_buy': 'צריך לקנות',
  'status.almost_empty': 'כמעט נגמר',
  'status.repurchase': 'לקנות שוב',
  'status.do_not_repurchase': 'לא לקנות שוב',

  // Skin conditions
  'skin.irritation': 'גירוי',
  'skin.dryness': 'יובש',
  'skin.redness': 'אדמומיות',
  'skin.breakout': 'פריחה',
  'skin.glow': 'זוהר',
  'skin.smoothness': 'חלקות',
  'skin.oily': 'שמנוניות',
  'skin.tight': 'מתיחות',

  // Login
  'login.subtitle': 'מעקב שגרת טיפוח אישית',
  'login.google': 'התחברות עם Google',
  'login.sync': 'התחבר/י כדי לסנכרן את שגרת הטיפוח בכל המכשירים',

  // Home
  'home.thisWeek': 'השבוע',
  'home.days': 'ימים',
  'home.todaysPlan': 'התוכנית להיום',
  'home.noProducts': 'אין מוצרים מתוכננים',
  'home.logToday': 'תעד/י את השגרה של היום',
  'home.logSubtitle': 'עקוב/י אחרי מה שהשתמשת ואיך העור מרגיש',
  'home.todaysLog': 'היומן של היום',
  'home.skinFeeling': 'תחושת העור:',
  'home.editLog': 'עריכה',
  'home.active': 'פעילים',
  'home.toBuy': 'לקנות',
  'home.logs': 'יומנים',

  // Products
  'products.title': 'מוצרים',
  'products.search': 'חיפוש מוצרים...',
  'products.allStatus': 'כל הסטטוסים',
  'products.allTimes': 'כל הזמנים',
  'products.edit': 'עריכת מוצר',
  'products.new': 'מוצר חדש',
  'products.none': 'לא נמצאו מוצרים',

  // Product Form
  'form.name': 'שם',
  'form.namePlaceholder': 'שם המוצר',
  'form.brand': 'מותג',
  'form.category': 'קטגוריה',
  'form.when': 'מתי',
  'form.frequency': 'תדירות',
  'form.frequencyPlaceholder': 'למשל: יומי',
  'form.status': 'סטטוס',
  'form.description': 'מה המוצר עושה?',
  'form.descriptionPlaceholder': 'תיאור קצר',
  'form.notes': 'הערות',
  'form.notesPlaceholder': 'הערות נוספות',
  'form.activeInRoutine': 'פעיל בשגרה?',
  'form.update': 'עדכון מוצר',
  'form.add': 'הוספת מוצר',

  // Smart Add
  'add.title': 'הוספת מוצר',
  'add.scan': 'סריקת מוצר',
  'add.fromLink': 'מקישור לחנות',
  'add.manual': 'הוספה ידנית',
  'add.review': 'בדיקת פרטים',
  'add.analyzingProduct': 'מנתח מוצר...',
  'add.scanPhoto': 'סריקת תמונה',
  'add.scanPhotoSub': 'צלם/י או העלה/י תמונת מוצר',
  'add.pasteLink': 'הדבקת קישור',
  'add.pasteLinkSub': 'מילוי אוטומטי מדף מוצר',
  'add.manualSub': 'מלא/י את כל הפרטים',
  'add.takePhoto': 'צלם',
  'add.uploadImage': 'העלאת תמונה',
  'add.photoHint': 'צלם/י את חזית המוצר — הבינה המלאכותית תזהה שם, מותג ופרטים',
  'add.urlLabel': 'קישור לדף המוצר',
  'add.urlPlaceholder': 'https://store.com/product...',
  'add.urlHint': 'עובד עם רוב חנויות הטיפוח',
  'add.extract': 'חילוץ פרטים',
  'add.aiExtracted': 'פרטים שחולצו על ידי AI — בדוק/י ושמור/י',
  'add.camera': 'מצלמה',
  'add.gallery': 'גלריה',

  // Daily Log
  'log.title': 'יומן יומי',
  'log.morningRoutine': 'שגרת בוקר',
  'log.eveningRoutine': 'שגרת ערב',
  'log.markDone': 'סמן כבוצע',
  'log.howFeel': 'איך העור שלך מרגיש?',
  'log.bad': 'רע',
  'log.great': 'מעולה',
  'log.conditions': 'מצב העור היום',
  'log.notes': 'הערות',
  'log.notesPlaceholder': 'איך היה העור היום? משהו חריג?',
  'log.save': 'שמירת יומן',
  'log.saved': 'נשמר!',

  // Routine
  'routine.title': 'שגרה',
  'routine.dayCycle': ' ימים במחזור',
  'routine.today': 'היום',
  'routine.completed': 'הושלם',
  'routine.inProgress': 'בתהליך',
  'routine.dayOf': 'יום {n} מתוך {total}',
  'routine.editDay': 'עריכת יום {n}',
  'routine.dayName': 'שם היום',
  'routine.morningProducts': 'מוצרי בוקר',
  'routine.eveningProducts': 'מוצרי ערב',
  'routine.saveChanges': 'שמירת שינויים',

  // Shopping
  'shop.title': 'קניות',
  'shop.subtitle': 'מלאי ורכישות',
  'shop.toBuy': 'לקנות',
  'shop.almostEmpty': 'כמעט נגמר',
  'shop.repurchase': 'לקנות שוב',
  'shop.skipLabel': 'לדלג',
  'shop.allItems': 'כל הפריטים',
  'shop.showAll': 'הצג הכל',
  'shop.noItems': 'אין פריטים בקטגוריה זו',
  'shop.bought': 'נקנה',

  // Insights
  'insights.title': 'תובנות',
  'insights.basedOn': 'מבוסס על {n} ימים מתועדים',
  'insights.completion': 'השלמה',
  'insights.avgFeeling': 'תחושה ממוצעת',
  'insights.daysLogged': 'ימים מתועדים',
  'insights.skinFeeling14': 'תחושת העור (14 ימים אחרונים)',
  'insights.conditionsFreq': 'תדירות מצבי עור',
  'insights.mostUsed': 'מוצרים בשימוש תכוף',
  'insights.logMore': 'תעד/י עוד ימים כדי לראות שימוש במוצרים',
  'insights.irritationDays': 'מוצרים בימי גירוי',
  'insights.irritationSub': 'מוצרים שהשתמשת בהם בימים עם גירוי, אדמומיות או פריחה',

  // Onboarding - Disclaimer
  'onboard.disclaimer.title': 'לפני שמתחילים',
  'onboard.disclaimer.subtitle': 'נא לקרוא ולאשר',
  'onboard.disclaimer.heading': 'הצהרת אחריות על המלצות AI',
  'onboard.disclaimer.text1': 'Glow משתמש בבינה מלאכותית כדי לספק הצעות למוצרי טיפוח וניתוח עור. המלצות אלו הן למטרות מידע בלבד ואינן מהוות ייעוץ רפואי.',
  'onboard.disclaimer.text2': 'את/ה מאשר/ת ומסכים/ה כי:',
  'onboard.disclaimer.item1': 'המלצות AI עשויות שלא להתאים למצב העור הספציפי שלך',
  'onboard.disclaimer.item2': 'יש להתייעץ תמיד עם רופא עור מוסמך לפני התחלת שגרת טיפוח חדשה',
  'onboard.disclaimer.item3': 'האחריות לאימות כל המלצת מוצר היא שלך בלבד',
  'onboard.disclaimer.item4': 'Glow ויוצריו אינם אחראים לתגובות שליליות, נזק לעור או בעיות בריאותיות',
  'onboard.disclaimer.checkbox': 'אני מבין/ה שכל המלצות ה-AI הן למידע בלבד ואתייעץ עם איש מקצוע לפני קבלת החלטות טיפוח',
  'onboard.disclaimer.agree': 'מסכים/ה והמשך',

  // Onboarding - Routine Builder
  'onboard.routine.title': 'בניית השגרה שלך',
  'onboard.routine.subtitle': 'נעבור יחד על כל שלב ונוסיף את המוצרים שלך',
  'onboard.routine.morningSteps': '{n} שלבים: מניקוי ועד הגנה מהשמש',
  'onboard.routine.eveningSteps': '{n} שלבים: מניקוי ועד קרם לילה',
  'onboard.routine.start': 'בואו נתחיל',
  'onboard.routine.noRoutine': 'אין לי שגרה עדיין — דלג/י וקבל/י המלצות AI בהמשך',
  'onboard.routine.nextStep': 'שלב הבא',
  'onboard.routine.dontUse': 'לא משתמש/ת בזה',
  'onboard.routine.addAlt': 'הוספת מוצר חלופי',
  'onboard.routine.step': 'שלב {n}/{total}',

  // Onboarding - Step descriptions
  'onboard.step.cleanser.am': 'ניקוי שאריות הלילה',
  'onboard.step.toner.am': 'איזון והכנת העור',
  'onboard.step.serum.am': 'טיפול בבעיות עור ספציפיות',
  'onboard.step.eye_cream.am': 'לחות לאזור העיניים',
  'onboard.step.moisturizer.am': 'נעילת לחות',
  'onboard.step.sunscreen.am': 'הגנה מנזקי UV',
  'onboard.step.cleanser.pm': 'הסרת איפור ולכלוך',
  'onboard.step.toner.pm': 'הכנת העור לטיפולים',
  'onboard.step.exfoliant_gentle.pm': 'פילינג עדין (פדים, AHA/BHA)',
  'onboard.step.treatment.pm': 'רטינול, ניאצינמיד או חומרים פעילים',
  'onboard.step.serum.pm': 'סרום לחות או שיקום',
  'onboard.step.eye_cream.pm': 'הזנת אזור מתחת לעיניים',
  'onboard.step.oil.pm': 'הזנה עמוקה ללילה',
  'onboard.step.night_cream.pm': 'שיקום לילי עשיר',

  // Onboarding - Specials
  'onboard.specials.title': 'טיפולים מיוחדים',
  'onboard.specials.subtitle': 'מוצרים שמשתמשים בהם פעם בשבוע או פחות',
  'onboard.specials.hint': 'מסכות פילינג, פילינגים כימיים, מסכות פנים וכו\'',
  'onboard.specials.add': 'הוספת טיפול',

  // Onboarding - Extras
  'onboard.extras.title': 'מוצרים נוספים',
  'onboard.extras.subtitle': 'מוצרים שיש לך אבל לא בשימוש כרגע',
  'onboard.extras.hint': 'מוצרי גיבוי, מוצרים בבדיקה, או כאלה שהושהו',
  'onboard.extras.add': 'הוספת מוצר',

  // Onboarding - Summary
  'onboard.summary.title': 'נראה מעולה!',
  'onboard.summary.products': '{n} מוצרים נוספו',
  'onboard.summary.specials': 'טיפולים מיוחדים',
  'onboard.summary.extras': 'מוצרים נוספים',

  // Onboarding - Photos
  'onboard.photos.title': 'פרופיל העור שלך',
  'onboard.photos.subtitle': 'צלם/י 1-5 תמונות של הפנים באור טבעי',
  'onboard.photos.hint': 'זה עוזר לנו להמליץ על מוצרים לסוג העור שלך',
  'onboard.photos.add': 'הוספת תמונה',
  'onboard.photos.addMore': 'עוד תמונה',
  'onboard.photos.skipForNow': 'דלג/י כרגע',

  // Onboarding - Done
  'onboard.done.title': 'הכל מוכן!',
  'onboard.done.withProducts': '{n} מוצרים נוספו לשגרה שלך',
  'onboard.done.noProducts': 'החשבון שלך מוכן — הוסף/י מוצרים בכל עת',
  'onboard.done.start': 'בואו נתחיל!',

  // Language
  'lang.choose': 'בחר/י שפה',
  'lang.en': 'English',
  'lang.he': 'עברית',
};

export const translations: Record<Locale, Record<string, string>> = { en, he };

export function getTranslation(locale: Locale, key: string, params?: Record<string, string | number>): string {
  let text = translations[locale]?.[key] || translations.en[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
}
